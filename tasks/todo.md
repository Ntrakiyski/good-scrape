# Task Plan

## Goal

Prepare `webpull` for GitHub and Docker-based production use by understanding the project, removing generated/test/debug artifacts, documenting how to use it, adding production deployment assets, and verifying the CLI still works.

## Constraints

- Use Bun for local development and execution.
- Keep source changes scoped to production readiness and cleanup.
- Do not remove useful application source, package files, docs, or release automation.
- Treat untracked crawl outputs, debug scripts, local caches, credentials, and ad hoc conversion files as cleanup candidates unless evidence shows they are required.
- Avoid destructive git history operations.
- No test framework is configured; verification must use typecheck, Biome, and manual CLI runs.

## Steps

- [x] Inventory project purpose, runtime, source files, package metadata, and current dirty/untracked files.
- [x] Identify files/folders that are generated outputs, local-only artifacts, debug scripts, test/use-case runs, or sensitive credentials.
- [x] Remove unused/generated/test artifacts from the repo working tree.
- [x] Update ignore rules so crawl outputs, local caches, debug scripts, credentials, and OS files do not return.
- [x] Add Docker production assets for running the CLI in a container.
- [x] Create 1-3 project usage skills that explain common ways to operate `webpull`.
- [x] Update `README.md` for a fresh reader: what the project is, install/run commands, output behavior, Docker usage, production notes, and troubleshooting.
- [x] Review package metadata and source exports for production readiness.
- [x] Run Biome, TypeScript typecheck, and a manual CLI smoke test.

## Verification

- [x] Main output checked.
- [x] Relevant source/data reviewed.
- [x] Tool results verified.
- [x] Manual flow checked, if applicable.
- [x] Edge cases checked.
- [x] Stakeholder-facing result reviewed.
- [x] Risks or limitations documented.

## Review

Completed review:

- `webpull` is a Bun TypeScript CLI that crawls public sites and converts pages to Markdown or JSON.
- Tracked production source lives in `src/`, `bin/`, package/config files, README, license, and GitHub workflow.
- Removed generated crawl outputs (`topautoshop.bg/`, `topautoshop-new/`, `docs/`, `react.dev/`, `clerk.com/`, `lex_chapters/`), local cache (`.webpull-cache/`), ad hoc debug/conversion scripts (`_*.mjs`, `_categories.json`), OS files (`.DS_Store`), and local credentials (`credentials.json`).
- Added ignore coverage for crawl outputs, cache, debug artifacts, and local credentials.
- Added Docker production assets using the official Playwright runtime image plus Bun. The first Dockerfile variant hung while installing Playwright browsers in `oven/bun`; the final Dockerfile avoids that by using the Playwright base image.
- Added three usage skills: docs crawl, ecommerce export, and production ops.
- Updated README for fresh-reader usage, Docker, ecommerce mode, development checks, production notes, and troubleshooting.
- Updated package metadata, scripts, npm publish workflow, npm package file allowlist, and lockfiles.

Verification performed:

- `bun run format`
- `npm run check`
- `bun run src/index.ts https://example.com -m 1 -o /tmp/webpull-smoke`
- Opened `/tmp/webpull-smoke/index.md` and confirmed frontmatter plus Markdown content.
- `npm pack --dry-run --json` confirmed the npm package includes source, bin, README, license, package metadata, and the three skills only.
- `docker build -t webpull-cli:verify .`
- `docker run --rm webpull-cli:verify --help`
- `docker run --rm -v /tmp/webpull-docker-smoke-final:/out webpull-cli:verify https://example.com -m 1 -o /out`
- Opened `/tmp/webpull-docker-smoke-final/index.md` and confirmed frontmatter plus Markdown content.
- `git diff --check`

Remaining risk:

- No full crawl against a large SPA or ecommerce site was run in this pass; coverage is a production packaging check plus one-page HTTP smoke tests.

## Publish Follow-Up

Goal:

- Update `AGENTS.md` to match the cleaned production repo and push the work to `https://github.com/Ntrakiyski/good-scrape.git` on `main`.

Steps:

- [x] Refresh `AGENTS.md` for current commands, Docker, skills, ecommerce mode, and production artifacts.
- [x] Run checks after the guide update.
- [x] Commit intended changes.
- [x] Point `origin` at `Ntrakiyski/good-scrape`.
- [x] Push `main` with upstream tracking.

Verification:

- [x] `npm run check` passes.
- [x] `git status` reviewed before commit.
- [x] Commit created.
- [x] Push succeeds.

Pre-commit evidence:

- `npm run check` passed after the `AGENTS.md` update.
- `git diff --check` passed.
- GitHub CLI authentication is active for `Ntrakiyski`.
- Commit `d6e9f34` was pushed to `https://github.com/Ntrakiyski/good-scrape.git` on `main`.

## Coolify Deployment Follow-Up

Goal:

- Deploy `good-scrape` to the Coolify `Autonomous` project and return a public URL.

Constraints:

- The repo was CLI-only, so a persistent HTTP service is required before Coolify can expose a URL.
- Keep CLI behavior available in Docker via the `webpull` entrypoint command.
- Cap hosted scrape requests to avoid unbounded public crawling.

Steps:

- [x] Confirm Coolify tooling is available.
- [x] Locate the `Autonomous` project, production environment, server, destination, and GitHub source.
- [x] Add an HTTP service wrapper for `/`, `/health`, and `POST /api/pull`.
- [x] Update Docker defaults for HTTP service deployment while preserving CLI mode.
- [x] Run local checks and Docker smoke tests.
- [x] Commit and push deployment changes.
- [x] Create/deploy the Coolify application.
- [x] Verify the deployed URL.

Verification so far:

- `npm run check` passed.
- Local `bun run serve` responded at `/health`.
- Local `POST /api/pull` returned Markdown JSON for `https://example.com`.
- `docker build -t good-scrape:verify .` passed.
- Docker service mode responded at `/health` and `POST /api/pull`.
- Docker CLI mode `webpull --help` passed.

Review:

- Added and pushed commit `382feac` (`add hosted scrape service`) to `main`.
- Created Coolify app `good-scrape` in project `Autonomous` / environment `production`.
- Deployed commit `382feac1c878ea3727e6688d82de0d327b82fbb1`; Coolify reported `running:healthy`.
- Public URL: `https://good-scrape.159.69.35.245.sslip.io`.
- Verified `GET /health` returns `{ "ok": true, "service": "good-scrape" }`.
- Verified `GET /` returns the Good Scrape UI.
- Verified `POST /api/pull` against `https://example.com` returns Markdown JSON.

## Annnimate Learn Crawl Follow-Up

Goal:

- Test `good-scrape` on `https://www.annnimate.com/learn/` and capture the `/learn/` subpages and sub-subpages as Markdown.

Constraints:

- Keep generated crawl output outside the repo.
- Respect robots.txt for this third-party site.
- Preserve scope under `/learn/`.

Steps:

- [x] Confirm crawler URL scope behavior for `/learn/`.
- [x] Run a bounded crawl for `https://www.annnimate.com/learn/`.
- [x] Inspect generated files and confirm representative sub/sub-sub pages were captured.
- [x] Report output location, page count, and any limitations.

Verification:

- [x] CLI command completed.
- [x] Output file count checked.
- [x] Representative Markdown file opened.
- [x] URLs reviewed for `/learn/` scope.

Review:

- Initial HTTP-only crawl found 27 sitemap pages but produced loading-shell Markdown for rendered pages.
- Added browser rendering support via `--browser` and a Next/App Router loading-shell heuristic.
- Fixed engine link following so rendered pages do not expand beyond the discovered URL set.
- Fixed progress UI clamping and browser-session startup so browser crawls do not crash or hang after completion.
- Raised the hosted API cap from 25 to 50 pages so this 27-page `/learn/` crawl can fit through curl.
- Final command: `bun run bin/webpull https://www.annnimate.com/learn/ --browser --respect-robots -m 500 -o /tmp/good-scrape-annnimate-learn-browser`.
- Final output: 27 Markdown files under `/tmp/good-scrape-annnimate-learn-browser`.
- Verified `learn/easing/back-out.md` contains rendered article content including the back.out mechanics section.
- Verified all frontmatter URLs are under `https://www.annnimate.com/learn/`.
- Verified local `POST /api/pull` with `{"url":"https://www.annnimate.com/learn/","max":30,"respectRobotsTxt":true,"browser":true}` returned 27 pages, `errors: 0`, and rendered `back-out` content.
- Deployed commit `ef665ae` to Coolify and verified the live hosted API returned 27 pages, `errors: 0`, all URLs under `/learn`, and rendered `back-out` content.
