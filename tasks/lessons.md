# Lessons

## 2026-06-08 - Do not mutate dependencies during checks

Mistake:
Ran `npm ci` in parallel with `bun run check`, causing TypeScript to lose access to installed type libraries while `node_modules` was being replaced.

Why it happened:
I treated dependency installation and validation as independent, but both read or mutate the same dependency tree.

Rule for next time:
Run package-manager installs and checks sequentially when they share `node_modules`, lockfiles, or generated dependency state. This includes verification installs such as `bun install --frozen-lockfile`.

Example check:
Finish `npm ci` or `bun install` first, then run `bun run check` in a separate step.

## 2026-06-08 - Verify package availability before documenting install commands

Mistake:
Left `npm install -g webpull-cli` in the README even though the package is not currently published on npm.

Why it happened:
I treated package metadata and publish intent as enough evidence for user-facing install instructions.

Rule for next time:
Before documenting an external package install path, verify the package is currently available in the registry or clearly label the command as future/pending.

Example check:
Run `npm view <package> name version --json` before adding or keeping `npm install` instructions.

## 2026-06-08 - Verify rendered content, not just discovered URLs

Mistake:
Accepted a successful Annnimate sitemap crawl at first even though representative Markdown only contained `Loading`.

Why it happened:
I treated page discovery and file count as enough evidence before checking whether the page body was actually rendered content.

Rule for next time:
For JavaScript-heavy sites, always open a representative generated Markdown file and confirm meaningful body content before reporting the crawl as successful.

Example check:
Inspect a known deep page, such as `learn/easing/back-out.md`, and verify it contains expected article terms instead of loading-shell text.

## 2026-06-08 - Keep engine follow-up links inside discovered scope

Mistake:
The crawler followed rendered same-host links outside the discovered `/learn/` URL set, which pushed progress beyond the known total and crashed the progress UI.

Why it happened:
Discovery was path-scoped, but the engine callback still extracted additional same-host links without checking the discovered URL set.

Rule for next time:
When discovery produces a bounded URL set, pass that set into the crawl engine and reject follow-up links that are not in it.

Example check:
After a scoped crawl, compare all generated frontmatter URLs with the requested scope and ensure progress never exceeds the discovered total.

## 2026-06-08 - Prefer sitemap discovery before SPA navigation fallback

Mistake:
After improving SPA detection for Annnimate, discovery treated `/learn/` as an SPA and returned only rendered navigation links instead of the full `/learn/` sitemap.

Why it happened:
The SPA branch ran before sitemap discovery, so better shell detection accidentally skipped the richer source of truth.

Rule for next time:
Try sitemap discovery before browser-rendered navigation fallback; use SPA navigation only when sitemap discovery does not produce scoped URLs.

Example check:
For a site with `robots.txt` sitemap entries, compare the discovered count before and after SPA detection changes.
