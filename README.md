# Paddock Notes

Formula 1 explained with data: calendar and results, history since 1950, technical analysis for every race, and explainers to understand what happens on track. A personal and **unofficial** project, without any affiliation with Formula 1, the FIA, or any team.

Everything runs on Cloudflare: a Next.js web application, our own public API, and an ingestion Worker that loads data from Jolpica F1 and OpenF1 into D1 and R2. Full documentation (decisions, security, content, brand) is in [docs/](docs/README.md); what is built, in [docs/status.md](docs/status.md).

## What's included

- **Season:** Next Grand Prix with countdown and times in your local zone, results, standings, title contenders, and circuit map.
- **History:** Every season since 1950, driver, team, and circuit profiles, records, head-to-head, and points recalculated under the modern system.
- **Technical zone** (since 2023): Strategy, lap pace, sectors, compared telemetry, and lap-by-lap race replay with automated notes.
- **Learn:** Explainers, a guide to understand a race in 10 minutes, and a glossary.
- **Community:** Passwordless accounts, predictions, private leagues, weekly quiz, championship simulator, favourites, notifications, and newsletter.

## Architecture

| Folder | What it is |
|---|---|
| `apps/web` | Next.js 16 + React 19 with OpenNext → Worker `paddock-web`. Per-request HTML with nonce-based CSP |
| `workers/api` | Public API `/api/v1` (Hono + OpenAPI) and community routes (Better Auth) → Worker `paddock-api` |
| `workers/ingest` | Cron Triggers, Workflows (history backfill, post-race analysis, mailings), and outbound rate limiter in a Durable Object → Worker `paddock-ingest` |
| `packages/shared` | Contract types, Zod schemas, source normalisation, email templates |
| `packages/db` | Drizzle schema, D1 migrations, and separate read/write modules (D-14) |
| `packages/analysis` | Pure TypeScript technical zone calculations |
| `e2e/` | Playwright + axe on desktop, mobile, and dark mode |
| `fixtures/` | Real responses from Jolpica and OpenF1 for tests |

## Local development

Requirements: Node 22 or higher and pnpm 10.

```sh
pnpm install
pnpm --filter @paddock/web build:worker
scripts/local-stack.sh --seed   # API :8787, ingest :8788, and web :8789, with a shared local D1 and active crons
```

`--seed` loads the current season from Jolpica. Open http://localhost:8789/en.

For community features, `workers/api/.dev.vars` is required (not committed to the repository), with development secrets and Turnstile test keys:

```sh
AUTH_SECRET=<32 bytes in hex>
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
AUTH_BASE_URL=http://localhost:8789
TRUSTED_ORIGINS=http://localhost:8789,http://localhost:8787
SITE_URL=http://localhost:8789
```

Locally, emails (magic link, newsletter, notifications) are not dispatched: they are saved as plain text in `workers/*/.wrangler/tmp/email/`.

## Quality checks

```sh
pnpm lint                         # includes rule D-14: API and web cannot import the write module
pnpm typecheck
pnpm test                         # Worker tests run in workerd with local D1
pnpm --filter @paddock/e2e e2e    # against the local stack
pnpm audit --audit-level high
```

GitHub CI runs the same checks on every push and PR, plus gitleaks. The Cloudflare deployment guide is in [docs/setup.md](docs/setup.md).

## Licences

- Code: [MIT](LICENSE).
- F1 Data: Jolpica F1 and OpenF1, under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Derived data is published under the same licence (D-12).
- Map outlines: Natural Earth, public domain.
- Archivo Font: SIL Open Font License (`apps/web/public/fonts/OFL.txt`).
