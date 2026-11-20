# Paddock Notes

Unofficial web app that explains F1 with data. pnpm monorepo, entirely TypeScript and deployed on Cloudflare.

## Source of truth

- `docs/` is the authority. Before changing anything, read the decision that covers it in `docs/decisions.md` (`D-xx`).
- If you change a decision, do not delete it: mark it as superseded and add a new one.
- Features by ID in `docs/features.md` (e.g. `NUC-03`). Use them in commits and tests.
- What is done and what is pending: `docs/status.md`. Update it when finishing each feature.
- Visual rules in `docs/brand.md` and `DESIGN.md`; tokens in `apps/web/app/globals.css`, copied from the brandboard without changes. Product, users and voice in `PRODUCT.md`.
- The repository is in English (code, comments, docs, tests, commits); the product stays trilingual (D-36).

## Non-negotiable rules

- **D-05:** Only `workers/ingest` calls Jolpica and OpenF1, always through `fetchJson` (closed host whitelist, rate limiter, Zod).
- **D-14:** The API and web never import `@paddock/db/f1-write`. Enforced by ESLint and `packages/db/test/architecture.test.ts`.
- **D-04:** All HTML is rendered per request with nonce-based CSP (`apps/web/middleware.ts`). No inline `style=""`, no `dangerouslySetInnerHTML`, no third-party scripts unjustified in `docs/security.md` §4.1.
- **D-19:** pnpm does not install versions released under 14 days ago (`pnpm-workspace.yaml`).
- All external data is hostile: validate with Zod before writing to D1.
- Interface copy is kept separately in ES, EN, and DE (`apps/web/lib/i18n.ts`, D-29); brand voice is in `docs/content.md` §2.

## Commands

```sh
pnpm check                              # lint + typecheck + unit tests, what CI runs
pnpm db:generate                        # after changing packages/db/src/schema.ts
pnpm --filter @paddock/web build:worker # OpenNext build
scripts/local-stack.sh [--seed]         # full local stack on :8787, :8788 and :8789, with ingest crons
pnpm --filter @paddock/e2e e2e          # Playwright + axe against the local stack
```

Full local development guide: see `README.md`.

## Known pitfalls

- In Drizzle selects, never use `constructor` as a field key: it collides with `Object.prototype.constructor`.
- Responses served from the Cache API have immutable headers: clone them (`new Response(res.body, res)`) before mutating.
- `@cloudflare/vitest-pool-workers` is now `@cloudflare/vitest-plugin` (`cloudflareTest()` in `vitest.config.ts`).
- `middleware.ts` and not `proxy.ts`: OpenNext only stably supports edge middleware (D-03).
- No page-level `loading.tsx`: it breaks genuine 404s and no-JavaScript content (D-22).
- A title or championship finish is only valid if the season is complete (`COMPLETE_DRIVERS` in f1-history): during backfill there are half-loaded seasons.
- Locally, changing code or `wrangler.jsonc` of ingest reloads the Worker and drops in-flight Workflow instances: restart `backfill:instance` / `analysis:instance` in `ingest_state`.
- `wrangler dev` rewrites the host and Origin to the `routes` domain: local web is booted with `--local-upstream localhost:8789` (already in `scripts/local-stack.sh`), or CSRF protection rejects form submissions.
- Over Service Binding, the Origin header cannot be forwarded (it is forbidden in fetch): the web sends `x-paddock-origin`, which the API accepts only for internal requests (without CF-Connecting-IP).
- Email links go to `/api/*` on the web host, which proxies to the API (D-26). Locally, `AUTH_BASE_URL=http://localhost:8789` in `workers/api/.dev.vars`.
- OpenF1 returns 401 to all requests, including historical ones, during a live F1 session (D-25): this is upstream behaviour, not a bug on our end.
- Never add co-authorship or attribution lines to Claude in commits or PRs.
- Browser tests also run in dark mode: verify contrast for any new colour in both light and dark themes.
