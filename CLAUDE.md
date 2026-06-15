# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **pnpm** (v10.23.0) and requires **Node.js >=24**. Do not use npm or yarn.

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm run lint         # ESLint on src/ and tests/
pnpm run lint:fix     # Auto-fix lint issues
pnpm run test:unit    # Unit tests with c8 coverage (no server required)
pnpm run test         # Full test suite (starts http-server on :9000, runs mocha, stops server)
pnpm run build        # Webpack production build → dist/
pnpm run start        # Serve dist/ via http-server
```

To run a single test file:
```bash
pnpm exec mocha --require @babel/register --require tests/setup.js tests/unit/hxelper-functions.test.js
```

## Architecture Overview

Hxighlighter is a JavaScript annotation tool suite that compiles to **four independent bundles** from a single codebase:

| Bundle | Entry | Output | Use case |
|--------|-------|--------|----------|
| Text (full) | `src/text-index.js` | `hxighlighter_text.js` | Full text annotation |
| Text (lite) | `src/author-index.js` | `hxighlighter_text_lite.js` | Read-only / author mode |
| Image | `src/image-index-m2.js` | `hxighlighter_image_m2.js` | Mirador 2 image viewer |
| Video | `src/video-index-vjs.js` | `hxighlighter_video_vjs.js` | video.js player |

### Core Layer (`src/js/core/`)

- **core.js** — `$.Core` class: top-level orchestrator that wires together targets, viewers, plugins, and storage.
- **hxighlighter.js** — `$.Hxighlighter` class: main annotation handler per target element.
- **h-range.js** — Custom range/selection library with fallback protocols for robust cross-browser range handling.
- **hxelper-functions.js** — Shared utility functions used throughout.
- **launcher.js** — Initialization entry point.

### Media Handlers (`src/js/media/`)

Separate subdirectories for `text/`, `videojs/`, and `mirador/` encapsulate media-specific selection and rendering logic.

### Component Types

| Directory | Responsibility |
|-----------|---------------|
| `src/js/selectors/` | Mouse, keyboard, and time-range selection |
| `src/js/drawers/` | XPath-based and time-range annotation rendering |
| `src/js/viewers/` | Sidebar, floating viewer, tabs UI |
| `src/js/storage/` | `catchpy.js` (live backend), `TempJSON.js` (lite/offline) |
| `src/js/plugins/` | Optional feature modules (20+) |
| `src/js/vendors/` | Vendored third-party code — do not modify |

### Event System

Components communicate via jQuery Tiny PubSub (not DOM events):
```js
$.publishEvent('eventName', data);
$.subscribeEvent('eventName', handler);
$.unsubscribeEvent('eventName', handler);
```

### Plugin System

Optional features are packaged as plugins. Use `src/js/plugins/hx-plugin-template.js` as a starting point for new plugins. Plugins are registered with `$.Core` and loaded conditionally per entry point.

### Lite Mode

The `author-index.js` entry point builds a reduced bundle that uses `TempJSON.js` storage and omits most plugins. This is the read-only / author mode variant.

## Build System

Webpack (see `webpack.config.js`) handles:
- 4 entry points → 4 JS bundles + 4 CSS bundles in `dist/`
- jQuery, toastr, videojs provided globally via `ProvidePlugin`
- CSS extracted by `MiniCssExtractPlugin`
- Fonts and images inlined as base64
- Babel transpilation targeting `> 0.5%, last 2 versions, not dead`
- Underscore templates (`.html`) and Handlebars (`.handlebars`) loaded as modules

## ESLint Config

Uses ESLint 10 flat config (`eslint.config.mjs`). Key rules:
- 2-space indent, always semicolons
- `no-eval` and `no-implied-eval` are errors
- `eqeqeq` is a warning (smart mode)
- Globals: `jQuery`, `Hxighlighter`, `toastr`, `Mirador`, `i18next`, `_`
- `src/js/vendors/` is excluded from linting

## Testing

- **Unit tests**: `tests/unit/` — mocha + chai + jsdom (no browser required)
- **Acceptance tests**: `tests/acceptance/` — require the http-server on port 9000 (use `pnpm test`)
- **Coverage**: c8; reports generated to `coverage/`
- **Setup**: `tests/setup.js` configures JSDOM, jQuery globals, and window/document/navigator

## CI

GitHub Actions:
- **ci.yml**: Runs `lint` + `test:unit` on PRs and pushes to main
- **release.yml**: Triggered by `v*` tags; builds bundles and publishes a GitHub release with zipped dist artifacts
