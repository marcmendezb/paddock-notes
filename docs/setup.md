# Paddock Notes: going live on Cloudflare

> A checklist to go from the repository to the published site. Follow the order: each step leaves what the next one needs. It summarises and makes concrete [stack.md §17](stack.md#17-setup-recommended-order).
> Until step 9, GitHub only runs the checks (lint, types, tests, build and gitleaks). Preview, deploy and backup wait for the `CLOUDFLARE_READY` variable.

## 1. Accounts

- [ ] A Cloudflare account with 2FA (security key or passkey). The **Workers Paid** plan: Workflows, Email Service and the CPU limits require it (stack.md §14).
- [ ] The `paddocknotes.dev` domain on Cloudflare Registrar, with DNSSEC (D-20). If you choose another one, replace `paddocknotes.dev` in the three `wrangler.jsonc` files, in `SITE_URL` and in `EMAIL_FROM`.
- [ ] On GitHub: 2FA, secret scanning with push protection and Dependabot alerts turned on (Settings → Code security).

## 2. Resources (EU jurisdiction)

From the repository root, after `pnpm exec wrangler login`:

```sh
pnpm exec wrangler d1 create paddock-db --jurisdiction eu
pnpm exec wrangler d1 create paddock-db-preview --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-analysis --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-analysis-preview --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-backups --jurisdiction eu
pnpm exec wrangler kv namespace create CACHE
pnpm exec wrangler kv namespace create CACHE_PREVIEW
```

- [ ] Copy the `database_id` values into `workers/api/wrangler.jsonc` and `workers/ingest/wrangler.jsonc`: today they hold zeros (`00000000-…-000000000000` for production and `…-000000000001` for preview).
- [ ] Copy the KV `id` values into `workers/api/wrangler.jsonc`: they hold zeros too.
- [ ] On `paddock-backups`, a lifecycle rule that deletes objects after 90 days (D-15).

## 3. Email Service

- [ ] Add `paddocknotes.dev` as a sending domain in Email Service and publish the SPF, DKIM and DMARC records it gives you.
- [ ] Check that `hola@paddocknotes.dev` can send. If you use another address, change `EMAIL_FROM` in `workers/api` and `workers/ingest`.
- [ ] `MAIL_POSTAL_ADDRESS` in `workers/ingest/wrangler.jsonc`: the controller's postal address for the newsletter footer (content.md §5.5). Left empty, it is not shown.

## 4. Turnstile

- [ ] Create a widget in *Managed* mode for `paddocknotes.dev` (and another one for the preview host).
- [ ] **Site key:** replace `TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc`. Today it holds Cloudflare's test key (`1x00000000000000000000AA`), which lets anyone through.
- [ ] **Secret key:** `pnpm --filter @paddock/api exec wrangler secret put TURNSTILE_SECRET` (and again with `--env preview`).

## 5. Worker secrets

```sh
# Session signing: 32 random bytes, different in production and preview.
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET --env preview
```

No secret goes into `vars` or into the repository (security.md §11). Local values live in `workers/api/.dev.vars`, which is not committed.

## 6. Preview URLs

The preview Workers live on `workers.dev` under your account's subdomain (`<subdomain>.workers.dev`).

- [ ] Replace `https://paddock-web-preview.workers.dev` with the real URL (`https://paddock-web-preview.<subdomain>.workers.dev`) in `apps/web/wrangler.jsonc` (`SITE_URL`) and in `workers/api/wrangler.jsonc` (`SITE_URL`, `AUTH_BASE_URL`, `TRUSTED_ORIGINS`).
- [ ] Protect both preview hosts with **Cloudflare Access** (free Zero Trust plan), with your login. Create a service token for Playwright and Lighthouse.

## 7. Data

```sh
cd workers/api && pnpm exec wrangler d1 migrations apply paddock-db --remote && cd ../..
pnpm --filter @paddock/ingest exec wrangler deploy
```

- [ ] Wait for the daily cron to load the current season, or trigger it by hand from the Workers dashboard (Triggers → Cron). **The site is not published without the season in D1 (D-05).**
- [ ] The history (`BACKFILL`) advances on its own, one season per 15-minute cron: about 33 hours (D-11).

## 8. Web app and API

```sh
pnpm --filter @paddock/api exec wrangler deploy
pnpm --filter @paddock/web run deploy
```

- [ ] Check `https://paddocknotes.dev/api/v1/health` and the home page.
- [ ] Turn on Cloudflare Web Analytics for the domain (cookieless, security.md §17).
- [ ] Before announcing the site: set `CSP_REPORT_ONLY` to `"false"` in `apps/web/wrangler.jsonc` (security.md §4.1).

## 9. GitHub Actions

In the repository, **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_ACCOUNT_ID` | The account ID |
| Secret (`production` environment) | `CLOUDFLARE_API_TOKEN` | A token with *Workers Scripts: Edit*, *D1: Edit* and the zone, limited to this account |
| Secret | `CLOUDFLARE_API_TOKEN_PREVIEW` | The same token, but only for the preview resources |
| Secret (`backup` environment) | `CLOUDFLARE_API_TOKEN_BACKUP` | Production D1 only (read and export) and write access to `paddock-backups` |
| Secret | `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | The Access service token from step 6 |
| Variable | `SITE_URL` | `https://paddocknotes.dev` |
| Variable | `PREVIEW_URL` | The real URL of `paddock-web-preview` |
| Variable | `CLOUDFLARE_READY` | `true`, **last of all**: it turns on preview, deploy and the weekly backup |

- [ ] A `production` environment with manual approval by the author (security.md §13).
- [ ] Protect `main`: required green checks and PRs instead of direct pushes, once you stop working alone.
- [ ] Install the **Renovate** app on the repository: `renovate.json` already respects D-19's 14 days.
- [ ] CodeQL only runs if the repository is public: on a private one it requires GitHub Advanced Security.

## 10. Final checks

- [ ] Lighthouse CI on the first PR (TRA-40, TRA-41).
- [ ] Google's Rich Results Test with a Grand Prix page, an explainer and a glossary entry (CON-08).
- [ ] A full community cycle in production: magic link, prediction, league, newsletter sign-up, confirmation and one-click unsubscribe from a real mail client.
