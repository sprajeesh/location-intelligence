# Contributing

## Branching model

`main` is the trunk and is expected to always be green (CI/CD passing).

- **Regular work** (features, fixes, chores, refactors): branch off `main`
  using a [Conventional Commits](https://www.conventionalcommits.org/)-style
  prefix, e.g. `feat/settings-facility-selection`, `fix/overpass-429-504`,
  `chore/remove-oci-infra`, `ci/release-workflow-run-trigger`. Open a PR and
  squash-merge it. Use a Conventional Commits title for the merge commit
  (e.g. `fix(ci): correct expression syntax in release.yml`) — CI/CD runs on
  every push, and release-please reads these commit messages on `main` to
  build each component's changelog and version bump.

- **Release branches**: prefixed `release--<description>`, e.g.
  `release--deploy-web-with-caddy-reverse-proxy`. Squash-merge with a commit
  message starting with `release:`. This prefix is the trigger the CI/CD
  pipeline (`.github/workflows/push.yml`) checks for before deploying to
  production — see [Deploying to prod](#deploying-to-prod) below.

Only `release:`-prefixed merges to `main` deploy. Everything else runs tests
but stops there.

## Release-please and versioning

`apps/api` and `apps/web` are versioned independently (`separate-pull-requests`
in `.release-please-config.json`) using
[release-please](https://github.com/googleapis/release-please), driven by
Conventional Commit types (`feat` → minor, `fix` → patch, etc.). Both
packages are pre-1.0, and `bump-minor-pre-major` is set so breaking changes
bump minor instead of major until they reach `1.0.0`. Tags are formatted
`<component>@v<version>` (e.g. `api@v0.2.0`), per `include-v-in-tag` /
`tag-separator`. Current versions live in `.release-please-manifest.json`.

The flow (`.github/workflows/release.yml`):

1. A `release:` commit merges to `main` → CI/CD passes → release-please runs
   and opens/updates a per-component version-bump PR (title like
   `chore(main): release api 0.2.0`) with the changelog entry for everything
   merged since the last release.
2. Merging that PR is itself a trigger: release-please runs again, recognizes
   its own release commit, and tags + publishes the GitHub Release — no
   separate deploy is triggered by this merge (its commit message doesn't
   start with `release:`).
3. A manual `workflow_dispatch` escape hatch exists on the same workflow if
   you need to re-run release-please without waiting for a qualifying push
   (Actions → Release Please → Run workflow).

release-please authenticates with the `RELEASE_PLEASE_TOKEN` secret (a PAT
with `Contents: write` + `Pull requests: write`) rather than the default
`GITHUB_TOKEN`, which GitHub does not permit to open pull requests.

## Deploying to prod

There is no separate manual deploy step — deploying is a side effect of
merging a `release--` branch:

1. Branch off `main` as `release--<what-this-release-is>`.
2. Make your changes, open a PR, make sure CI/CD's `test` job (lint, Snyk
   scan, unit tests, build) is green.
3. Squash-merge with a commit message starting with `release:` (e.g.
   `release: add facility filtering`).
4. On `main`, CI/CD's `test` job re-runs; once it passes, `deploy-api` and
   `deploy-web` run in parallel automatically (`.github/workflows/push.yml`):
   - `deploy-api` SSHes into the app VM and runs
     `docker compose up -d --build` for the API, PostGIS, Redis, and OSRM,
     then polls `/health` until it reports `ok`.
   - `deploy-web` builds the Next.js app for Cloudflare (OpenNext) and
     deploys it to Cloudflare Workers via Wrangler.
5. If the release included version-worthy changes, follow up by merging the
   release-please PR it generates (see above) to cut the tag and GitHub
   Release for the affected component(s).

Both deploy jobs require their respective secrets to be configured in the
repo (`DEPLOY_SSH_KEY`, `DEPLOY_SERVER_HOST`, `DEPLOY_SERVER_HOST_KEY`,
`DEPLOY_APP_DIR`, `DB_USER`, `DB_PASSWORD`, `API_SHARED_SECRET` for the API;
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PROD_API_URL` for web).
