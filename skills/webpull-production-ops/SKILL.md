---
name: webpull-production-ops
description: Use when preparing webpull for GitHub, npm publishing, Docker runs, or repeatable production crawling.
---

# Webpull Production Ops

## Available Interfaces

- Local CLI: run with Bun, for example `bun run bin/webpull https://docs.example.com -o ./output -m 100`.
- Installed CLI: not available yet because `webpull-cli` is not currently published on npm.
- Docker service: running the image with no command starts the HTTP service on port `3000`.
- Docker CLI: pass `webpull` as the first container argument.
- Hosted API: deployed service exposes `GET /health`, `GET /`, and capped `POST /api/pull`.
- MCP: not available yet. Do not describe this project as an MCP server until an MCP adapter is added.
- Browser rendering: use `--browser` when output only contains loading text or shell UI.

## Preflight

1. Run the local checks:

```bash
bun run check
```

2. Confirm no generated crawl output, credentials, caches, or debug scripts are present in `git status`.
3. Install Playwright Chromium on hosts that run SPA crawls:

```bash
npx playwright install chromium
```

## Docker

Build:

```bash
docker build -t webpull-cli .
```

Run the hosted service locally:

```bash
docker run --rm -p 3000:3000 webpull-cli
```

Run CLI mode with an output mount:

```bash
docker run --rm -v "$PWD/output:/out" webpull-cli webpull https://docs.example.com -o /out -m 100
```

Run CLI mode with forced browser rendering:

```bash
docker run --rm -v "$PWD/output:/out" webpull-cli webpull https://docs.example.com --browser -o /out -m 100
```

## HTTP Service

Health check:

```bash
curl http://localhost:3000/health
```

Scrape API:

```bash
curl -X POST http://localhost:3000/api/pull \
	-H "content-type: application/json" \
	-d '{"url":"https://example.com","max":5,"respectRobotsTxt":true,"browser":false}'
```

## Production Crawling

- Prefer `--respect-robots` for third-party sites.
- Use `--cache <dir>` only for development or repeat local conversion work.
- Use repeated `-p/--proxy` values only when the operator owns the proxies and the target policy allows them.
- Keep hosted `POST /api/pull` requests bounded; the server caps public requests at 50 pages.
