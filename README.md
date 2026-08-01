# dev-portal

Internal API documentation for the Anchor project. This is where OpenAPI specs for all of the project's APIs live, along with a static site generated from them.

## Structure

- `docs/openapi.yaml` — the Anchor API spec (Supabase PostgREST: RPC + table endpoints). Source of truth.
- `index.html` — the static docs site (Redoc), automatically rebuilt from `docs/openapi.yaml` whenever a PR touching it merges into `main` (see `.github/workflows/build-docs.yml` — it opens its own PR with the rebuilt file, since direct pushes to `main` are blocked). **Do not edit by hand** — changes will be overwritten.
- `tests/test_openapi.py` — unit + integration tests for the spec (see Testing below).

## Local preview

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## Adding docs for a new API

1. Add a new `docs/<name>.yaml` (OpenAPI 3.0).
2. Validate it: `npx @redocly/cli lint docs/<name>.yaml`.
3. If there end up being multiple APIs, update `build-docs.yml` to generate separate pages or a combined spec.

## Testing

`tests/test_openapi.py` runs two kinds of checks:

- **Unit** — the spec is internally consistent (valid OpenAPI, unique operationIds, `$ref`s resolve, response schemas present, etc). No external dependencies.
- **Integration** — the spec matches reality: every documented RPC has a matching SQL function, every RPC/table the client actually calls is documented, request params and response fields match what `lib/*.ts` in the `anchor` repo sends/reads. Needs the `anchor` repo checked out somewhere on disk.

Run locally (assumes `anchor` is checked out as a sibling directory, e.g. `~/anchor` next to `~/dev-portal` — otherwise set `ANCHOR_REPO_PATH`):

```bash
python3 tests/test_openapi.py
# or, if anchor isn't a sibling directory:
ANCHOR_REPO_PATH=/path/to/anchor python3 tests/test_openapi.py
```

Runs automatically on every PR that touches `docs/**.yaml` or `tests/**` (`.github/workflows/test.yml`). The integration checks need a `ANCHOR_REPO_TOKEN` repo secret — a GitHub Personal Access Token with read access to the private `anchor-org/anchor` repo (Settings → Secrets and variables → Actions → New repository secret). Without it, that CI job fails clearly rather than silently skipping, as a reminder it isn't wired up yet.

## Hosting

This repo is public — GitHub Pages and Vercel's free tier don't support private repos owned by an org on their respective free plans, so `dev-portal` is public (it's just API documentation, no secrets). The site is hosted on **Vercel** (connecting the repo is a one-time step done in the browser, see below).

### Connect Vercel (one-time)

1. https://vercel.com/new
2. Import Git Repository → authorize the Vercel GitHub App for `anchor-org` (if not already done)
3. Select `dev-portal` → Deploy (no extra config needed — it's a static site, `index.html` at the root)

Once connected, every push to `main` (including the auto-commits from `build-docs.yml`) automatically redeploys the site.
