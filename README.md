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

## License

MIT
