---
name: webpull-production-ops
description: Use when preparing webpull for GitHub, npm publishing, Docker runs, or repeatable production crawling.
---

# Webpull Production Ops

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

Run with an output mount:

```bash
docker run --rm -v "$PWD/output:/out" webpull-cli https://docs.example.com -o /out -m 100
```

## Production Crawling

- Prefer `--respect-robots` for third-party sites.
- Use `--cache <dir>` only for development or repeat local conversion work.
- Use repeated `-p/--proxy` values only when the operator owns the proxies and the target policy allows them.
