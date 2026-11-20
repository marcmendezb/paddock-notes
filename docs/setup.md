# Paddock Notes: going live on Cloudflare

> A checklist to go from the repository to the published site, on the author's account (`marcmendezb`, D-38). Follow the order: each step leaves what the next one needs. It summarises and makes concrete [stack.md §17](stack.md#17-setup-recommended-order).
> Until step 7, GitHub only runs the checks (lint, types, tests, build and gitleaks). Preview, deploy and backup wait for the `CLOUDFLARE_READY` variable.
> Paddock Notes sends no email and has no sign-ups (D-38): there is no Email Service step.

## 1. Accounts

- [x] The Cloudflare account `marcmendezb` (`d93e035c09bdc00f3104ad84bc2649a0`), workers.dev subdomain `marcmendezb`.
- [ ] 2FA on the Cloudflare account (security key or passkey).
- [ ] The **Workers Paid** plan: the API's CPU limit (`limits.cpu_ms`) requires it, and server-rendered pages need more than the free plan's 10 ms of CPU (stack.md §14).
- [ ] **R2** turned on (R2 Object Storage in the dashboard; Cloudflare asks for a payment method even for the free tier). Every Worker binds a bucket, so nothing deploys without it.
- [ ] On GitHub: 2FA, secret scanning with push protection and Dependabot alerts turned on (Settings → Code security).
- [ ] Later, the custom domain `pn.marcmendezb.com` (D-38): `marcmendezb.com` on Cloudflare, a `custom_domain` route on `paddock-web`, `SITE_URL`, `AUTH_BASE_URL` and `TRUSTED_ORIGINS`, the Turnstile widget's domains and `security.txt`.

## 2. Resources (EU jurisdiction)

From the repository root. The account is not the default `wrangler` login on the author's machine: use the isolated one, `HOME="$HOME/.paddock-cloudflare" pnpm exec wrangler …`.

- [x] D1 `paddock-db` and `paddock-db-preview` (EU), with their ids in `workers/api` and `workers/ingest`. Each keeps `preview_database_id` at the old zeros, so `wrangler dev` finds the local data.
- [x] KV `CACHE` and `CACHE_PREVIEW`, with their ids in `workers/api`.
- [x] Migrations applied to both databases (`wrangler d1 migrations apply … --remote`).
- [ ] R2, once turned on:

```sh
pnpm exec wrangler r2 bucket create paddock-analysis --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-analysis-preview --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-backups --jurisdiction eu
```

- [ ] On `paddock-backups`, a lifecycle rule that deletes objects after 90 days (D-15).

## 3. Worker secrets

- [x] A Turnstile widget (managed mode) for both workers.dev hosts. The web app no longer shows it (D-38); the API keeps checking it, so its secret goes in as below.

```sh
# Session signing: 32 random bytes, different in production and preview.
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET --env preview
pnpm --filter @paddock/api exec wrangler secret put TURNSTILE_SECRET
pnpm --filter @paddock/api exec wrangler secret put TURNSTILE_SECRET --env preview
```

No secret goes into `vars` or into the repository (security.md §11). Local values live in `workers/api/.dev.vars`, which is not committed.

## 4. Preview

- [x] The preview web app is `https://paddock-web-preview.marcmendezb.workers.dev`; the preview API has no public host (D-38).
- [ ] Protect the preview host with **Cloudflare Access** (free Zero Trust plan), with your login. Create a service token for Playwright and Lighthouse. Only pull requests deploy to preview.

## 5. First deploy and data

```sh
pnpm --filter @paddock/api exec wrangler deploy
pnpm --filter @paddock/ingest exec wrangler deploy
pnpm --filter @paddock/web run deploy
```

- [ ] Trigger the daily cron by hand from the Workers dashboard (`paddock-ingest` → Triggers → Cron), or wait for it. **The site is not published without the season in D1 (D-05).**
- [ ] The history (`BACKFILL`) advances on its own, one season per 15-minute cron: about 33 hours (D-11).
- [ ] Check `https://paddock-web.marcmendezb.workers.dev/api/v1/health` and the home page.

## 6. Before announcing the site

- [ ] Turn on Cloudflare Web Analytics for the site (cookieless, security.md §17).
- [ ] Set `CSP_REPORT_ONLY` to `"false"` in `apps/web/wrangler.jsonc` (security.md §4.1).

## 7. GitHub Actions

In the repository, **Settings → Secrets and variables → Actions**:

| Type | Name | Value | State |
|---|---|---|---|
| Secret | `CLOUDFLARE_ACCOUNT_ID` | The account ID | Set |
| Secret (`production` environment) | `CLOUDFLARE_API_TOKEN` | A custom token limited to this account: *Workers Scripts*, *D1*, *Workers KV Storage*, *Workers R2 Storage* (Edit) and *Account Settings* (Read) | Pending |
| Secret | `CLOUDFLARE_API_TOKEN_PREVIEW` | The same token, or one for the preview resources only | Pending |
| Secret (`backup` environment) | `CLOUDFLARE_API_TOKEN_BACKUP` | Production D1 (read and export) and `paddock-backups` (write) | Pending |
| Secret | `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | The Access service token from step 4 | Pending |
| Variable | `SITE_URL` | `https://paddock-web.marcmendezb.workers.dev` | Set |
| Variable | `PREVIEW_URL` | `https://paddock-web-preview.marcmendezb.workers.dev` | Set |
| Variable | `CLOUDFLARE_READY` | `true`, **last of all**: it turns on preview, deploy and the weekly backup | Pending |

Paste tokens with `gh secret set NAME [--env ENV]`, which prompts for the value: it never goes into a file or the shell history.

- [x] `production`, `preview` and `backup` environments.
- [ ] Manual approval on `production` (security.md §13). On a private repository it needs a paid GitHub plan.
- [ ] Protect `main`: required green checks and PRs instead of direct pushes, once you stop working alone.
- [ ] Install the **Renovate** app on the repository: `renovate.json` already respects D-19's 14 days.
- [ ] CodeQL only runs if the repository is public: on a private one it requires GitHub Advanced Security.
- [x] Workers Builds is not used (D-38): deploys come only from `deploy.yml`.

## 8. Final checks

- [ ] Lighthouse CI on the first PR (TRA-40, TRA-41).
- [ ] Google's Rich Results Test with a Grand Prix page, an explainer and a glossary entry (CON-08).
- [ ] The newsletter and sign-in forms show the portfolio notice, with and without JavaScript, and nothing reaches the API (D-33, D-38).
