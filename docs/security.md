# Paddock Notes: security

> The project's security policy and design, from the network to the code and from the repository to incident response.
> Last reviewed: 19 November 2026. The third-party features and plans cited were checked against their official documentation on 5 November 2026.

## 0. Goal and scope

**Goal:** Paddock Notes meets **OWASP ASVS level 2** (current version), the usual standard for applications holding user data. Phases 1 to 3 handle no personal data, but the system is built from the start as if they did.

**Scope:** the web app (`paddock-web`), the API (`paddock-api`), ingestion (`paddock-ingest`, its Workflows and the limiter's Durable Object), data (D1, R2, KV), email, the Cloudflare account, the GitHub repository and the CI/CD pipeline. The decisions cited (`D-xx`) are in [decisions.md](decisions.md).

**An honest limit:** no system is invulnerable. "Very secure" here means: a minimal attack surface, defence in depth, everything verifiable with automated tests and a rehearsed plan for when something fails.

## 1. Principles

1. **Minimal surface.** What does not exist cannot be attacked: no public admin panel, no write endpoints in the public API, no file uploads.
2. **Least privilege.** Each Worker has only the bindings it needs; each token, only the permissions it uses.
3. **Deny by default.** Routes, methods, origins, parameters and outbound hosts work with allowlists.
4. **Everything external is hostile.** User input and also Jolpica's and OpenF1's responses are validated before use.
5. **Defence in depth.** Cloudflare (network), Worker (application), data and repository each have independent controls.
6. **Secure by default and verifiable.** Every important control has a CI test that fails if it breaks.
7. **Privacy by design.** No personal data is collected without a feature that needs it.

## 2. Threat model

### 2.1 Assets

| Asset | Why it matters |
|---|---|
| User data (phase 4: email, display name, predictions) | Privacy and legal obligations (GDPR, Swiss nDSG) |
| Integrity of the F1 data in D1 and R2 | One tampered figure destroys the project's credibility |
| Credentials: Cloudflare, GitHub, Sentry and email tokens | They give control over the infrastructure |
| Site availability | It is a portfolio piece: it must work when a recruiter visits |
| Account cost | Abuse can generate bills ("denial of wallet") |
| Reputation and brand | A defacement or injected content reflects on the author |

### 2.2 Main threats and controls

| Threat | Vector | Controls |
|---|---|---|
| Script injection (XSS) | External data or content rendered unescaped | React escapes by default; `dangerouslySetInnerHTML` banned except for a reviewed exception; CSP; validation of external data |
| SQL injection | API parameters | Drizzle with parameterised queries; a lint rule against concatenated SQL |
| API abuse and mass scraping | Bots | Per-IP Rate Limiting, caching, WAF, Bot Fight Mode |
| Runaway cost | Mass requests or loops | CPU limits per invocation, billing alerts, aggressive caching |
| Account takeover (phase 4) | Credentials, session fixation, reused magic links | No passwords; single-use links with a short expiry; `__Host-` cookies; Turnstile; attempt limits |
| Access to other people's data (IDOR) | Predictable IDs in leagues or predictions | Owner check in every query; non-sequential IDs; authorisation tests |
| Tampered or corrupt source data | An unexpected response from a source | Zod validation, consistency checks, quarantine |
| SSRF | A parameter that ends up in an outbound URL | Ingestion only calls hosts on a closed list; no user input forms outbound URLs |
| Improper writes to F1 data | The API (exposed to the internet) shares the database with ingestion | Separate `f1-read` and `f1-write` modules, with a lint rule and an architecture test (D-14) |
| Previews touching production | A version's preview URLs share production bindings | A preview environment with its own Workers and resources; `preview_urls: false` in production (D-18) |
| Compromised dependencies | A malicious npm package | Lockfiles, versions at least 14 days old, auditing, no arbitrary install scripts |
| Compromised pipeline | A malicious GitHub Action, a leaked token | Actions pinned by SHA, least privilege, environments with approval, secret scanning |
| Compromised Cloudflare or GitHub account | Phishing | 2FA with security keys or passkeys; least-scope tokens; audit log |
| Clickjacking | The site embedded in a third-party iframe | `frame-ancestors 'none'` |
| Leaks through logs | Personal data or secrets in logs | Logs without PII; truncated IPs; never authorisation headers |

## 3. Perimeter: Cloudflare

### 3.1 DNS and domain

- **DNSSEC** on.
- **CAA** records that only allow the certificate authorities Cloudflare uses.
- Domain transfer lock and 2FA at the registrar.
- In production, `workers_dev: false` and `preview_urls: false` on all three Workers: only the custom domain exists. The preview environment uses `workers.dev` behind Cloudflare Access (D-18).

### 3.2 TLS

- HTTPS only ("Always Use HTTPS") and TLS 1.2 minimum; TLS 1.3 on.
- **HSTS** with `max-age=63072000; includeSubDomains; preload`, submitted to the browsers' preload list once stable.

### 3.3 WAF, bots and DDoS

| Control | Configuration |
|---|---|
| DDoS protection | Cloudflare's automatic protection |
| WAF managed rules | **Free Managed Ruleset**: included in the zone's free plan and on by default. It covers mass-exploitation vulnerabilities; the full OWASP set requires a paid plan and is not bought |
| Custom rules | Block methods other than `GET`, `HEAD`, `POST` and `OPTIONS`; block `POST` outside the routes that need it; block typical scanning paths (`/wp-admin`, `/.env`, `/.git`) |
| Bots | Bot Fight Mode on; Turnstile on forms |
| Rate Limiting (perimeter) | The free plan's single rate-limiting rule, per IP on `/api/*`, as a first barrier; the Worker applies the fine-grained limit |
| Admin zone | `/status` and the preview environment behind **Cloudflare Access** (free Zero Trust plan, up to 50 users) with the author's login. Playwright gets in with an Access service token |

## 4. Security headers

Applied to every response from the Next.js middleware and from the API.

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | See 4.1 |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` (web) / `cross-origin` only on the public read API |
| `X-Frame-Options` | `DENY` (compatibility; the real protection is `frame-ancestors`) |

### 4.1 Content Security Policy

**Target policy:**

```
default-src 'self';
script-src 'self' 'nonce-{random}' 'strict-dynamic';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
media-src 'self';
frame-ancestors 'none';
form-action 'self';
base-uri 'none';
object-src 'none';
upgrade-insecure-requests;
report-to csp-endpoint;
```

**Added origins, each one justified:**

| Directive | Origin | Reason | Phase |
|---|---|---|---|
| `script-src` | None extra: the Web Analytics script is loaded with the nonce and `'strict-dynamic'` authorises it | Cookieless analytics | 1 |
| `connect-src` | `https://cloudflareinsights.com` | Sending the Web Analytics metrics | 1 |
| `frame-src` | `'none'` | No frames. Turnstile left the web app when sign-in became a demonstration (D-38); the API still requires a Turnstile token, so a direct call to it cannot sign in | — |
| `media-src` | `'self'` | The hero's background video, served from `/media` (D-27) | 1 |

The Archivo typeface is self-hosted, so `font-src 'self'` needs no exceptions.

**Decision (D-04):** Next.js injects inline scripts, and the only strict way to authorise them is a per-request nonce. So **every page is rendered per request** with a nonce-based CSP, no exceptions, and caching moves to the data layer. A hash-based CSP or SRI was ruled out: it is experimental, only works with webpack (Next.js 16 builds with Turbopack by default) and does not cover RSC inline scripts.

**Rollout:**

1. The first published version uses `Content-Security-Policy-Report-Only` to catch legitimate violations.
2. It switches to enforcing mode before the public launch, once the report has stayed clean for a week of testing.
3. A Playwright test checks on every PR that the header exists, that the nonce changes between requests and that `script-src` contains neither `'unsafe-inline'` nor `'unsafe-eval'`.

`'unsafe-eval'` is never used. `'unsafe-inline'` is only accepted in `style-src` if a dependency demands it, and then documented.

## 5. Web application

- **Escaping:** React escapes all text. `dangerouslySetInnerHTML` is banned by a lint rule; any exception needs review and explicit sanitisation. The only approved exception: `components/json-ld.tsx` (structured data, CON-08). It only serialises JSON generated by the site itself, escapes `<`, `>` and `&` so nothing can close the `<script>` tag, carries the CSP nonce and has a test that checks it.
- **MDX content:** only content from the repository itself is compiled, reviewed through pull requests. MDX from users or external sources is never compiled.
- **External data on screen:** text from the sources (driver names, statuses) is treated as plain text, never as HTML.
- **External links:** `rel="noopener noreferrer"`; a short list of linkable domains in the content.
- **Redirects:** the language redirect only accepts `es`, `en` and `de` and internal relative paths. There is no `?next=`-style parameter that accepts external URLs.
- **CSRF (phase 4):** `SameSite=Lax` cookies, an `Origin` header check on every state-changing request and Next.js's own Server Actions protection. No `GET` modifies data.
- **Browser storage:** non-sensitive preferences only (units, theme). Never tokens or personal data in `localStorage`.
- **Errors:** generic error pages; never stack traces or internal messages in production.

## 6. API (`paddock-api`)

| Control | Implementation |
|---|---|
| Input validation | Strict Zod for path, query and body; unknown parameters are rejected |
| Size limits | A 16 kB maximum body on `POST` routes (phase 4); pagination capped at 100 items |
| Methods | Only those declared on the route; anything else returns 405 |
| Request limit | Rate Limiting binding per IP (initial example: 60/min for reads, 10/min for writes) → 429 with `Retry-After` |
| CORS | Read `GET`s with `Access-Control-Allow-Origin: *` and no credentials (it is a documented public API); community routes for the site's own origin only, with credentials (D-07) |
| External sources | The API never calls Jolpica or OpenF1: it only reads D1 and R2 (D-05) |
| Authentication (phase 4) | The session is validated on the server on every write request |
| Authorisation | Deny by default; an owner check on every user resource |
| Errors | A uniform format (`{ "error": { "code", "message" } }`) without internal details; the details only go to the logs |
| Cache | Normalised cache keys (sorted, validated parameters) to prevent cache poisoning; authenticated responses are never cached |
| Response time | A maximum time per D1 query; a controlled 503 if it is exceeded |
| Documentation | Public OpenAPI for the public endpoints only |

## 7. Data

### 7.1 Classification

| Class | Examples | Where | Measures |
|---|---|---|---|
| Public | Results, calendars, analyses | D1, R2, KV | Integrity and backups |
| Internal | Ingestion state, metrics | D1 (`ingest_runs`), logs | Only reachable behind Cloudflare Access |
| Personal (phase 4) | Email, display name, predictions | D1 | Minimisation, the provider's encryption at rest, access only through the API, deletion on request |
| Secret | Tokens and keys | Wrangler and GitHub secrets | Never in code, logs or the database |

### 7.2 Database (D1)

- **Always parameterised queries** (Drizzle). A lint rule against SQL built with template strings.
- **Separation of duties (D-14):** only `paddock-ingest` writes F1 data; `paddock-api` only reads it and only writes the community tables (phase 4). D1 offers no read-only bindings, so the separation is enforced in code: an `f1-read` module (only `select`) for the API and `f1-write` for ingestion, with a `no-restricted-imports` rule and an architecture test.
- **Migrations** reviewed in pull requests and applied by the pipeline; never by hand in production.
- **Backups (D-15):** D1 Time Travel (any minute in the last 30 days) and a weekly export from GitHub Actions (`wrangler d1 export --remote`) to the `paddock-backups` bucket, deleted automatically after 90 days. The export blocks queries while it runs, so it happens on Wednesdays at 03:00 UTC. A restore is tested once a quarter.
- **Data location (D-13):** D1 and R2 are created in the `eu` jurisdiction from day one; a D1 jurisdiction cannot be changed later. KV does not support it, so it only stores cached copies of public data.

### 7.3 Files (R2)

- Private buckets; public access only through the API or a custom domain with caching, never by listing the bucket.
- A separate backup bucket, with no access from the Workers that serve visitors.
- Object names generated by the system, never by the user.

## 8. Ingestion and external data

Jolpica's and OpenF1's data is **untrusted input**:

- **A closed list of outbound hosts:** `api.jolpi.ca` and `api.openf1.org`, HTTPS only. Any other URL is rejected in code.
- **Zod validation** of every response before writing to D1. A response that does not match the schema is not written.
- **Consistency checks:** positions between 1 and the number of entrants, points within the possible values, dates in reasonable ranges.
- **Quarantine:** if an ingestion run changes more than a threshold of already settled rows (for example, the result of a race from years ago), it stops and alerts instead of overwriting.
- **Limits:** a maximum time per request (10 s), a maximum response size and a request limit per source.
- **Identification:** a `User-Agent` with the project's name and a contact URL, as a courtesy to the sources.
- **Source credentials:** if authenticated OpenF1 is ever used, the exchange of username and password for a token happens on the server only, as its guide requires.

## 9. Authentication (phase 4)

| Control | Detail |
|---|---|
| No passwords of our own | Email magic link or OAuth with GitHub or Google |
| Magic link | Single use, 15-minute expiry, a random token of at least 128 bits stored as a hash |
| OAuth | Code flow with PKCE and a `state` parameter; strict validation of the return URL |
| Session cookies | `__Host-` + `HttpOnly` + `Secure` + `SameSite=Lax` + `Path=/` |
| Sessions | Identifier rotated on sign-in; idle (7 days) and absolute (30 days) expiry; sign out of every session from the account |
| Account enumeration | The same message and response time whether or not the email exists |
| Brute force | A limit on link requests per email and IP; Turnstile on the form |
| Passkeys | Optional, if the authentication library supports them without extra complexity |
| Administration | There is no admin role in the application. Internal tasks are done with Wrangler or behind Cloudflare Access |

Library (D-17): Better Auth with `drizzleAdapter` over `drizzle-orm/d1`, an instance created per request; migrations with `drizzle-kit`. Hand-written cryptography or session management is avoided.

## 10. Authorisation

- Every query for user resources filters by the session's user inside the SQL query itself, not afterwards.
- Non-sequential user, league and prediction IDs (UUID).
- League invitations with a random, revocable, expiring token.
- Authorisation tests: for each community endpoint, a test tries to access another user's resource and expects 403 or 404.

## 11. Secrets

| Rule | Detail |
|---|---|
| Where they live | `wrangler secret put` for Workers; environment secrets on GitHub; never in the repository |
| Public variables | No secret with a `NEXT_PUBLIC_` prefix (it gets embedded in the browser's JavaScript) |
| Cloudflare tokens | One token per use (production deploy, preview deploy), least privilege and limited to the account and the resources needed |
| Rotation | Every 90 days and immediately on any suspicion |
| Detection | gitleaks in CI (the `secrets` job in `ci.yml`, full history); GitHub secret scanning with push protection |
| Local | `.dev.vars` and `.env` in `.gitignore`; development values only |

## 12. Supply chain

- **A mandatory lockfile** (`pnpm-lock.yaml`) and a frozen install in CI (`pnpm install --frozen-lockfile`).
- **Minimum version age (D-19):** `minimumReleaseAge: 20160` (14 days, in minutes) in `pnpm-workspace.yaml` and `minimumReleaseAge: "14 days"` in Renovate. Urgent security patches are excluded with `minimumReleaseAgeExclude`, reviewed in the PR.
- **Install scripts:** off by default in pnpm; only allowed on the explicit list (`onlyBuiltDependencies`).
- **Audit in CI:** `pnpm audit`; the pipeline fails on high or critical vulnerabilities without a documented exception.
- **Updates:** Renovate with weekly grouped PRs; major updates by hand.
- **Few dependencies:** each new dependency is justified in the PR (what it brings, maintenance, size).
- **SBOM:** generated on each release and attached to the deployment.

## 13. Repository and CI/CD

| Control | Configuration |
|---|---|
| 2FA | Mandatory on GitHub and Cloudflare, with a security key or passkey |
| Protected `main` branch | No direct pushes; PRs with required green checks; linear history |
| Signed commits | Required on `main` |
| GitHub Actions | Pinned by full SHA, not by tag; `permissions: contents: read` by default and widened only where needed |
| `production` environment | Secrets only available in that environment, with manual approval by the author |
| Third-party PRs | Workflows for external PRs receive no secrets (`pull_request`, never `pull_request_target` with outside code) |
| Static analysis | CodeQL for TypeScript (`codeql.yml`); it only runs while the repository is public, because a private one requires GitHub Advanced Security |
| Cloudflare tokens in CI | Three, one per use: production deploy, preview deploy and the weekly backup (production D1 and the `paddock-backups` bucket only) |
| Alerts | Dependabot alerts and secret scanning on |
| Audit | The Cloudflare audit log reviewed monthly |

## 14. Ingestion, Workflows and the limiter

The FastF1 Container left the design (D-08); analyses are computed in TypeScript inside the `POST_RACE` Workflow.

- **No public entry point:** `paddock-ingest` has no routes, `workers_dev` or `preview_urls`; it only runs from Cron Triggers. Its `fetch` handler answers 404.
- **Workflows** are only started by ingestion through its binding; no endpoint triggers them.
- **The limiter's Durable Object:** only reachable by binding from ingestion; if it does not answer, the outbound request is not made (fails closed).
- **Idempotent steps:** retrying a step never duplicates or corrupts data.
- **Bounded outputs:** each analysis JSON is validated against its Zod schema and its maximum size before being written to R2.

## 15. Availability and cost

- **CPU limits** per invocation in the Wrangler configuration, to cut off runaway executions.
- **Billing and usage alerts** in Cloudflare (Workers, D1, R2, Email Service, Workers Logs).
- **Caching** on every public response: most traffic never runs code.
- **Graceful degradation:** if D1 or the API fail, the web app serves the latest cached copy with a stale-data notice.
- **Fast rollback:** each deployment keeps its version; the pipeline rolls back if the health check fails.

## 16. Logging and monitoring

| What is logged | What is never logged |
|---|---|
| Route, method, status code, duration | Request bodies with personal data |
| Country and truncated IP (/24 for IPv4, /48 for IPv6) | The full IP (except for an abuse investigation with a legal basis) |
| Errors with a correlation ID | Cookies, `Authorization` headers, tokens |
| Security events: 401, 403, 429, session changes | Full email addresses (logged as a hash) |
| Ingestion runs and their outcome | Secrets |

**Alerts:** a rise in 5xx errors, spikes of 429s, consecutive ingestion failures, CSP violations, attempts to reach admin routes, changes to the Cloudflare account.

**Retention:** operational logs per the Workers Logs retention of the plan in use (with Observability pricing from 1 December 2026); aggregated security events, 90 days.

## 17. Privacy

- **Phases 1 to 3:** no personal data. Cookieless analytics (Cloudflare Web Analytics), so no consent banner is needed.
- **Phase 5 (newsletter):** only the email and the language; double opt-in; one-click unsubscribe (`List-Unsubscribe` and `List-Unsubscribe-Post`). The list lives in D1 (EU) and Cloudflare Email Service sends, so no processor besides Cloudflare is added (D-16). The confirmation token is stored as a hash and expires after 48 h; unconfirmed sign-ups are deleted by the weekly job; unsubscribing deletes the row. Sign-up answers the same whether or not the address exists and does not resend the confirmation to the same address within 10 minutes (D-24). **While the demo newsletter lasts (D-33), the web app stores nothing at all:** the form only shows a notice.
- **Phase 4 (accounts):** email, display name and predictions; export and deletion from the account; inactive accounts deleted after 24 months with prior notice. The weekly `paddock-ingest` cron does it (`workers/ingest/src/retention.ts`): the latest session renewal or profile change counts as activity; it warns by email and, if 30 days later there is still no activity after the warning, deletes the account in cascade. Sessions store neither the IP nor the user agent.
- **A record of processing activities** and a privacy policy in every language before turning on phase 4 or the newsletter.
- Reference law: GDPR (EU) and nDSG (Switzerland). This document is not legal advice.

## 18. Incident response

**Runbook:**

1. **Detect and record:** time, signal, initial scope.
2. **Contain:** turn on "Under Attack" mode or WAF rules, roll back the deployment, revoke tokens or turn off the affected feature.
3. **Eradicate:** fix the cause, rotate every secret that could have been exposed.
4. **Recover:** restore data with Time Travel or from the R2 backup; verify integrity.
5. **Notify:** if personal data is affected, assess notifying the data protection authority and those affected within the legal deadlines (under the GDPR, 72 hours for the authority).
6. **Learn:** a blameless postmortem in `docs/incidents/`, with actions and dates.

**Preparation:** the runbook is rehearsed once a year with a simulated scenario (for example, a leaked Cloudflare token).

## 19. Responsible disclosure

- `/.well-known/security.txt` (RFC 9116) with a contact, preferred language and expiry date.
- `SECURITY.md` in the repository: how to report, what to expect (acknowledgement within 72 h), what is out of scope.
- No bounty programme; public thanks if the reporter wants it.

## 20. Security testing

| When | Test |
|---|---|
| Every commit (pre-commit) | gitleaks, lint with security rules |
| Every PR | CodeQL, `pnpm audit`, the architecture test (D-14), authorisation tests, header tests (CSP, HSTS, cookies) with Playwright |
| Every PR against the preview | A basic OWASP ZAP scan (baseline mode) |
| Before launch | A manual review with the list below; an external header and TLS scan |
| Quarterly | A backup restore test; a review of tokens and permissions |
| Yearly | A full review against OWASP ASVS level 2 and an update of this document |

## 21. Pre-launch checklist

- [ ] DNSSEC, CAA, HSTS and TLS ≥ 1.2 on.
- [ ] `workers_dev` and `preview_urls` off in production.
- [ ] D1 and R2 created in the `eu` jurisdiction.
- [ ] WAF, Bot Fight Mode and rate-limiting rules on.
- [ ] Security headers present on every route (test green).
- [ ] Nonce-based CSP in enforcing mode.
- [ ] No secrets in the repository (gitleaks clean over the whole history).
- [ ] Least-privilege Cloudflare tokens; 2FA on every account.
- [ ] `main` protected; actions pinned by SHA; `production` environment with approval.
- [ ] Backups configured and one restore tested.
- [ ] Error, ingestion and billing alerts working.
- [ ] `security.txt` and `SECURITY.md` published.
- [ ] Privacy and legal notice pages published.
- [ ] Internal routes (`/status`, previews) behind Cloudflare Access.

## 22. Quick map against the OWASP Top 10

| OWASP risk | Section of this document |
|---|---|
| Broken access control | 9, 10 |
| Cryptographic failures | 3.2, 9, 11 |
| Injection | 5, 6, 7.2, 8 |
| Insecure design | 1, 2, 14 |
| Security misconfiguration | 3, 4, 13 |
| Vulnerable components | 12 |
| Identification and authentication failures | 9 |
| Software and data integrity failures | 8, 12, 13 |
| Logging and monitoring failures | 16 |
| SSRF | 8 |
