# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.11.0] - 2026-09-11

### Added

- `lite-overrides.css`: large LMS specificity-override section using the double-class trick (`.hxighlighter-container.hxighlighter-container`) to beat edX HtmlBlock's `(0,2,x)` selectors — covers `*`, `p`, headings, lists, links, `code/pre`, tables, and buttons
- `lite-overrides.css`: broad `background-image: none` reset for all button types to neutralize LMS global gradient rule; explicit hover overrides for `button:hover:not(:disabled)`, `.sidebar-button`, `.reply-menu button`, nav-bar cancel buttons, and `.hx-confirm-button`
- `lite-overrides.css`: scoped `.btn` and `.btn-secondary` overrides to prevent Bootstrap 4 from overwriting tool button styles
- `lite-overrides.css`: `.annotation-slot { overflow-x: auto }` to prevent wide annotatable content (tables, code blocks, images) from overflowing the host page
- `lite-overrides.css`: `.hx-studio-message` visibility rules — hidden by default and in `.xblock-student_view`, shown via `!important` in `.xblock-author_view` and `.xblock-studio_view`
- `hx-lite-version-changes.js`: removes `#print-annotations` (full-bundle print dialog button) on init in lite mode; `#hx-print-annotations` (JSON download) only appended in `authoring_mode`

### Changed

- `annotationSection-sidebar.html`, `annotationSection-multi-sidebar.html`: converted `<a role="button">` sidebar nav buttons to semantic `<button>` elements
- `keyboard-selector.js`, `videoVJStargetcontroller.js`, `imageM2targetcontroller.js`: updated click delegate selector from `a[class*="keyboard-toggle"]` to `[class*="keyboard-toggle"]` to match converted button elements
- `launcher.js`: `folksonomy` set to `true` in lite mode `DropdownTags` config, enabling free-form tag entry via jquery-tokeninput (`allowFreeTagging: true`)
- `floatingviewer.js`: `editorScrollOffset` and `viewerScrollOffset` set to `0` when a container element is present — eliminates double-subtraction of `scrollTop` that displaced popups above the visible area in embedded mode

### Changed (dependencies)

- Bumped `jsdom` from `^29.1.1` to `^30.0.1` (test environment only)
- Bumped `npm-check-updates` from `^22.2.9` to `^23.1.0`
- Bumped `eslint` from `^10.7.0` to `^10.9.1`
- Bumped `globals` from `^17.7.0` to `^17.11.0`
- Bumped `webpack` from `^5.108.4` to `^5.110.3`

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
