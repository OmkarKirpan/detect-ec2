const http = require('node:http');

const METADATA_IP = '169.254.169.254';

/**
 * Make an HTTP request with timeout
 * @param {Object} options - HTTP request options
 * @param {number} timeout - Timeout in milliseconds
 * @param {Object} [headers] - Additional headers
 * @param {string} [method] - HTTP method (GET/PUT)
 * @returns {Promise<{status: number, body: string}>}
 */
function makeRequest(options, timeout, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: METADATA_IP,
        port: 80,
        ...options,
        method,
        headers,
        timeout,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Try IMDSv1 (simple GET request)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
async function tryIMDSv1(timeout) {
  try {
    const { status } = await makeRequest(
      { path: '/latest/meta-data/' },
      timeout,
    );
    return status === 200;
  } catch {
    return false;
  }
}

/**
 * Try IMDSv2 (requires token)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
async function tryIMDSv2(timeout) {
  try {
    // Get token first
    const tokenRes = await makeRequest(
      { path: '/latest/api/token' },
      timeout,
      { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
      'PUT',
    );

    if (tokenRes.status !== 200 || !tokenRes.body) {
      return false;
    }

    // Use token to access metadata
    const { status } = await makeRequest(
      { path: '/latest/meta-data/' },
      timeout,
      { 'X-aws-ec2-metadata-token': tokenRes.body },
    );

    return status === 200;
  } catch {
    return false;
  }
}

/**
 * Get EC2 instance metadata
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object|null>}
 */
async function getMetadata(timeout) {
  try {
    // Try to get token first (IMDSv2)
    let token = null;
    try {
      const tokenRes = await makeRequest(
        { path: '/latest/api/token' },
        timeout,
        { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
        'PUT',
      );
      if (tokenRes.status === 200) {
        token = tokenRes.body;
      }
    } catch {
      // IMDSv2 not available, try without token
    }

    const headers = token ? { 'X-aws-ec2-metadata-token': token } : {};

    // Fetch common metadata fields
    const fields = [
      'instance-id',
      'instance-type',
      'ami-id',
      'local-ipv4',
      'public-ipv4',
    ];
    const metadata = {};

    for (const field of fields) {
      try {
        const { status, body } = await makeRequest(
          { path: `/latest/meta-data/${field}` },
          timeout,
          headers,
        );
        if (status === 200) {
          metadata[field] = body;
        }
      } catch {
        // Field not available
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch {
    return null;
  }
}

/**
 * Detect if running on EC2
 * @param {Object} options - Detection options
 * @param {number} [options.timeout=1000] - Timeout in milliseconds
 * @param {boolean} [options.verbose=false] - Include metadata details
 * @returns {Promise<{isEC2: boolean, imdsVersion?: string, metadata?: Object}>}
 */
async function detectEC2(options = {}) {
  const timeout = options.timeout || 1000;
  const verbose = options.verbose || false;

  // Try IMDSv2 first (more secure)
  if (await tryIMDSv2(timeout)) {
    const result = { isEC2: true, imdsVersion: 'v2' };
    if (verbose) {
      result.metadata = await getMetadata(timeout);
    }
    return result;
  }

  // Fall back to IMDSv1
  if (await tryIMDSv1(timeout)) {
    const result = { isEC2: true, imdsVersion: 'v1' };
    if (verbose) {
      result.metadata = await getMetadata(timeout);
    }
    return result;
  }

  return { isEC2: false };
}

module.exports = { detectEC2, tryIMDSv1, tryIMDSv2, getMetadata };
