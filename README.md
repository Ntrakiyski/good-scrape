# webpull-cli

Pull any public docs site into local markdown files.

```
$ webpull-cli https://docs.example.com

  ⚡ webpull · 16 workers
  docs.example.com → ./docs.example.com

  ●●●·●●●●·●●●●●●●·
  ├─ ✓ getting-started/installation.md
  ├─ ✓ api/authentication.md
  ├─ ✓ guides/deployment.md
  █████████████░░░░░░░ 68% 102/150 · 6p/s · 17.2s
```

## Install

```bash
npm install -g webpull-cli
# or
bun install -g webpull-cli
```

## Usage

```
webpull-cli <url> [options]

Options:
  -o, --out <dir>    Output directory (default: ./<hostname>)
  -m, --max <n>      Max pages to pull (default: 500)
  -f, --format <fmt> Print to terminal: json or md (writes file if >50k chars)
```

## Examples

```bash
# Pull docs
webpull-cli https://react.dev

# Custom output dir, limit to 100 pages
webpull-cli https://docs.python.org -o ./python-docs -m 100

# Print to terminal as JSON (writes file if >50k chars)
webpull-cli https://example.com/docs -f json

# Print to terminal as markdown
webpull-cli https://example.com/docs -f md
```

## Output formats

### Files (default)

Writes `.md` files preserving the URL path structure with YAML frontmatter:

```yaml
---
title: "Getting Started"
url: "https://docs.example.com/getting-started"
---
```

### JSON (`-f json`)

Prints one JSON object per line (NDJSON) to stdout:

```json
{"title":"Page Title","url":"https://example.com/page","content":"## Markdown body...","media":[{"url":"https://example.com/image.png","alt":"Screenshot","type":"image"}]}
```

Fields:
- `title` — page title
- `url` — resolved page URL
- `content` — markdown body (no frontmatter)
- `media` — array of page assets (images, videos) with `url`, `alt`, `type`

### Markdown (`-f md`)

Prints raw markdown with frontmatter to stdout, pages separated by `---`.

### Size limit

If a page exceeds 50,000 characters, it is written to a file instead of the terminal, and the file path is printed on stderr.

## How it works

### Page discovery

Strategies run in order until pages are found:

1. **Sitemap** — fetches `robots.txt` → sitemap index → sitemap XMLs (recursive, max depth 3)
2. **Navigation extraction** — parses `<nav>`, `<aside>`, sidebar, TOC, and menu link elements
3. **JS bundle route scanning** — for SPAs, fetches JS bundles and extracts routes via regex (`path:`, `to=`, `href=` patterns for React Router, Vue Router, etc.)
4. **Headless browser render** — launches Chromium, extracts links from the rendered DOM
5. **Link crawling** — BFS crawling within the same hostname/scope, 20 concurrent requests

### Fetching & conversion

- **Bun Workers** — each page is fetched in a pool of `max(8, CPU×2)` parallel worker threads
- **Defuddle** — HTML-to-markdown conversion with 5s timeout; falls back to `linkedom` text extraction
- **User agent rotation** — 8 UAs rotated per request to avoid blocking
- **Media extraction** — images, videos, and CSS `url()` references are collected into the `media` output

### SPA handling

1. Detects SPA shells by checking `<div id="root">` / `<div id="__next">` with `< 200` chars of body text
2. When detected, concurrency is capped at 4 workers to avoid Chromium overload
3. Hash-routed URLs (`#/page/foo`) are preserved as-is and rendered via headless Chromium
4. Playwright renders pages with `waitUntil: "networkidle"` + content selector wait

### Architecture

- **Runtime**: Bun (TypeScript, no build step)
- **Concurrency**: Effect-TS for structured concurrency (`Effect.gen`, `Effect.tryPromise`)
- **Workers**: `src/pool.ts` manages a pool of Bun `Worker` threads from `src/worker.ts`
- **Browser**: `src/renderer.ts` — lazy-launched Chromium instance shared across workers
- **Path safety**: `src/write.ts` validates output paths against directory traversal via `relative()` check

## Requirements

- [Bun](https://bun.sh) runtime
- [Playwright](https://playwright.dev) Chromium (auto-used for SPAs; install with `npx playwright install chromium`)

## License

MIT

---

Source: [github.com/Ntrakiyski/webpull-cli](https://github.com/Ntrakiyski/webpull-cli)
