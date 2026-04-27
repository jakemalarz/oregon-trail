# Deploying to S3

The build output is a fully static site that can be served from any S3 bucket
configured for static website hosting (or any other static host: CloudFront,
Netlify, Vercel, GitHub Pages, plain nginx).

## Build the package

```bash
npm install
npm run package
```

This produces:

- `dist/` — the static site (`index.html` + hashed assets)
- `oregon-trail-dist.zip` — a zipped copy of `dist/` for upload

## S3 upload

Replace `BUCKET` and `PREFIX` (optional) below.

```bash
aws s3 sync dist/ s3://BUCKET/PREFIX/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html s3://BUCKET/PREFIX/index.html \
  --cache-control "public,max-age=0,must-revalidate" \
  --content-type "text/html"
```

The `index.html` is uploaded last with a no-cache header so future deploys are
visible immediately. All hashed assets (`assets/*.js`, `assets/*.css`) get the
1-year `immutable` cache header — when content changes, the filename hash
changes, so cache invalidation is automatic.

## S3 static website hosting setup

```bash
aws s3 website s3://BUCKET --index-document index.html
```

Then set a public-read bucket policy on `BUCKET/PREFIX/*` (or, recommended, put
CloudFront in front of the bucket and use Origin Access Control).

## Notes

- `vite.config.ts` uses `base: './'`, so the build works from any path prefix.
- All assets are served from `assets/` with content-hashed filenames.
- No server-side dependencies. No environment variables required at runtime.
- The game stores high scores in `localStorage` only — nothing leaves the
  browser.

## Local preview

```bash
npm run preview
# → http://localhost:4173
```
