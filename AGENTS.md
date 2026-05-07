# webpull — Agent Guide

## Runtime & toolchain

- **Bun runtime** (not Node). Run with `bun`, not `node`.
- **TypeScript only** — no build step (`tsconfig.json: noEmit`, `module: Preserve`, `verbatimModuleSyntax: true`)
- **Biome v2** for lint+format. Config at `biome.json`: tab indent, double quotes, no semicolons, `noUnusedVariables`/`noUnusedImports` as errors.
- **No test framework** installed. No `bun test` config. Verify by running the CLI manually.
- **package.json is for npm publishing only** (CI runs `npm ci` + `npm publish`). Local dev uses bun.

## Commands

```bash
bun run src/index.ts <url>        # Run the CLI directly
bun run bin/webpull <url>          # Same (entrypoint wrapper)
bun run src/index.ts <url> -f json  # Print JSON to terminal (file if >10k chars)
bun run src/index.ts <url> -f md    # Print markdown to terminal (file if >10k chars)
```

No build, no test, no typecheck scripts in package.json. To typecheck: `bun run tsc --noEmit`.

## Architecture

- **Entrypoint**: `src/index.ts` (via `bin/webpull` → `import "../src/index.ts"`)
- **Worker pool**: `src/pool.ts` spawns Bun `Worker` threads from `src/worker.ts`
- **Discovery** (`src/discover.ts`): sitemap.xml → nav link extraction → link crawling → JS bundle route scan → headless browser render
- **SPA rendering**: `src/renderer.ts` (Playwright Chromium, lazy-launched, shared across workers). Concurrency capped at 4 when SPA detected.
- **HTML→Markdown**: `defuddle` (node entry) with 5s timeout, falls back to `linkedom` text extraction
- **User agents rotate** from 8-value pool (`src/ua.ts`)
- **Effect-TS** for structured concurrency (`Effect.gen`, `Effect.tryPromise`, `Effect.all`). **Do not** use raw Promise chains — prefer Effect operators.

## Quirks

- **Worker stderr gag**: `src/worker.ts` globally suppresses "Defuddle Error" and "pseudo-class" messages from stderr. Don't be confused by missing error output.
- **Hash-routed SPAs**: URLs with `#` fragments are preserved. Paths derived from hash (e.g. `#/page/export` → `page/export.md`).
- **Path traversal protection**: `src/write.ts` validates output paths against directory escape via `relative()` check.
- **SPA detection** (`src/detect.ts`): checks for root `<div id="root">` (etc.) with `< 200` chars of body text.
- **Limits**: default 500 pages, adjustable via `-m`.
- **Playwright**: required for SPA sites. Install with `npx playwright install chromium`.
- **CI publish**: GitHub Actions on `v*` tags. Uses Node 24, `npm ci` + `npm publish`. Version bumps before tagging.

## Key files

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entrypoint, args parsing, main Effect loop |
| `src/worker.ts` | Per-page fetch, defuddle conversion, SPA rendering |
| `src/pool.ts` | Bun Worker thread pool |
| `src/discover.ts` | URL discovery strategies |
| `src/renderer.ts` | Playwright Chromium headless browser |
| `src/convert.ts` | Page type, frontmatter helper |
| `src/write.ts` | Markdown file writer with path escape check |
| `src/ui.ts` | Terminal progress UI (ANSI escapes) |
| `src/routes.ts` | JS bundle route extraction regex |
| `src/detect.ts` | SPA shell detection heuristics |
| `src/ua.ts` | User agent rotation |
