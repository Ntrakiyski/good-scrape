---
name: webpull-ecommerce-export
description: Use when exporting ecommerce or WooCommerce-style product pages with webpull, especially when product sitemap URLs and image assets matter.
---

# Webpull Ecommerce Export

## Workflow

1. Use ecommerce mode for sites with `sitemap_index.xml` and `product-sitemap*.xml` entries:

```bash
bun run src/index.ts https://shop.example.com --ecommerce -m 500 -o ./shop-export
```

2. Product pages are written under `products/<slug>/<slug>.md`.
3. Product image URLs are downloaded into each product's `images/` folder when page media is detected.
4. Non-product pages keep the normal URL-based Markdown path.
5. A `_index.md` summary is written for ecommerce runs.

## Checks

- Confirm the product count in `_index.md` matches the expected crawl scope.
- Inspect several product folders for Markdown plus downloaded images.
- If the product count is zero, verify the source site exposes a standard product sitemap.
