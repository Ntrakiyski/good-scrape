---
name: webpull-docs-crawl
description: Use when converting a public documentation site or mostly-static website into local Markdown files with webpull.
---

# Webpull Docs Crawl

## Workflow

1. Confirm the target URL is public and safe to crawl.
2. Start with a bounded run:

```bash
bun run src/index.ts https://docs.example.com -m 50 -o ./docs.example.com
```

3. Inspect the output directory for path shape, frontmatter, missing pages, and noisy boilerplate.
4. Increase `-m` only after the first run looks correct.
5. Use `--respect-robots` when crawling third-party production sites unless the operator has a reason not to.
6. If representative Markdown only contains loading text or shell UI, rerun with `--browser`.

## Output Choices

- Default mode writes Markdown files under `./<hostname>` or the `-o` directory.
- `-f md` prints Markdown to stdout for small pages.
- `-f json` prints one JSON object per page for scripts and downstream processing.

## Checks

- Verify at least one expected top-level page exists.
- Open representative Markdown files and confirm title, URL, and body content are useful.
- Review stderr for failed URLs and decide whether they are acceptable.
