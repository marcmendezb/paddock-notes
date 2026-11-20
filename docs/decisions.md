# Paddock Notes: decision log

> Every decision has a stable ID (`D-xx`), its context, what was decided and what was ruled out. A decision is never deleted when it changes: it is marked as superseded and a new one is added.
> Last reviewed: 19 November 2026. Sources at the end.

## Summary

| ID | Decision | Status |
|---|---|---|
| D-01 | Built from scratch in a pnpm monorepo | Current |
| D-02 | Everything on Cloudflare, on the Workers Paid plan | Current |
| D-03 | Next.js 16 with OpenNext (vinext ruled out after testing) | Current |
| D-04 | HTML rendered per request with a nonce-based CSP; caching lives in the data layer | Current |
| D-05 | The API never calls external sources | Current |
| D-06 | Error contract and "stale data" semantics | Current |
| D-07 | CORS open for public reads, closed for community features | Current |
| D-08 | Phase 3 without FastF1: OpenF1 and TypeScript analysis | Current |
| D-09 | Circuit layouts: OpenF1, falling back to MIT-licensed GeoJSON | Current |
| D-10 | Outbound rate limiter in a Durable Object per source | Current |
| D-11 | Historical backfill with a Workflow over the Jolpica API | Current |
| D-12 | Licensing: data CC BY-NC-SA 4.0, code MIT, non-commercial project | Current |
| D-13 | Data in the EU jurisdiction (D1 and R2) from day one | Current |
| D-14 | Read/write separation in D1 by code, not by binding | Current |
| D-15 | Backups: Time Travel plus a weekly export from GitHub Actions | Current |
| D-16 | Email with Cloudflare Email Service; own newsletter on D1 | Current, see D-33 |
| D-17 | Authentication with Better Auth and the Drizzle adapter | Current |
| D-18 | Environments: preview with its own Workers, behind Access | Current |
| D-19 | Supply chain: only versions at least 14 days old | Current |
| D-20 | Domain `paddocknotes.dev` | Proposed (not yet bought) |
| D-21 | 2026 regulations in the content | Current |
| D-22 | No page-level `loading.tsx`: real 404s and content without JavaScript | Current |
| D-23 | Community: authentication behind the web app | Current |
| D-24 | Mailings: newsletter and notifications | Current, see D-33 |
| D-25 | OpenF1 closes during live sessions | Current |
| D-26 | The web app also serves `/api/*` | Current |
| D-27 | Header, hero and motion | Current, partly superseded by D-33 |
| D-28 | Home sections, focus and status colours | Current |
| D-29 | German as a third language | Current |
| D-30 | Circuit page, anchors and intro animation | Current |
| D-31 | Provisional result from OpenF1 | Current |
| D-32 | Shared header and building blocks for section pages | Current |
| D-33 | Demo newsletter, video without pause, hover language switcher | Current |
| D-34 | Records hidden, data coverage shown | Current, partly superseded by D-35 |
| D-35 | No History section: head to head for the current season | Current |
| D-36 | Language by country; repository in English | Current |

---

## D-01 · Built from scratch in a pnpm monorepo

**Context:** earlier planning documents assumed an existing skeleton (a FastAPI backend and a Next.js 15 frontend). That code never existed.

**Decision:** the project starts from scratch, TypeScript only, in the monorepo described in `stack.md` §15. All logic (Jolpica normalisation, rate limiter, error contract) is written directly in TypeScript, with tests from the first commit.

**Consequence:** Python leaves the project (see D-08).

## D-02 · Everything on Cloudflare, on Workers Paid

**Decision:** web, API, ingestion, database, files, scheduled jobs, email and analytics all on Cloudflare. Workers Paid plan (USD 5/month).

**Why:** one provider, one language and a predictable cost. The free plan caps CPU at 10 ms per invocation, too little to render Next.js, and does not include Email Service.

## D-03 · Next.js 16 with vinext; OpenNext as plan B

**Decision:** Next.js 16 + React 19 deployed with **vinext**, the route Cloudflare recommends for new projects and the one Wrangler sets up by default.

**How the two compatibility questions are solved:**

| Piece | With vinext | With OpenNext |
|---|---|---|
| MDX | `@mdx-js/rollup` as a Vite plugin, placed **before** `vinext()` in `vite.config.ts` | `@next/mdx` |
| OG images | `next/og` loaded with a dynamic `import()` inside the handler (a top-level import fails on Workers when loading the font); response cached as immutable | native `next/og` |

**Check at kickoff (first week):** if `npx vinext check` reports blockers in the App Router, language middleware, metadata, MDX or OG, switch to OpenNext and record it here. If `next/og` fails in both, images are generated in the post-race Workflow with Satori + resvg-wasm and stored in R2.

**Result of the check (5 November 2026): OpenNext is adopted.** Reasons:

1. vinext's documentation does not say whether it applies the CSP nonce to its scripts, and D-04 depends on it. OpenNext runs real Next.js, which reads the nonce from the `Content-Security-Policy` header set by the middleware.
2. vinext no longer generates `wrangler.jsonc`: it uses a `cloudflare.config.ts` and a new CLI (`cf`), different from the other two Workers, and does not document generic Service Bindings (D-05 needs them).
3. OpenNext is the stable route and supports Next.js 16.

Package: `@opennextjs/cloudflare`, at the newest version that satisfies D-19 and its `next` range. MDX with `@next/mdx`; OG with `next/og`. vinext will be reviewed when it leaves beta.

**`middleware.ts` instead of `proxy.ts`:** Next.js 16 renames middleware to `proxy.ts`, which runs on the Node runtime. OpenNext 1.20 supports it, but marks it experimental and officially unmaintained. The project uses `middleware.ts` (edge runtime), which OpenNext supports as stable; Next.js only warns that the convention is deprecated. It will move to `proxy.ts` once OpenNext declares it stable.

## D-04 · Per-request rendering with a nonce-based CSP

**Context:** Next.js can only apply a strict nonce-based CSP if the page is rendered on every request; with a nonce, static generation and ISR are disabled. The hash-based alternative (SRI) is experimental, only works with webpack (Next.js 16 defaults to Turbopack) and does not cover RSC inline scripts.

**Decision:** every HTML page is rendered per request with a strict nonce-based CSP, no exceptions. **Caching moves to the data layer:**

- The web app fetches data from the API over a Service Binding; the API answers from the Cache API or KV (TTL per resource, see `apis.md` §6).
- Static assets (JS, CSS, fonts, SVG) are served with immutable caching from Static Assets.
- MDX is compiled at build time; rendering it per request costs a few milliseconds.

**Ruled out:** ISR with `'unsafe-inline'` (it voids the XSS protection) and a report-only CSP (it protects nothing).

**Cost:** a few ms of CPU per visit, well inside the 30 million ms included per month. Lighthouse CI watches the performance risk (TRA-40, TRA-41); if mobile LCP goes above 2.5 s, this decision is revisited.

## D-05 · The API never calls external sources

**Context:** the earlier plan let the API query Jolpica during the MVP before the database was loaded, which contradicted the architecture principle.

**Decision:** only `paddock-ingest` talks to Jolpica and OpenF1. Launch requires the current season to be loaded in D1 (setup step in `stack.md` §17). If a resource is not in the database yet, the API answers 404 with a "no data yet" state.

## D-06 · Error contract and stale data

Since the API no longer depends on external sources at request time, 502 disappears and 503 changes meaning:

| Code | When |
|---|---|
| 400 | Invalid path or query parameter, or invalid body (phase 4) |
| 404 | Resource does not exist or has no data yet |
| 405 | Method not allowed on that route |
| 429 | Inbound rate limit exceeded (with `Retry-After`) |
| 500 | Unexpected internal error |
| 503 | D1 is down or times out, with no cached copy (with `Retry-After`) |

Format: `{ "error": { "code": "not_found", "message": "..." } }`.

**`X-Data-Stale: true`** is sent when:

1. D1 fails and the API serves the last cached copy, or
2. the data is older than expected: for example, the race ended more than 6 hours ago and ingestion has not stored the result yet.

Every response includes `updated_at` (the last successful ingestion of that resource).

## D-07 · CORS

**Context:** `stack.md` restricted CORS to the project's own origins while `security.md` opened it for the public API.

**Decision:** read `GET`s answer with `Access-Control-Allow-Origin: *` and no credentials: it is a public, documented API. Community routes (phase 4) only accept the site's own origin, with credentials and an `Origin` check.

## D-08 · Phase 3 without FastF1

**Context:** since October 2026, Formula 1 requires authentication on its data APIs. FastF1 3.9.0 (24 October 2026) requires an F1TV account for most of its data. Using a personal subscription to automate a public service is neither viable nor defensible.

**Decision:**

- The technical zone uses **OpenF1**, whose history since 2023 remains free and unauthenticated: `laps`, `stints`, `pit`, `position`, `race_control`, `weather`, plus `car_data` and `location` **filtered** by session, driver and the time window of a single lap.
- The analysis (stints, pace, reduced telemetry, delta, mini-sectors, lap-by-lap positions) is written in **TypeScript** in `packages/analysis` and runs in the `POST_RACE` Workflow.
- **Python, FastF1 and Cloudflare Containers** are removed from the project.

**Advantages:** one language, no Container image to maintain and one less moving part to secure.

**Risk:** OpenF1 itself depends on F1's data. If it loses access, analyses already computed stay in R2, since they are kept forever. New races would have no technical zone until another source is found.

**Request cost per race:** about 50 requests to OpenF1 (fastest-lap telemetry for each driver plus 8 session endpoints). With our own limit of 25/min, roughly 2 minutes per race.

## D-09 · Circuit layouts

**Decision:**

1. Circuits raced since 2023: layout generated from OpenF1 `location` (one clean lap), simplified and stored as SVG in R2.
2. Circuits without data since 2023: layout from the `bacinger/f1-circuits` repository (GeoJSON, MIT licence), credited on the circuit page.
3. Annotated corners (NUC-44): a hand-written data file per circuit in `content/circuits/`. No more dependency on FastF1/MultiViewer corner data.

## D-10 · Outbound rate limiter

**Context:** the 15-minute cron and the Workflows (backfill, post-race) can run at the same time.

**Decision:** the counter lives in a **Durable Object** (`OUTBOUND_LIMITER`), one instance per host. Every outbound request asks the Durable Object for permission first.

| Source | Published limit | Our limit |
|---|---|---|
| Jolpica | 4/s burst, 500/h sustained (announced to go down) | 1/s and 400/h (300/h for the backfill), configurable |
| OpenF1 | 3/s and 30/min | 2/s and 25/min, configurable |

If a source answers 429, the limiter blocks that source for the `Retry-After` period (60 s if not sent) and the request is retried. If the wait exceeds 30 s, the job is deferred to the next cron run.

**Real-world test (5 November 2026):** loading the 2026 season (29 requests) at 3/s triggered a Jolpica 429 on request 28, even though we were under its published limit. Jolpica sent a short `Retry-After` and the retry worked. The per-second limit was lowered to 2.

**Second test (6 November 2026):** the backfill at 2/s still received the odd 429. Jolpica's real limit behaves like a bucket that refills more slowly than its documentation says. It was lowered to 1/s: throughput does not suffer, because the hourly cap is the one that binds (400/h, and 300/h for the backfill, to leave room for live ingestion).

## D-11 · Historical backfill

**Decision:** a `BACKFILL` Workflow over the Jolpica API, one season per step, pausing to respect the limit. It reuses the daily ingestion's normalisation code.

**Estimated volume:** about 13,000 requests (≈1,150 races; laps since 1996 need pagination). At 400/h, roughly 33 hours, once.

**Ruled out:** Jolpica's CSV dumps. They use a different schema, would require a second normalisation path and arrive 14 days late.

## D-12 · Licensing and non-commercial use

**Context:** Jolpica and OpenF1 data are published under **CC BY-NC-SA 4.0**, for non-commercial use only.

**Decision:**

- Paddock Notes is and will remain **non-commercial**: no ads, no payments, no affiliation (already out of scope).
- Derived data (API responses, analysis JSON, charts and images) is published under **CC BY-NC-SA 4.0**, crediting Jolpica F1 and OpenF1.
- API responses include `source` and `license` fields.
- The repository's code is published under **MIT**.
- Layouts from `bacinger/f1-circuits` (MIT) are credited on the circuit page and the About page.

## D-13 · Data in the EU

**Context:** a D1 database's jurisdiction cannot be changed after creation, and phase 4 brings personal data.

**Decision:** `paddock-db`, `paddock-db-preview` and the R2 buckets are created in the **`eu`** jurisdiction from the start. KV does not support jurisdictions, so it only holds cached copies of public data.

## D-14 · Read/write separation in D1

**Context:** D1 has no read-only bindings.

**Decision:** `packages/db` exports two modules:

- `f1-read`: only `select` queries on the F1 tables. The only one `paddock-api` may import.
- `f1-write`: idempotent inserts. Only `paddock-ingest` may import it.

A lint rule (`no-restricted-imports`) and an architecture test fail if the API imports the write module.

## D-15 · Backups

**Decision:**

1. D1 **Time Travel**: restore to any minute in the last 30 days.
2. **Weekly export** from a GitHub Actions workflow (`backup.yml`, Wednesdays at 03:00 UTC, when there are no F1 sessions): `wrangler d1 export --remote` uploaded to the `paddock-backups` bucket, with a lifecycle rule that deletes after 90 days.

**Why:** export is not available from a binding and blocks queries while it runs. With a database of a few tens of MB it takes seconds, in a slot without traffic. No Worker has access to the backup bucket.

## D-16 · Email and newsletter

**Decision:**

- **Cloudflare Email Service** (`send_email` binding) for magic links, notifications and the newsletter. Includes 3,000 emails a month on Workers Paid; USD 0.35 per 1,000 after that.
- **Own newsletter on D1:** subscribers, double opt-in, ES/EN lists and one-click unsubscribe (`List-Unsubscribe` and `List-Unsubscribe-Post` headers). Sending is done by a Workflow in batches of 40 per step (the binding allows 50 subrequests per invocation).
- **Plan B:** Resend, if Email Service (in beta) changes its terms.

**Why:** email stays with the same provider and no new data processor is added.

## D-17 · Authentication (phase 4)

**Decision:** Better Auth with `drizzleAdapter` over `drizzle-orm/d1`. The instance is created per request from the bindings. Migrations are generated with `drizzle-kit` and applied with `wrangler d1 migrations apply`, not with `better-auth migrate`. The version is pinned at the start of phase 4.

## D-18 · Preview environments

**Context:** a Worker version's preview URLs share the production bindings. If previews pointed at the production database, a PR could write to it.

**Decision:**

- A Wrangler `preview` environment with its own Workers (`paddock-web-preview`, `paddock-api-preview`, `paddock-ingest-preview`) and its own resources (`paddock-db-preview`, preview buckets).
- Every PR deploys to that environment; with a single author, the last PR deployed wins.
- The preview URLs and the `/status` page sit behind **Cloudflare Access** (free Zero Trust plan, up to 50 users). Playwright signs in with an Access service token.
- In production, `workers_dev: false` and `preview_urls: false`: only the custom domain exists.

## D-19 · Supply chain

**Decision:** pnpm 10 or later, pinned in `packageManager`, with `minimumReleaseAge: 20160` (14 days, in minutes) in `pnpm-workspace.yaml`. Renovate with `minimumReleaseAge: "14 days"`. Security patches are excluded by hand with `minimumReleaseAgeExclude` and reviewed in the PR.

## D-20 · Domain (proposal)

**Check (5 November 2026):** `paddocknotes.com` (registered in 2021) and `paddocknotes.net` (registered in April 2026) are taken. `paddocknotes.dev`, `.app`, `.io` and `.es` have no DNS records (NXDOMAIN), so they are probably available.

**Proposal:** `paddocknotes.dev`. It suits a developer portfolio, is HTTPS-only by design (the whole TLD is HSTS-preloaded) and Cloudflare Registrar sells it at cost. Purchase pending. Meanwhile the code reads the `SITE_URL` variable.

## D-21 · 2026 regulations in the content

**Facts verified for the content:**

- Since 2026 **DRS no longer exists**. It is replaced by **Overtake mode**: extra electrical energy for a car within one second of the car ahead, usable anywhere on the circuit. There is also **Boost**, which deploys the engine's and battery's full power.
- **The fastest lap no longer scores a point** since the 2025 season.

**Consequence:** explainer 12 and the glossary treat DRS as a historical system (2011 to 2025) and explain Overtake mode as the current one. Other regulatory points follow the editorial flow in `content.md` §13.

## D-22 · No page-level `loading.tsx`

**Context:** end-to-end tests exposed two problems with Next.js loading skeletons (`loading.tsx`). They open a Suspense boundary and the response starts streaming with a 200 status before the page decides it does not exist, so a `notFound()` answered 200 instead of 404. And without JavaScript, content streamed inside the Suspense boundary is never shown, which breaks TRA-34.

**Decision:** pages do not use `loading.tsx`. Data comes from the API over a Service Binding and from cache, in milliseconds. Parameters are validated in each segment's layout, so an invalid URL returns a real 404. Skeletons (TRA-30) are only used in components that load data on the client, such as the phase 3 charts (`components/skeleton.tsx`).

## D-23 · Community: authentication behind the web app

**Context:** phase 4 adds accounts. The web app talks to the API over a Service Binding (D-05), so the browser never reaches the API directly and the API sees neither the real `Origin` nor the user's IP. On top of that, `wrangler dev` rewrites the host and `Origin` to the production domain unless told otherwise.

**Decision:**

- **Better Auth** with a magic link (15 min, token stored as a hash) sent through Email Service, with Turnstile on the link request. No passwords and, for now, no external providers.
- **Cookie** `__Host-pn.session_token`: the `__Host-` prefix enforces `Secure`, `Path=/` and no `Domain`, and the web app sets the cookie on its own domain.
- **HTML forms** that post to `/[lang]/forms/[action]` (they work without JavaScript): the web app checks that the `Origin` matches its own (CSRF), calls the API and redirects (PRG).
- **Internal headers** `x-paddock-origin` and `x-paddock-client-ip`: the web app forwards them and the API only accepts them when the request has no `cf-connecting-ip`, that is, when it arrives over the Service Binding and not from the internet.
- **Locally**, the web app starts with `--local-upstream localhost:8789` so the `Origin` is the real one (`scripts/local-stack.sh`).
- **Retention:** the weekly ingestion cron warns accounts inactive for 24 months and deletes them 30 days later if they do not come back (`security.md` §17). Ingestion uses the `community` module only for that; its F1 writes still go through `f1-write` (D-14).

**Consequence:** the community API is not exposed with open CORS (D-07) and no session data is readable from JavaScript. An OAuth provider would be added as another Better Auth plugin without touching this flow.

## D-24 · Mailings: newsletter and notifications

**Context:** D-16 settles on Email Service and an own newsletter on D1. What was missing: who writes each issue, how it is triggered, and how one-click unsubscribe works, which the mail client performs without a browser.

**Decision:**

- **Content generated from the data:** the newsletter is composed by ingestion from D1 following `content.md` §5.5: the race in five lines, the strategy chart, a "this week in history" fact, the explainer suggested for the next GP (NUC-09) and the next race with the list's time zone (Madrid or London). Editorial notes (CON-04) can replace the first section when they exist.
- **A single `MAILING` Workflow** for the newsletter, GP notifications and analysis notifications. It first composes the content, language-independent; then it sends batches of 40, one step per batch. It is triggered once per mailing: instance id `type-season-round` and a `mail:` marker in `ingest_state`.
- **When it sends:** the newsletter on Tuesday at 08:00 UTC if there was a race in the last 7 days; the GP notification when the first session starts in under 48 h; the analysis notification when `POST_RACE` finishes, and only if the race is less than 7 days old, so old races analysed during the backfill do not trigger it.
- **One-click unsubscribe (RFC 8058):** `POST /api/v1/email/unsubscribe/{token}`, without an Origin check. The mail provider sends neither Origin nor cookies, and the token can only unsubscribe. It goes through the write limit. The footer link leads to a page with a button.
- **Confirming and unsubscribing require pressing a button:** mail servers' link scanners open URLs, and if opening one were enough, they would confirm or unsubscribe on the user's behalf.
- **Turnstile on sign-up**, loaded on the home page only when the visitor touches the form, so it does not weigh on page load.

**Consequence:** no third-party sending tool and no newsletter editor. Off-season nothing goes out until editorial content exists (the fortnightly edition in `content.md` §12 is pending). If a batch fails halfway, the retry may repeat an email from that batch, never from earlier ones.

## D-25 · OpenF1 closes during live sessions

**Context:** on 6 November 2026, during a session of the Brazilian GP, OpenF1 answered 401 to historical requests: "Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends". An analysis that coincided with a session failed, and `advanceAnalysis` marked it as failed forever.

**Decision:**

- `advanceAnalysis` starts no analysis if, according to the loaded calendar, a session is live, ended less than 45 minutes ago (margin for delays and red flags) or starts in less than an hour (OpenF1 closes 30 minutes before).
- `fetchJson` turns that specific OpenF1 401 into a `LiveSessionError` (a deferral, not an error) and pauses the OpenF1 limiter for 15 minutes.
- `POST_RACE` steps retry 30 times, every 5 minutes: two and a half hours, longer than a session with interruptions.

**Consequence:** a race's analysis may be delayed by a few hours if the next weekend starts right away, but it is never lost. Still no paid key (D-08).

## D-26 · The web app also serves `/api/*`

**Context:** links in emails (magic link and one-click unsubscribe) point to `{SITE_URL}/api/v1/...`. In production, the domain's `paddocknotes.dev/api/*` route leads to the API Worker and the session cookie lands on the web app's host. In preview, the web app and the API are different `workers.dev` hosts: those links returned 404 and the cookie would have landed on the wrong host. It only worked locally because cookies do not distinguish ports.

**Decision:** the web app has an `/api/[...path]` route that forwards to the API over the Service Binding. It drops every `x-paddock-*` and `cf-*` header coming from the browser, forwards only the `__Host-pn.*` cookies and sets the real origin itself (`x-paddock-origin`, for the CSRF check) and the visitor's IP (`x-paddock-client-ip` for the write limit and `x-paddock-proxy-ip` for the read limit, which the API only accepts on internal requests). `AUTH_BASE_URL` is always the web app's origin, locally too (`http://localhost:8789`).

**Consequence:** the same flow works locally, in preview and in production. In production the proxy is not used, because the domain route takes precedence.

## D-27 · Header, hero and motion

**Context:** a redesign of the header and the home hero, requested by the author, so the site makes a first impression that matches its content.

**Decision:**

- **Pit-wall header.** At the top, a timing strip that scrolls continuously: it starts with what is live or the next event and alternates events and facts (sessions left, upcoming GPs, leaders, last winner, fastest lap, biggest climb, analysis, note and an anniversary). It recomputes every 30 s and refreshes its data every 10 minutes. Below it, a floating bar with the logomark (only the mark; the name is in the accessible label), the sections with a lime block that slides under the one pointed at, and a panel with real data per section. On mobile, a full-screen menu built on `<details>`, which works without JavaScript.
- **Hero.** An original background video, filmed from the grandstand, in black and white, silent and cropped so no brand appears; it weighs 700 kB (desktop) or 400 kB (mobile), loads once the page has loaded and fades in when it can play without stalling. It is served through `/media`, which answers range requests (HTTP 206), because Workers static assets do not and Safari on iPhone needs them. On top, the next circuit's layout coloured by speed, with a lime square lapping it at the real pace of the fastest lap, the countdown as a dimension line and the weekend as a calendar.
- **Motion.** Smooth scrolling with Lenis; a choreographed hero entrance and scroll-linked CSS animations (`animation-timeline`), only `transform` and `opacity`, with exponential easing. Everything turns off with "reduce motion". Browser tests run with reduced motion: they check the page at rest.

**Conscious exception to WCAG 2.2.2 (Pause, Stop, Hide, level A).** The author decided the timing strip cannot be paused. The only remaining mechanism is the system "reduce motion" preference, under which it stays still. It is an accepted and documented gap in TRA-20; restoring the pause button in the `TimingStrip` component would bring it back into compliance. (The hero video's pause button was removed later, see D-33.)

**Consequence:** the CSP adds `media-src 'self'`. The header makes seven API queries per page, all cached in the data layer and fault-tolerant: if the API does not answer, the navigation still renders.

## D-28 · Home sections, focus and status colours

**Context:** the second round of the redesign, requested by the author: last race, standings and newsletter, plus visual rules for the whole site.

**Decision:**

- **Status colours.** "Next" is always lilac (accent 2) and "live" always lime (accent 1): in the timing strip (the fixed lead on the left, a solid colour block with black text, completing D-27), in the weekend calendar and in the strip's countdowns.
- **Last race.** A light band (the brand grey) opened by a chequered finish strip, with the race's circuit in the background (a smooth curve and a lilac circle lapping it). The winner and the note sit in black blocks; the positions chart in a card with a legend and four figures underneath. The finish line shows positions gained or lost (+4, −1).
- **Standings as a title fight.** A black band with one lane per driver (and per team): points, what they can still score, the leader's points and the maximum possible. The headline comes from the NUC-36 calculation ("X, world champion", "Down to two", "N drivers can still be champion"). Teams score at most a first and a second place per round.
- **A newsletter that shows itself.** Next to the form, a sample issue made with the last race (note, top five, the winner's position line and the next race in Madrid or London time), labelled as a sample.
- **Animated pictograms.** Each pictogram has a moving part (needle, flag, clock hands…) on hover of its link or button and, in marked blocks, when it enters the viewport. Still with "reduce motion".
- **Focus without a ring.** The author does not want focus rings. Keyboard focus is still visible (WCAG 2.4.7): links underline in the focus colour, controls take a subtle background and the logo turns lilac.
- **No one-sided rules** in colour or heavier weight (`brand.md` §3): blocks are emphasised with a background, a full border or a pictogram.
- **Footer.** Always black. On the left, the large logomark: a lilac light laps it continuously along a curved, cornerless line, with a trail inside the letters; the lime dot does not move (it is never deformed) and breathes when the light comes back. It tilts in 3D towards the cursor. Below it, the tagline and the newsletter. On the right, the season race by race and the navigation. The legal line is small, at AA's minimum contrast.
- **Page transition.** A two-layer curtain (lime and lilac, alternating which goes in front) that rises from the bottom the instant a link is clicked, covers the screen while the new page loads and keeps rising to reveal it. It is a custom component (`RouteCurtain`), not the View Transitions API: that only animates once the new page has loaded, and the click felt unresponsive. Without JavaScript or with "reduce motion", normal navigation.
- **Header.** Black and full width on every page, the home page included. The active page and hover are set in italics. The "Races" panel is a wide panel with the next GP (sessions in the visitor's time), the season around today and the last race.
- **Scroll.** Lenis with more inertia and no elastic bounce at the edges.
- **Newsletter.** A required consent checkbox linking to the privacy policy, also enforced by the API.

**Consequence:** the home page also requests the season calendar and the layout of the last race's circuit; both queries are fault-tolerant and, without them, the sections render without that piece.

## D-29 · German as a third language

**Context:** the author wants the whole site in German too, selectable.

**Decision:**

- `LANGS` becomes `es`, `en` and `de`. `/de/…` routes, `hreflang` on every page and in the sitemap, and `Accept-Language` negotiation.
- Everything is written in German separately, never machine-translated at runtime: the UI dictionary, the 13 explainers, the circuit guides, the race notes, the glossary, the text pages, the corner notes, Grand Prix names ("Großer Preis von Brasilien") and the emails (newsletter, notifications, sign-in link and deletion notice). Informal address (du), as in Spanish.
- Dates and numbers with `de-DE`; the German newsletter list uses Berlin time.
- The language switcher shows all three (ES · EN · DE, with the full name as the accessible label) and keeps the current page.

**Consequence:** every new UI or content string is written in all three languages; TypeScript enforces it (`Record<Lang, …>`). Browser tests include German pages. Language negotiation for unprefixed URLs was replaced by D-36.

## D-30 · Circuit page, anchors and intro animation

**Context:** the circuit page read like a list (a world map in a card, a black layout and a table), and the race and circuit sub-navigation scrolled to the wrong section.

**Decision:**

- **Circuit page:**
  - **The fastest lap in real time** in the hero: the layout coloured by each stretch's speed and the lime square lapping it with the telemetry's timings, alongside a speedometer, a lap timer and a progress bar. It moves with `requestAnimationFrame` and SVG attributes; it can be paused (WCAG 2.2.2), stops off screen and does not start on its own with reduced motion.
  - **"The lap"**, in a black band: lap figures, the speed trace metre by metre with two notes (top speed and the slowest braking zone) and one card per braking zone with its editorial note. It replaces the braking table.
  - **"Where it is"**: an orthographic globe rotated towards the circuit, with the current night shading (sun position approximated to one degree), the local time and the offset from the visitor's.
  - **Roll of honour**: a ranking of drivers and teams (from four Grands Prix on) and every winner, year by year.
  - Without telemetry, the hero uses the bacinger/f1-circuits layout (MIT) and the page omits "The lap".
- **Anchors:** handled by `SmoothScroll`, not Lenis. Lenis did not cancel the native jump, subtracted the offset twice and measured through the entrance animations' transforms.
  - The position is computed with `offsetTop`, minus the header and the sub-navigation.
  - Without JavaScript, `scroll-margin-top` puts the heading in the same place.
  - The clicked tab stays marked until the user scrolls by hand again.
  - Checked in Chromium, WebKit and Firefox.
- **Intro animation:** once per browser session (`sessionStorage`). Reloading or navigating does not repeat it, so readers are not kept waiting.

**Consequence:** `topojson-client` and `world-atlas` become runtime dependencies of the web app. Safari applies `upgrade-insecure-requests` to `http://localhost` too, so testing WebKit locally means stripping that directive from the CSP in the test (no effect in production, over HTTPS).

## D-31 · Provisional result from OpenF1

**Context:** on 8 November 2026, after the São Paulo GP, Jolpica stopped answering for hours. The site stayed without a result even though OpenF1 had the final classification minutes after the chequered flag. The author wants the site always up to date.

**Decision:**

- In the 15-minute cron, after a race and before asking Jolpica for the official result, ingestion reads OpenF1's `session_result` and `drivers` (validated with Zod) and stores them in a separate table, `provisional_results`. If OpenF1 fails (for instance, closed because of another live session, D-25), the official result is attempted anyway.
- Drivers are matched to the season's grid by their three-letter code. No identifiers are invented: up to two rookies are skipped, unless they are on the podium; if anything else does not add up (duplicate positions, no winner, an impossible number of cars), nothing is written.
- The API serves the provisional result, with `provisional: true`, only while there is no official one; it also counts as the home page's "last race". It never enters standings, records or history. When the official result arrives, the next run deletes the provisional one.
- The race page shows it with a notice: official confirmation is pending, penalties may change it and its points do not count in the championship yet. No grid and no fastest lap, which OpenF1 does not provide in that response.

**Consequence:** still no paid key (D-08). Lap-by-lap live data during the race is out of scope: it requires a paid OpenF1 account and would be a separate decision.

## D-32 · Shared header and building blocks for section pages

**Context:** the pages without their own design (analysis, learn, notes, glossary, records, driver and team profiles, head to head, quiz, simulator, predictions, newsletter, account, search, text pages and leagues) were a heading on white with browser-default lists and forms.

**Decision:**

- **`PageHero`** (`components/page-hero.tsx`): the same black band as the race, circuit, history and standings pages.
  - It holds a kicker with its pictogram, a large title, a lede and a slot on the right for figures (`HeroStats`) or actions.
  - Behind it, the section's pictogram, huge and in a faint stroke.
- **Driver and team profiles** (`components/profile-view.tsx`):
  - the race number (or the team's initials) huge and outlined in the background;
  - titles as lime badges;
  - the head-to-head against the teammate as a split bar;
  - season by season in a dark table with a points bar.
- **Linked cards (`.tile`)** for lists of destinations: tools, explainers, analysed races and search results.
- **Data tables in the timing-screen style** (`.timing`, with bars): records, simulator, predictions, recalculation and careers.
- **Forms in the brand's language:** full-border fields, large options in the quiz, a podium for predictions and "A vs B" in head to head.
- **The home page race report (`race-report.tsx`)** is a fixed template filled in from the result alone, the provisional one included (D-31):
  - a headline written from the data;
  - the stepped podium;
  - six key facts;
  - the start-to-finish chart of the whole grid;
  - points from 4th to 10th.

**Consequence:** a new page starts from `PageHero` and reuses these pieces. Browser tests target the new classes (`.an-latest-title`, `.an-tools`, `.sim-champion`).

## D-33 · Demo newsletter, video without pause and a hover language switcher

**Context:** Paddock Notes is a portfolio project. The author does not want to collect visitors' emails or let the hero video be paused, and wants the language switcher to behave like the header's dropdowns.

**Decision:**

- **Newsletter (NUC-10) as a demonstration:**
  - The form looks like the real one, but submitting it sends nothing from the browser: it clears and opens a notice (a native `<dialog>`) explaining that this is a portfolio project, that the email has not been stored and that nothing will be sent.
  - Without JavaScript, the forms route answers without reading the body and returns to `/newsletter` with the same notice.
  - The form no longer loads Turnstile.
  - The privacy policy says so in all three languages.
  - The API endpoint is kept in case it is reactivated; the web app does not call it.
- **Hero video without a pause button:** a conscious exception to WCAG 2.2.2 (pausing moving content longer than 5 s). To soften it, with reduced motion the video does not play and stays on its first frame, and the hero's overlay keeps it in the background.
- **Language switcher:** with a mouse it opens on hover and closes on leave, with a 150 ms grace period and an invisible bridge over the gap. With a keyboard and on touch it remains a `<details>` that opens on press.

**Consequence:** the Tuesday newsletter (CON-06) has no recipients while the demo lasts. If it is reactivated, this decision is superseded and Turnstile and the previous privacy text come back.

## D-34 · Records hidden, data coverage shown

**Context:** the history is loaded from the most recent season backwards (D-11) and does not reach 1950 yet. A "record" computed over three or four seasons is not the Formula 1 record, and a driver profile or a head to head that does not say which years its figures cover is misleading.

**Decision:**

- **Record pages hidden** (`RECORDS_PUBLIC = false` in `lib/records.ts`):
  - `/records` and `/records/*` answer 404 and leave the menu, the races panel, the history page and the sitemap;
  - the "Big numbers" cards on the history page stop linking to them.
  - The code stays: the pages come back by flipping the switch once the history is complete.
- **Coverage shown:**
  - driver and team profiles state which years their data covers (loaded seasons) and warn that an earlier career does not show yet;
  - head to head says the same in its header and in the duel.
- **Head to head with dropdowns:**
  - the API serves `GET /drivers` with each driver, their first and last season in the data and their races;
  - the dropdowns group them by last season;
  - with no choice, the top two of the current championship are compared.
- **Clean URLs:** scrolling to a section does not add a `#` to the address and, when one arrives with a hash, it is removed after scrolling. The circuit guides in "Learn" get their own page (`/learn/circuits`).

**Consequence:** when the history reaches 1950, three pieces get revisited: the records switch, the coverage texts and the profile note.

## D-35 · No History section: head to head for the current season

**Context:** with the history half loaded, the History section was not historical. The author wants it gone and its place taken by a head to head clearly limited to the current season.

**Decision:**

- **History removed:**
  - the menu and the footer link to "Head to head";
  - `/history` redirects to `/compare`;
  - breadcrumbs on profiles point to Standings (drivers and teams) or Races (circuits);
  - it leaves the sitemap.
- **Head to head for the current season:**
  - the API compares two drivers within a single season (`GET /compare/drivers/{a}/{b}/{season}`, with each profile limited to that year);
  - the page says so in its header ("This season only (2026): every race run up to round N") and in the duel;
  - it adds a race-by-race grid in the colour of whoever finished ahead;
  - with no choice, it compares P1 and P2.
- **A creative picker:** each driver is chosen from a dropdown with the championship grid as cards (position, code, name and team). They are radio inputs inside the form, so it works without JavaScript.
- **Menu dropdown:** the title fight and the teammate duels, each one click away, plus links to head to head and predictions.

**Consequence:** it supersedes the part of D-34 about head-to-head coverage (seasons are no longer mixed). The components that only served the History page were removed when the repository was cleaned up (D-36).

## D-36 · Language by country; repository in English

**Context:** Paddock Notes is a portfolio project read by recruiters, mostly in German-speaking Switzerland. The repository was written in Spanish, and unprefixed URLs negotiated the language from the browser with Spanish as the fallback.

**Decision:**

- **Language by country.** A URL without a language prefix redirects by the visitor's country, from the `cf-ipcountry` header Cloudflare adds: Germany and Switzerland go to German, Spain to Spanish, every other country to English. Without a usable country (local development, Tor, unknown), the browser's `Accept-Language` decides, and English is the fallback (`DEFAULT_LANG`). The redirect varies on both headers.
- **Repository in English.** Code comments, documentation, test names, API error messages, logs and commit messages are in English. The product stays trilingual: UI strings, MDX content and emails keep their Spanish, English and German versions. Document names follow (`decisions.md`, `status.md`, `features.md`, `brand.md`, `content.md`, `security.md`, `setup.md`).
- **Git history rewritten in English** once, with every commit message translated and the dates and authorship kept.

**Consequence:** a German-speaking recruiter in Zürich lands on `/de` and anyone else on a language they read. Contributions follow the same rule: English in the repository, three languages in the product.

## D-37 · Responsive pass: charts drawn for phones, timing tables like a timing screen

**Context:** an audit with Playwright over 39 routes at ten widths (320 to 1920 px) and a phone on its side found the site readable on desktop but not on phones. Every chart was one SVG 760 units wide scaled to the screen, so at 360 px its 13 px labels rendered at 5 to 6 px. Timing tables broke names over three lines and hid the points column behind an unmarked scroll. The footer's season list ran off the screen on every page, two race pages could be panned sideways, the telemetry chart blocked vertical scrolling with a finger, and on a phone on its side the sticky header and section bar covered 43 % of the screen.

**Decision:**

- **Two geometries per chart.** Strategy, pace, replay, telemetry, points, positions and the home page's start-to-finish chart are drawn twice: wide (760 units) and narrow (380 units, fewer ticks, tighter margins, driver codes for end labels where names do not fit). A container query on `.chart-duo` shows the one that fits the space the chart actually has, below 620 px, so labels stay between about 10 and 16 px. It needs no JavaScript (TRA-34) and the hidden geometry is `display: none`, out of the accessibility tree. Shared SVG patterns live in an always-rendered definitions SVG, since browsers do not paint patterns from a hidden one. Rejected: horizontal scrolling of a wider chart (the labels on the left scroll away) and measuring with `ResizeObserver` (charts would need JavaScript).
- **Timing tables like a timing screen.** In a narrow table (container query on `.timing`), the driver shows by family name, on one line, with the given name kept for screen readers; columns tighten so the points column fits from 390 px. Where a table still has to scroll (qualifying at 360 px), position and driver are sticky.
- **Scrollers say there is more.** Horizontal scrollers (tables, the section bar) fade the edge that hides content, driven by the scroll position in CSS (`animation-timeline: scroll()`); without support there is no fade. It is a state, not motion, so it stays under "reduce motion".
- **Phones on their side** (landscape, under 500 px high): the header drops the timing strip and shrinks to 62 px, and the section bar scrolls with the page.
- **Edge to edge.** `viewport-fit=cover`, with `env(safe-area-inset-*)` in the gutters and in the bars stuck to the bottom, so the black bands reach the screen's edges and nothing sits under a notch or the home indicator.
- **Touch.** The header's hover panels need a mouse (`hover: hover` and `pointer: fine`): on an iPad in landscape, Safari spent the first tap on the hover. The telemetry chart takes horizontal drags only (`touch-action: pan-y`). Sliders are 44 px high under a finger. No text below 12 px outside chart axes.

**Consequence:** each chart's markup is doubled (a few kB of HTML per chart page). New charts take a `size` and are drawn with `CHART_SIZES` (`components/charts/sizes.ts`). The season map keeps small pins on phones: the calendar list above it carries the same links (the "equivalent" exception of WCAG 2.5.8).

---

## Sources (consulted on 5 November 2026)

- Jolpica F1: limits (`docs/rate_limits.md`), terms (`TERMS.md`), dumps, laps since 1996 and pit stops since 2011: https://github.com/jolpica/jolpica-f1
- OpenF1: limits, free history, licence and endpoints: https://openf1.org/ and https://openf1.org/docs
- FastF1: F1TV requirement since 3.9.0: https://docs.fastf1.dev/
- Cloudflare Containers, pricing: https://developers.cloudflare.com/containers/pricing/
- Cloudflare Email Service, pricing and limits: https://developers.cloudflare.com/email-service/platform/pricing/ and https://developers.cloudflare.com/email-service/platform/limits/
- D1 jurisdiction: https://developers.cloudflare.com/changelog/post/2025-11-05-d1-jurisdiction/
- D1 import and export: https://developers.cloudflare.com/d1/best-practices/import-export-data/
- Next.js CSP: https://nextjs.org/docs/app/guides/content-security-policy
- vinext with MDX and OG on Workers: https://dev.to/devoresyah/deploy-fumadocs-to-cloudflare-workers-with-vinext-j83
- pnpm `minimumReleaseAge`: https://pnpm.io/settings
- Cloudflare Access, free plan: https://www.cloudflare.com/products/cloudflare-access
- WAF, Free Managed Ruleset: https://developers.cloudflare.com/waf/managed-rules/
- Workers Observability, pricing from 1 December 2026: https://developers.cloudflare.com/observability/pricing/
- Containers, egress control (no longer applies after D-08): https://developers.cloudflare.com/containers/platform-details/outbound-traffic/
- `bacinger/f1-circuits` (MIT): https://github.com/bacinger/f1-circuits
- 2026 regulations: https://www.formula1.com/en/latest/article/from-smaller-cars-to-a-bigger-budget-cap-12-rule-changes-you-need-to-know-in.56uUTFhB0z5j3iZfhC0rGP
