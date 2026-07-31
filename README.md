# dev-portal

Internal API documentation for the Anchor project. This is where OpenAPI specs for all of the project's APIs live, along with a static site generated from them.

## Structure

- `docs/openapi.yaml` — the Anchor API spec (Supabase PostgREST: RPC + table endpoints). Source of truth.
- `index.html` — the static docs site (Redoc), automatically rebuilt from `docs/openapi.yaml` on every push to `main` (see `.github/workflows/build-docs.yml`). **Do not edit by hand** — changes will be overwritten.

## Local preview

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## Adding docs for a new API

1. Add a new `docs/<name>.yaml` (OpenAPI 3.0).
2. Validate it: `npx @redocly/cli lint docs/<name>.yaml`.
3. If there end up being multiple APIs, update `build-docs.yml` to generate separate pages or a combined spec.

## Hosting

This repo is private — GitHub Pages isn't available for private repos on anchor-org's Free plan, so the site is hosted on **Vercel** instead (connecting the repo is a one-time step done in the browser, see below).

### Connect Vercel (one-time)

1. https://vercel.com/new
2. Import Git Repository → authorize the Vercel GitHub App for `anchor-org` (if not already done)
3. Select `dev-portal` → Deploy (no extra config needed — it's a static site, `index.html` at the root)

Once connected, every push to `main` (including the auto-commits from `build-docs.yml`) automatically redeploys the site.
