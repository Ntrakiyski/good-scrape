# webpull-cli

Pull public websites into local Markdown.

`webpull-cli` is a Bun-powered CLI for crawling documentation sites, mostly-static websites, and ecommerce product pages. It discovers pages, fetches HTML or rendered SPA content, converts useful page content to Markdown, and writes the result as local files or terminal output.

## What It Is For

- Mirroring public docs into Markdown for search, review, or AI ingestion.
- Exporting smaller public sites into URL-shaped Markdown folders.
- Capturing ecommerce product pages into product folders with optional image downloads.
- Running repeatable crawls locally, in CI, or in Docker.

It is not a private-data crawler. Only crawl sites you are allowed to access, and use `--respect-robots` for third-party production sites unless you have a clear reason not to.

## Requirements

- Bun 1.1 or newer.
- Playwright Chromium for SPA rendering.

Install Chromium when you expect JavaScript-rendered pages:

```bash
npx playwright install chromium
```

## Install

Global package install:

```bash
npm install -g webpull-cli
webpull https://docs.example.com
```

Local repo usage:

```bash
bun install
bun run src/index.ts https://docs.example.com
```

The published package name is `webpull-cli`; the installed command is `webpull`.

## CLI Usage

```bash
webpull <url> [options]
```

Options:

```text
-o, --out <dir>       Output directory (default: ./<hostname>)
-m, --max <n>         Max pages to pull (default: 500)
-f, --format <fmt>    Output format: json or md
-p, --proxy <url>     Proxy URL, repeatable for round-robin rotation
--respect-robots      Respect robots.txt allow, disallow, and crawl-delay rules
--cache <dir>         Disk cache for faster local iteration
--ecommerce           Product-oriented export mode
```

## Examples

Pull a documentation site:

```bash
webpull https://react.dev -m 100 -o ./react-docs
```

Print newline-delimited JSON:

```bash
webpull https://docs.example.com -f json
```

Print Markdown:

```bash
webpull https://docs.example.com -f md
```

Respect robots.txt:

```bash
webpull https://docs.example.com --respect-robots
```

Use a development cache:

```bash
webpull https://docs.example.com --cache .webpull-cache
```

Rotate proxies:

```bash
webpull https://docs.example.com \
  -p http://proxy1:8080 \
  -p http://proxy2:8080
```

## Output

Default mode writes Markdown files under the output directory. Paths follow the source URL:

```text
/getting-started      -> getting-started.md
/api/                 -> api/index.md
/page.html            -> page.md
/#/page/export        -> page/export.md
```

Each Markdown file starts with frontmatter:

```yaml
---
title: "Getting Started"
url: "https://docs.example.com/getting-started"
---
```

When page media is detected, the Markdown includes a `Page Assets` section with original asset URLs.

For terminal formats, pages larger than 50,000 characters are written to files instead of stdout, and the file path is printed to stderr.

## Ecommerce Mode

Use `--ecommerce` for WooCommerce-style sites that expose a sitemap index with `product-sitemap*.xml` entries.

```bash
webpull https://shop.example.com --ecommerce -m 500 -o ./shop-export
```

In ecommerce mode:

- Product pages are written under `products/<slug>/<slug>.md`.
- Product Markdown includes a `slug` frontmatter field.
- Product image assets are downloaded into each product folder when image URLs are detected.
- Non-product pages are still written with normal URL-shaped paths.
- A `_index.md` summary is written at the output root.

If ecommerce mode reports zero products, check that the site exposes a standard product sitemap.

## Docker

Build the image:

```bash
docker build -t webpull-cli .
```

Run a crawl with a mounted output directory:

```bash
docker run --rm -v "$PWD/output:/out" webpull-cli https://docs.example.com -o /out -m 100
```

Run ecommerce mode:

```bash
docker run --rm -v "$PWD/shop-output:/out" webpull-cli https://shop.example.com --ecommerce -o /out -m 500
```

The Docker image uses the official Playwright runtime image, installs Bun, and installs production dependencies.

## How It Works

Discovery combines sitemap lookup, navigation extraction, JavaScript route scanning, rendered browser links, and same-host crawling. The crawler uses a priority queue, structured concurrency, user-agent rotation, optional robots.txt rules, optional proxy rotation, and optional disk caching.

HTML conversion uses Defuddle with a timeout and falls back to text extraction when the page cannot be converted cleanly. SPA shells are detected and rendered through Playwright Chromium when needed.

## Production Notes

- Keep generated output outside the repo or in ignored directories.
- Do not commit credentials, local caches, debug scripts, or crawl results.
- Use bounded `-m` values for first runs, inspect the output, then expand.
- Use `--respect-robots` for third-party production sites.
- Use `--cache` for local development only, not for clean production exports.
- Use proxies only when you own them and the target site's policy allows them.

## Development

Install dependencies:

```bash
bun install
```

Run checks:

```bash
bun run check
```

Individual checks:

```bash
bun run lint
bun run typecheck
bun run test
```

`bun run test` is a CLI smoke test that prints help. There is no separate test framework configured.

## Usage Skills

The `skills/` directory contains concise operating guides for agents or operators:

- `webpull-docs-crawl`: documentation and static-site crawls.
- `webpull-ecommerce-export`: product sitemap exports and image capture.
- `webpull-production-ops`: GitHub, Docker, and repeatable production runs.

## Troubleshooting

No pages found:

- Check that the URL is public and reachable.
- Try a lower `-m` with the exact docs root URL.
- For JavaScript-heavy sites, install Playwright Chromium.

Missing or thin Markdown:

- The page may be mostly client-rendered or protected.
- Try the same URL in a browser and confirm public content is visible.
- Inspect stderr for conversion or fetch errors.

Publish or CI failure:

- Run `bun run check` locally.
- Confirm Bun is available in CI.
- Confirm generated crawl output and credentials are not present in `git status`.

## License

MIT
