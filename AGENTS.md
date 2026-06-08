# webpull-cli — Agent Guide

## Runtime & Toolchain

- **Runtime**: Bun. Run local CLI commands with `bun`, not `node`.
- **Language**: TypeScript only. There is no emitted build artifact; `tsconfig.json` uses `noEmit`, `module: Preserve`, and `verbatimModuleSyntax`.
- **Formatting/linting**: Biome v2. Config uses tab indentation, double quotes, no semicolons, and treats unused imports/variables as errors.
- **Tests**: No full test framework is configured. `bun run test` is a CLI help smoke test.
- **Validation**: `npm run check` and `bun run check` both run lint, typecheck, and the smoke test.
- **SPA support**: Playwright Chromium is required for JavaScript-rendered sites.

## Common Commands

```bash
bun install
bun run check
bun run lint
bun run typecheck
bun run test
bun run serve

bun run src/index.ts <url>
bun run bin/webpull <url>
bun run src/index.ts <url> -o ./output -m 100
bun run src/index.ts <url> -f json
bun run src/index.ts <url> -f md
bun run src/index.ts <url> --respect-robots
bun run src/index.ts <url> --cache .webpull-cache
bun run src/index.ts <url> -p http://proxy:8080
bun run src/index.ts <url> --ecommerce
bun run src/index.ts <url> --browser
```

## Docker

The production Dockerfile uses the official Playwright runtime image, installs Bun, installs production dependencies, and runs as `pwuser`. Default container mode starts the HTTP service. Use `webpull` as the first container argument to run the CLI.

```bash
docker build -t webpull-cli .
docker run --rm -p 3000:3000 webpull-cli
docker run --rm -v "$PWD/output:/out" webpull-cli webpull https://docs.example.com -o /out -m 100
```

Use mounted output directories for production runs. Do not write generated crawl output into the repo.

## Architecture

- **Entrypoint**: `src/index.ts`
  - Parses CLI arguments.
  - Runs discovery.
  - Selects browser concurrency for SPA/loading shells or explicit `--browser`.
  - Handles terminal/file output modes.
  - Handles ecommerce product output and image downloads.
- **Crawler bridge**: `src/engine-cli.ts`
  - Adapts `CrawlerEngine` output to CLI page data.
  - Converts HTML to Markdown with Defuddle and `linkedom` fallback.
  - Extracts media references and bounded same-host links.
  - Escalates SPA shells to browser fetches when browser mode is enabled.
- **Crawler core**: `src/crawler/`
  - Priority scheduling, fingerprint deduplication, sessions, checkpointing, cache, robots.txt, and proxy rotation.
- **Discovery**: `src/discover.ts`
  - Sitemap lookup, navigation extraction, JavaScript route scanning, browser-rendered links, and same-host crawling.
- **Rendering**: `src/renderer.ts` and `src/crawler/browser-session.ts`
  - Playwright Chromium rendering for SPAs.
- **Writing**: `src/write.ts`
  - URL-to-path mapping with hash-route support and path traversal protection.
- **Product mode**: `src/product.ts` and `src/download.ts`
  - Product sitemap detection, product slug extraction, and image downloads.
- **HTTP service**: `src/server.ts`
  - Serves `/`, `/health`, and capped `POST /api/pull` requests for hosted deployments.

## Output Behavior

- Default output writes Markdown files under `./<hostname>` or `-o <dir>`.
- Hash-routed SPA URLs are preserved, e.g. `/#/page/export` writes `page/export.md`.
- Terminal formats use `-f json` or `-f md`.
- Pages larger than 50,000 characters are written to files instead of stdout.
- `--ecommerce` writes products as `products/<slug>/<slug>.md`, downloads detected product images, and writes `_index.md`.

## Production Hygiene

- Do not commit crawl outputs, caches, credentials, debug scripts, or OS files.
- `.gitignore` and `.dockerignore` already cover common generated artifacts.
- Use `--respect-robots` for third-party production sites unless the operator explicitly chooses otherwise.
- Use bounded `-m` values for first runs, inspect output, then expand.
- Use proxies only when the operator owns them and the target site's policy allows them.
- Keep `tasks/todo.md` updated for non-trivial work and `tasks/lessons.md` for corrections or avoidable mistakes.

## Publishing

- GitHub publish workflow runs on `v*` tags.
- CI uses Node 24, Bun setup, `npm ci`, `npm run check`, and `npm publish`.
- `package.json` has a `files` allowlist for package contents: `bin`, `src`, `skills`, `README.md`, and `LICENSE`.
- Before publishing or pushing, run `npm run check` and inspect `npm pack --dry-run --json`.

## Skills

The `skills/` directory contains concise operating guides:

- `webpull-docs-crawl`
- `webpull-ecommerce-export`
- `webpull-production-ops`

Use these for repeatable agent/operator workflows around docs crawls, ecommerce exports, and production deployment.

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entrypoint, args parsing, output routing |
| `src/engine-cli.ts` | Crawler-to-CLI bridge, conversion, media extraction |
| `src/discover.ts` | URL discovery strategies |
| `src/write.ts` | Markdown writer and path traversal guard |
| `src/product.ts` | Ecommerce product sitemap helpers |
| `src/download.ts` | Image download helpers |
| `src/server.ts` | HTTP service wrapper |
| `src/ui.ts` | Terminal progress UI |
| `src/routes.ts` | JavaScript route extraction |
| `src/detect.ts` | SPA shell detection |
| `src/renderer.ts` | Shared Playwright browser renderer |
| `src/crawler/engine.ts` | Main crawl loop |
| `src/crawler/scheduler.ts` | Priority queue and deduplication |
| `src/crawler/session.ts` | HTTP session and session manager |
| `src/crawler/browser-session.ts` | Browser session wrapper |
| `src/crawler/checkpoint.ts` | Pause/resume checkpoint persistence |
| `src/crawler/cache.ts` | Disk cache |
| `src/crawler/robots.ts` | robots.txt parser |
| `src/crawler/proxy.ts` | Proxy rotation |
| `Dockerfile` | Production container |
| `skills/` | Usage guides |
| `tasks/` | Planning and lessons artifacts |
