#!/usr/bin/env node

const { detectEC2 } = require('../src/detect');

const args = process.argv.slice(2);

// Parse CLI arguments
const options = {
  json: args.includes('--json') || args.includes('-j'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
  timeout: 1000,
};

// Parse --timeout value
const timeoutIdx = args.findIndex((a) => a === '--timeout' || a === '-t');
if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
  const t = parseInt(args[timeoutIdx + 1], 10);
  if (!Number.isNaN(t) && t > 0) {
    options.timeout = t;
  }
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
  -h, --help       Show this help message

Exit codes:
  0  Running on EC2
  1  Not running on EC2

Examples:
  npx detect-ec2
  npx detect-ec2 --json
  npx detect-ec2 --verbose --json
  npx detect-ec2 --timeout 2000
`);
  process.exit(0);
}

async function main() {
  try {
    const result = await detectEC2({
      timeout: options.timeout,
      verbose: options.verbose,
    });

    if (options.json) {
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
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();
