# webpull-cli

Pull any public docs site into local markdown files.

```
$ webpull-cli https://docs.example.com

  ⚡ webpull · 24 engine
  https://docs.example.com/ → ./docs.example.com

  ● processing...
  ├─ ✓ getting-started/installation.md
  ├─ ✓ api/authentication.md
  ├─ ✓ guides/deployment.md
  ✓ █████████████░░░░░░░ 68% 102/150 · 6p/s · 17.2s
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
  -o, --out <dir>       Output directory (default: ./<hostname>)
  -m, --max <n>         Max pages to pull (default: 500)
  -f, --format <fmt>    Print to terminal: json or md (writes file if >50k chars)
  -p, --proxy <url>     Proxy URL (repeat for rotation; e.g. -p http://user:pass@host:8080)
  --respect-robots      Respect robots.txt rules (allow/disallow, crawl-delay)
  --cache <dir>         Disk cache directory (reuse fetched pages across runs for faster iteration)
```

## Examples

```bash
# Pull docs (default: 500 pages)
webpull-cli https://react.dev

# Custom output dir, limit to 100 pages
webpull-cli https://docs.python.org -o ./python-docs -m 100

# Print to terminal as JSON (writes file if >50k chars)
webpull-cli https://example.com/docs -f json

# Print to terminal as markdown
webpull-cli https://example.com/docs -f md

# Respect robots.txt and route through a proxy
webpull-cli https://docs.example.com --respect-robots -p http://localhost:8080

# Rotate through 3 proxies (round-robin per request)
webpull-cli https://docs.example.com \
  -p http://proxy1:8080 \
  -p http://proxy2:8080 \
  -p http://proxy3:8080

# Dev cache: fast iteration when developing callbacks
webpull-cli https://docs.example.com --cache .webpull-cache
```

## Output formats

### Files (default)

Writes `.md` files preserving the URL path structure with YAML frontmatter:

```yaml
---
title: "Getting Started"
url: "https://docs.example.com/getting-started"
---

Page content in markdown...
```

URL path mapping:
- `/getting-started` → `getting-started.md`
- `/api/` → `api/index.md`
- `/page.html` → `page.md`
- `/#/page/export` → `page/export.md` (hash-routed SPAs)

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

- **Crawler Engine** — priority-queue scheduler with configurable concurrency (default: 24 for HTTP, 4 for browser-rendered)
- **Defuddle** — HTML-to-markdown conversion with 5s timeout; falls back to `linkedom` text extraction
- **Session routing** — each request routes through `HttpSession` (fetch) or `BrowserSession` (Playwright), with automatic escalation on SPA detection or HTTP 403
- **User agent rotation** — 8 UAs rotated per request to avoid blocking
- **Media extraction** — images, videos, and CSS `url()` references are collected into the `media` output

### SPA handling

1. Detects SPA shells by checking `<div id="root">` / `<div id="__next">` with `< 200` chars of body text
2. When detected, concurrency is capped at 4 to avoid Chromium overload
3. Hash-routed URLs (`#/page/foo`) are preserved as-is and rendered via headless Chromium
4. Playwright renders pages with `waitUntil: "networkidle"` + content selector wait
5. On-the-fly re-fetch: if an HTTP response is an SPA shell, the engine escalates to `BrowserSession` automatically

### Advanced features

#### robots.txt (`--respect-robots`)

When enabled, the engine fetches and parses `robots.txt` per-domain:
- Checks `Allow`/`Disallow` rules with wildcard (`*`) matching
- Supports multiple `User-Agent` groups with specific matching
- Respects `Crawl-Delay` directives
- Extracts `Sitemap` URLs
- Rules are cached per-domain for the duration of the crawl

#### Proxy rotation (`-p` / `--proxy`)

Pass one or more proxy URLs. When multiple are given, the engine rotates through them in round-robin order per request. Each request can also specify its own proxy via `CrawlRequest.meta.proxy`.

#### Dev cache (`--cache`)

Stores fetched responses on disk keyed by SHA-256 fingerprint of the canonical URL + method + session ID. On cache hit, the response is returned without a network request. Cache entries expire after 24 hours by default. Useful for iterating on markdown conversion callbacks without re-fetching.

#### Pause / resume

Press `Ctrl+C` once to pause — the engine saves its queue and progress to `checkpoint.json` in the output directory. Press `Ctrl+C` again to force-stop. Resume by running the same command again — the checkpoint is auto-detected and restored.

#### Detailed stats

The engine tracks per-crawl metrics:
- Total requests, failures, blocked, retried
- Cache hit/miss rate
- Per-domain request count, response bytes, and timing
- Response status code distribution
- Per-session request breakdown

### Architecture

- **Runtime**: Bun (TypeScript, no build step)
- **Concurrency**: Effect-TS for structured concurrency (`Effect.gen`, `Effect.tryPromise`)
- **Engine**: `CrawlerEngine` — token-pool concurrency control, fingerprint dedup, priority scheduling, checkpoint persistence
- **Sessions**: `HttpSession` (Bun's `fetch`) and `BrowserSession` (Playwright Chromium), routed by request `sid`
- **Browser**: Lazy-launched Chromium via Playwright; shared across browser-routed requests
- **Path safety**: `src/write.ts` validates output paths against directory traversal via `relative()` check

```
src/index.ts          CLI entrypoint, args parsing, UI, output formatting
src/engine-cli.ts     Bridge: CrawlerEngine → CLI (defuddle, media extraction, SPA fallback)
src/discover.ts       URL discovery (sitemap, nav, JS routes, browser, BFS crawl)
src/write.ts          Markdown file writer with path traversal protection
src/ui.ts             Terminal progress UI (ANSI escape codes)
src/detect.ts         SPA shell detection heuristics

src/crawler/
  engine.ts           Crawl loop, token pool, checkpoint, session routing, robots/cache hooks
  scheduler.ts        Priority queue (binary heap) + SHA-256 fingerprint dedup
  session.ts          Session interface, HttpSession (fetch + proxy), SessionManager
  browser-session.ts  BrowserSession wrapping Playwright chromium
  types.ts            CrawlRequest, CrawlResponse, CrawlConfig, CrawlStats, CrawlResult
  checkpoint.ts       Atomic disk save/load for pause/resume
  cache.ts            DevCache — disk-based response cache keyed by SHA-256 fingerprint
  robots.ts           RobotsTxt — robots.txt parser (allow/disallow, crawl-delay, sitemaps)
  proxy.ts            ProxyRotator — round-robin proxy assignment
```

## Requirements

- [Bun](https://bun.sh) runtime
- [Playwright](https://playwright.dev) Chromium (auto-used for SPAs; install with `npx playwright install chromium`)

## License

MIT

---

Source: [github.com/Ntrakiyski/webpull-cli](https://github.com/Ntrakiyski/webpull-cli)
