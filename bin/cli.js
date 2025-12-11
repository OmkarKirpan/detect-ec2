#!/usr/bin/env node

const { detectEC2 } = require('../src/detect');

const args = process.argv.slice(2);

// Parse CLI arguments
const options = {
  json: args.includes('--json') || args.includes('-j'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
  setEnv: args.includes('--set-env') || args.includes('-e'),
  timeout: 1000,
  prefix: 'EC2_',
};

// Parse --timeout value
const timeoutIdx = args.findIndex((a) => a === '--timeout' || a === '-t');
if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
  const t = parseInt(args[timeoutIdx + 1], 10);
  if (!Number.isNaN(t) && t > 0) {
    options.timeout = t;
  }
}

// Parse --prefix value
const prefixIdx = args.findIndex((a) => a === '--prefix' || a === '-p');
if (prefixIdx !== -1 && args[prefixIdx + 1]) {
  options.prefix = args[prefixIdx + 1];
}

if (options.help) {
  console.log(`
detect-ec2 - Detect if running on AWS EC2

Usage:
  npx detect-ec2 [options]

Options:
  -j, --json       Output result as JSON
  -v, --verbose    Include instance metadata in output
  -t, --timeout    Set timeout in ms (default: 1000)
  -e, --set-env    Output shell export commands for env vars
  -p, --prefix     Set env var prefix (default: EC2_)
  -h, --help       Show this help message

Exit codes:
  0  Running on EC2
  1  Not running on EC2

Examples:
  npx detect-ec2
  npx detect-ec2 --json
  npx detect-ec2 --verbose --json
  npx detect-ec2 --timeout 2000
  npx detect-ec2 --set-env
  npx detect-ec2 --set-env --prefix AWS_
  eval $(npx detect-ec2 --set-env)
`);
  process.exit(0);
}

/**
 * Generate shell export commands for env vars
 */
function generateExports(result, prefix) {
  const exports = [];
  const names = {
    isEC2: `${prefix}IS_EC2`,
    imdsVersion: `${prefix}IMDS_VERSION`,
    instanceId: `${prefix}INSTANCE_ID`,
    instanceType: `${prefix}INSTANCE_TYPE`,
    amiId: `${prefix}AMI_ID`,
    localIpv4: `${prefix}LOCAL_IPV4`,
    publicIpv4: `${prefix}PUBLIC_IPV4`,
  };

  exports.push(`export ${names.isEC2}="${result.isEC2 ? 'true' : 'false'}"`);

  if (result.isEC2) {
    exports.push(`export ${names.imdsVersion}="${result.imdsVersion}"`);

    if (result.metadata) {
      if (result.metadata['instance-id']) {
        exports.push(
          `export ${names.instanceId}="${result.metadata['instance-id']}"`,
        );
      }
      if (result.metadata['instance-type']) {
        exports.push(
          `export ${names.instanceType}="${result.metadata['instance-type']}"`,
        );
      }
      if (result.metadata['ami-id']) {
        exports.push(`export ${names.amiId}="${result.metadata['ami-id']}"`);
      }
      if (result.metadata['local-ipv4']) {
        exports.push(
          `export ${names.localIpv4}="${result.metadata['local-ipv4']}"`,
        );
      }
      if (result.metadata['public-ipv4']) {
        exports.push(
          `export ${names.publicIpv4}="${result.metadata['public-ipv4']}"`,
        );
      }
    }
  }

  return exports.join('\n');
}

async function main() {
  try {
    // When using --set-env, always fetch metadata (verbose mode)
    const result = await detectEC2({
      timeout: options.timeout,
      verbose: options.verbose || options.setEnv,
    });

    if (options.setEnv) {
      console.log(generateExports(result, options.prefix));
    } else if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.isEC2) {
        console.log(`EC2 (IMDS ${result.imdsVersion})`);
        if (options.verbose && result.metadata) {
          Object.entries(result.metadata).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
      } else {
        console.log('Not EC2');
      }
    }

    process.exit(result.isEC2 ? 0 : 1);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ isEC2: false, error: err.message }));
    } else if (options.setEnv) {
      // For --set-env, still output the IS_EC2=false so scripts work
      console.log(`export ${options.prefix}IS_EC2="false"`);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();
