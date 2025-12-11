# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-11

### Added
- Initial release
- EC2 detection via IMDS with support for both IMDSv1 and IMDSv2
- CLI tool with `--json`, `--verbose`, and `--timeout` options
- Programmatic API exports: `detectEC2`, `tryIMDSv1`, `tryIMDSv2`, `getMetadata`
- Configurable timeout (default 1000ms)
- Zero production dependencies
