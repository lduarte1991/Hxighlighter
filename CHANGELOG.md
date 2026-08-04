# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.3] - 2026-08-04

### Fixed

- Add missing `terser-webpack-plugin` devDependency that caused the v1.10.2 release build to fail

## [1.10.2] - 2026-07-30

### Fixed

- [HX-507] Refactored `h-range.js` to simplify range-handling logic and fix related bugs
- [HX-503] Additional bug fixes in `h-range.js` identified via code review
- WAF 403 on dist uploads: replaced `data:` URI download anchors in `hx-lite-version-changes.js` and `hx-export-print.js` with `Blob` + `URL.createObjectURL`
- WAF 403 on dist uploads: disabled CSS minification (`CssMinimizerPlugin` removed) and added Terser `max_line_len` cap to keep built files below WAF scoring threshold

### Changed

- Updated inline documentation and JSDoc comments throughout `h-range.js`

### Tests

- Added unit tests for `h-range.js` (HX-507)
- Enhanced `TempJSON.js` unit test coverage

### Dependencies

- Bump webpack 5.107.2 → 5.108.4
- Bump webpack-cli 7.0.3 → 7.2.1
- Bump eslint 10.5.0 → 10.6.0
- Bump globals 17.6.0 → 17.7.0
- Bump video.js 8.23.8 → 8.23.9
- Bump npm-check-updates 22.2.3 → 22.2.9

## [1.10.1] - 2026-06-27

Baseline release. See git history for details.
