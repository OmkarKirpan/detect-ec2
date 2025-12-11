# detect-ec2

Detect if your code is running on AWS EC2 via Instance Metadata Service (IMDS).

Supports both IMDSv1 and IMDSv2.

## Usage

### CLI (via npx)

```bash
npx detect-ec2
```

**Options:**

| Flag | Description |
|------|-------------|
| `-j, --json` | Output result as JSON |
| `-v, --verbose` | Include instance metadata |
| `-t, --timeout <ms>` | Set timeout (default: 1000ms) |
| `-e, --set-env` | Output shell export commands |
| `-p, --prefix <str>` | Set env var prefix (default: EC2_) |
| `-h, --help` | Show help |

**Exit codes:**
- `0` - Running on EC2
- `1` - Not running on EC2

**Examples:**

```bash
# Simple check
npx detect-ec2

# JSON output for scripting
npx detect-ec2 --json

# With instance details
npx detect-ec2 --verbose

# Custom timeout
npx detect-ec2 --timeout 2000

# Set environment variables in shell
eval $(npx detect-ec2 --set-env)
echo $EC2_IS_EC2

# Custom prefix
eval $(npx detect-ec2 --set-env --prefix AWS_)
echo $AWS_IS_EC2
```

### Programmatic Usage

```bash
npm install detect-ec2
```

```javascript
const { detectEC2 } = require('detect-ec2');

async function main() {
  const result = await detectEC2();

  if (result.isEC2) {
    console.log(`Running on EC2 (${result.imdsVersion})`);
  } else {
    console.log('Not running on EC2');
  }
}

// With options
const result = await detectEC2({
  timeout: 2000,  // Custom timeout in ms
  verbose: true   // Include metadata
});

// result.metadata contains:
// - instance-id
// - instance-type
// - ami-id
// - local-ipv4
// - public-ipv4
```

### Auto-Set Environment Variables

Use `setEnv()` to automatically populate `process.env` with EC2 detection results:

```javascript
const { setEnv } = require('detect-ec2');

// Basic usage - sets EC2_IS_EC2, EC2_INSTANCE_ID, etc.
await setEnv();
console.log(process.env.EC2_IS_EC2);        // "true" or "false"
console.log(process.env.EC2_INSTANCE_ID);   // "i-1234567890abcdef0"

// Custom prefix
await setEnv({ prefix: 'AWS_' });
console.log(process.env.AWS_IS_EC2);

// Custom env var names
await setEnv({
  envNames: {
    isEC2: 'MY_APP_ON_EC2',
    instanceId: 'MY_APP_INSTANCE',
  }
});

// Without metadata (faster)
await setEnv({ includeMetadata: false });
```

**Environment variables set:**

| Variable | Description |
|----------|-------------|
| `EC2_IS_EC2` | `"true"` or `"false"` |
| `EC2_IMDS_VERSION` | `"v1"` or `"v2"` (only if EC2) |
| `EC2_INSTANCE_ID` | Instance ID (only if EC2) |
| `EC2_INSTANCE_TYPE` | Instance type (only if EC2) |
| `EC2_AMI_ID` | AMI ID (only if EC2) |
| `EC2_LOCAL_IPV4` | Private IP (only if EC2) |
| `EC2_PUBLIC_IPV4` | Public IP (only if EC2) |

## Use Cases

### CI/CD Pipelines

**GitHub Actions:**
```yaml
- name: Check if running on EC2
  run: |
    if npx detect-ec2; then
      echo "Running on EC2 self-hosted runner"
    else
      echo "Running on GitHub-hosted runner"
    fi
```

**GitLab CI:**
```yaml
detect_environment:
  script:
    - eval $(npx detect-ec2 --set-env)
    - echo "EC2: $EC2_IS_EC2"
```

### Application Startup

```javascript
const { setEnv } = require('detect-ec2');

async function bootstrap() {
  await setEnv();

  if (process.env.EC2_IS_EC2 === 'true') {
    // Use EC2-specific configuration
    console.log(`Running on ${process.env.EC2_INSTANCE_TYPE}`);
  } else {
    // Use local/fallback configuration
  }
}
```

### Conditional Configuration

```javascript
const { detectEC2 } = require('detect-ec2');

async function getConfig() {
  const { isEC2, metadata } = await detectEC2({ verbose: true });

  return {
    logDriver: isEC2 ? 'cloudwatch' : 'console',
    metricsEndpoint: isEC2 ? 'cloudwatch' : 'local',
    instanceId: metadata?.['instance-id'] || 'local',
  };
}
```

### Shell Scripts

```bash
#!/bin/bash
eval $(npx detect-ec2 --set-env)

if [ "$EC2_IS_EC2" = "true" ]; then
  echo "Deploying to EC2 instance: $EC2_INSTANCE_ID"
  # EC2-specific deployment
else
  echo "Local environment detected"
  # Local deployment
fi
```

### Docker/ECS Detection

```javascript
const { detectEC2 } = require('detect-ec2');
const fs = require('fs');

async function getRuntime() {
  const { isEC2 } = await detectEC2();
  const isDocker = fs.existsSync('/.dockerenv');

  if (isEC2 && isDocker) return 'ecs';  // or EKS
  if (isEC2) return 'ec2';
  if (isDocker) return 'docker-local';
  return 'local';
}
```

## How It Works

The package queries the EC2 Instance Metadata Service at `http://169.254.169.254`. This IP address is only accessible from within EC2 instances.

1. First tries IMDSv2 (token-based, more secure)
2. Falls back to IMDSv1 if v2 is unavailable
3. Uses a 1-second timeout to quickly fail on non-EC2 environments

## API

### `detectEC2(options?)`

**Options:**
- `timeout` (number): Request timeout in milliseconds. Default: `1000`
- `verbose` (boolean): Fetch additional metadata. Default: `false`

**Returns:** `Promise<DetectionResult>`

```typescript
interface DetectionResult {
  isEC2: boolean;
  imdsVersion?: 'v1' | 'v2';
  metadata?: {
    'instance-id'?: string;
    'instance-type'?: string;
    'ami-id'?: string;
    'local-ipv4'?: string;
    'public-ipv4'?: string;
  };
}
```

### `setEnv(options?)`

Detects EC2 and sets environment variables in `process.env`.

**Options:**
- `timeout` (number): Request timeout in milliseconds. Default: `1000`
- `prefix` (string): Prefix for env var names. Default: `'EC2_'`
- `envNames` (object): Override specific env var names
- `includeMetadata` (boolean): Include metadata fields. Default: `true`

**Returns:** `Promise<DetectionResult>` (same as `detectEC2`)

## License

MIT
