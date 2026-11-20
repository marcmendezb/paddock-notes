# Paddock Notes: APIs

> Every API the project uses: what each one is for, who calls it, how it authenticates, its limits and the phase it arrives in.
> Last reviewed: 19 November 2026. Limits and licences checked against each service's official documentation on 5 November 2026. Decisions in [decisions.md](decisions.md).

## 1. Summary

| API | Type | Purpose | Caller | Authentication | Cost | Phase |
|---|---|---|---|---|---|---|
| Jolpica F1 | F1 data (REST) | Calendar, results, standings, history since 1950 | `paddock-ingest` | None (a custom `User-Agent` is required) | Free, non-commercial | 1 |
| OpenF1 | F1 data (REST) | Sessions, weather, stints, laps, positions, telemetry (since 2023) | `paddock-ingest` | None (history) | Free, non-commercial | 2–3 |
| Cloudflare D1 | Binding | Main database | API, ingestion | Binding | Free plan (D-39) | 1 |
| Cloudflare KV | Binding | Last-resort copy of the most-read data; analysis JSON (D-39) | API, ingestion | Binding | Free plan | 1 |
| Cache API | Runtime | Cache for API responses | API | n/a | Included | 1 |
| Cloudflare Workflows | Binding | History backfill, post-race analysis, newsletter | Ingestion | Binding | Included | 2 |
| Durable Objects | Binding | The outbound limiter's global counter | Ingestion | Binding | Included | 1 |
| Rate Limiting | Binding | Inbound request limit per IP | API | Binding | Included | 1 |
| Service Bindings | Binding | The web app calls the API without going out to the internet | Web | Binding | No per-request cost | 1 |
| Email Service | Binding (`send_email`) | Magic links, notifications, newsletter | API, ingestion | Binding | 3,000/month included | 4–5 |
| Turnstile | REST (`siteverify`) | Bot verification on forms | Web (server) | Secret key | Free | 4–5 |
| Web Analytics | Script | Cookieless analytics | Browser | Public token | Free | 1 |
| Cloudflare API / Wrangler | REST | Deployments, migrations, backups | GitHub Actions | One least-privilege token per use | n/a | 1 |
| GitHub API (Actions) | REST | CI/CD, comments with the preview URL | GitHub Actions | `GITHUB_TOKEN` | Free (public repo) | 1 |
| Sentry | REST (SDK) | Error tracking | Web, API, ingestion | DSN | Free tier | 1 (optional) |
| GitHub and Google OAuth | OAuth 2.0 | Sign-in | API (Better Auth) | Client ID + secret | Free | 4 |
| Browser APIs | Web | Dates, preferences, clipboard, animation | Browser | n/a | n/a | 1 |
| **Our own API** `/api/v1` | Public REST | Exposes the project's data | The web app and any consumer | None (read); session (community) | n/a | 1 |

**No longer used:** FastF1 and Cloudflare Containers. Since October 2026, FastF1 requires an F1TV subscription (D-08).

## 2. Formula 1 data sources

### 2.1 Jolpica F1

**What it is:** the successor to the Ergast API (retired in early 2025), compatible with its endpoints. The main source for results and history.

| Item | Value |
|---|---|
| Base URL | `https://api.jolpi.ca/ergast/f1/` |
| Coverage | Results since 1950; **laps since 1996**; **pit stops since 2011** |
| Format | JSON (routes end in `/` or `.json`) |
| Pagination | `limit` (default 30, maximum 100) and `offset` |
| Authentication | None. A custom `User-Agent` is required |
| Published limits | 4 requests/s burst and 500/hour sustained, per IP. They have announced they **will lower** them when token access launches |
| Over the limit | `429 Too Many Requests` |
| Our limit | 1/s and 400/hour (300/hour for the backfill), configurable. At 2 to 3/s real-world tests got 429s (D-10) |
| Data licence | **CC BY-NC-SA 4.0**, non-commercial use only (`TERMS.md`, 27 August 2025) |
| Repository | https://github.com/jolpica/jolpica-f1 |

**Endpoints we use:**

| Endpoint | Purpose | Features | Frequency |
|---|---|---|---|
| `/{season}/races/` | Calendar with session times | NUC-01, NUC-03, NUC-11–14 | Daily |
| `/{season}/{round}/results/` | Race result | NUC-05, NUC-21–23 | After each race |
| `/{season}/{round}/qualifying/` | Qualifying Q1 to Q3 | NUC-24 | After qualifying |
| `/{season}/{round}/sprint/` | Sprint result | NUC-25 | After the sprint |
| `/{season}/{round}/laps/` | Position and time per lap (since 1996) | HIS | After each race |
| `/{season}/{round}/pitstops/` | Pit stops (since 2011) | NUC-26 | After each race |
| `/{season}/{round}/driverstandings/` | Drivers' standings after a round | NUC-30, NUC-33, NUC-35 | After each race |
| `/{season}/{round}/constructorstandings/` | Constructors' standings after a round | NUC-31 | After each race |
| `/drivers/`, `/constructors/`, `/circuits/` | Profiles | NUC-40–43 | Weekly |
| `/seasons/` | List of seasons | NUC-15, HIS-09 | Yearly |
| `/status/` | Race finishing status codes | NUC-21 | Yearly |

**Notes:**

- `{season}` accepts a year or `current`.
- For laps, the whole race is requested in pages (`/{season}/{round}/laps.json?limit=100&offset=…`), never lap by lap, as Jolpica recommends.
- A pit stop's duration in Jolpica includes entering and leaving the pit lane (and the red flag, if there was one). It is labelled "time in the pit lane", not "stationary time".
- **We do not use** the CSV dumps (D-11).

### 2.2 OpenF1

**What it is:** an open API with timing and telemetry data for every session since 2023. The only source for the technical zone (D-08).

| Item | Value |
|---|---|
| Base URL | `https://api.openf1.org/v1/` |
| Coverage | Every session since 2023 |
| Format | JSON (or CSV with a parameter) |
| Authentication | None for the history. Live data (from 30 min before to 30 min after each session) is paid: **we do not use it**. Also, **while a session is live, all keyless access (the history included) answers 401** with "Live F1 session in progress" (observed on 6 November 2026): ingestion requests nothing during those hours (D-25) |
| Limits (free tier) | 3 requests/s and 30/min |
| Our limit | 2/s and 25/min, configurable |
| Data licence | **CC BY-NC-SA 4.0**; educational, personal and fan use, non-commercial |
| Website | https://openf1.org/ |

**Endpoints we use:**

| Endpoint | Purpose | Features |
|---|---|---|
| `/meetings` | Mapping between Jolpica's Grand Prix and OpenF1's | Every phase 3 feature |
| `/sessions` | Session keys (`session_key`) and times | Every phase 3 feature |
| `/drivers` | Each driver's number, code and team per session | TEC-02–07, NUC-05 (provisional result) |
| `/session_result` | The race's final classification, minutes after the chequered flag: the provisional result (D-31) | NUC-05, NUC-22 |
| `/weather` | Air and track temperature, rain | NUC-27 |
| `/stints` | Compound and laps of each stint | TEC-02 |
| `/pit` | Pit stops (`lane_duration`; `stop_duration` only since the 2024 United States GP) | NUC-26 (since 2023), TEC-02 |
| `/laps` | Lap times, sectors, mini-sectors and the start time of each lap | TEC-03, TEC-04, TEC-06 |
| `/position` | Position throughout the session | TEC-07 |
| `/race_control` | Flags and safety car | TEC-02, TEC-03 |
| `/car_data` | Speed, throttle, brake, gear | TEC-04 |
| `/location` | Car coordinates | TEC-05, NUC-43 |

**Usage rules:**

- Always filter by `session_key`. `car_data` and `location` are requested **only** for one driver and the time window of one lap (`date>=…&date<…`). Never a whole session.
- Deprecated fields: `pit.pit_duration` (removed at the end of 2026; use `lane_duration`) and `drivers.country_code` (same date). The Zod schema does not depend on them.
- **We do not use:** team radio (third-party audio) or live data.

## 3. Cloudflare platform

All of them are used from the Workers through **bindings** declared in Wrangler: there are no keys in the code.

| API | Binding | Concrete use | Who |
|---|---|---|---|
| **D1** | `DB` | Every table. Queries with Drizzle | API (the `f1-read` module; from phase 4, the community tables), ingestion (the `f1-write` module) |
| **KV** | `ANALYSIS` | Analysis JSON (D-39) | API (read), ingestion (write) |
| **KV** | `CACHE` | Last-resort copy of the next Grand Prix and the current standings | API |
| **Cache API** | n/a | Cache for every public response | API |
| **Workflows** | `BACKFILL`, `POST_RACE`, `MAILING` | History, post-race analysis, newsletter and email notifications | Ingestion |
| **Durable Objects** | `OUTBOUND_LIMITER` | Global request counter per source | Ingestion and its Workflows |
| **Cron Triggers** | n/a | Scheduled jobs | Ingestion |
| **Rate Limiting** | `RATE_LIMIT_READ`, `RATE_LIMIT_WRITE` | Per-IP limit on the public API | API |
| **Service Bindings** | `API` | The web app queries the API internally | Web |
| **Email Service** | `EMAIL` | Transactional email and newsletter | API (magic links), ingestion (notifications, newsletter) |
| **Static Assets** | `ASSETS` | Static JavaScript, CSS, fonts and SVG | Web |

**Email Service:** not used (D-38). For reference: in beta, Workers Paid only. At most 50 recipients per email; with the binding, 50 ms of CPU and 50 subrequests per invocation, hence the batches of 40 in the Workflow. In `wrangler dev` sending is simulated and stored in local files.

### 3.1 Cloudflare services outside the Workers

| Service | Purpose | Notes |
|---|---|---|
| **Turnstile** | Bot protection on forms (newsletter, sign-in). The server validates the token with `siteverify` | Secret key on the server only |
| **Web Analytics** | Visits and Core Web Vitals without cookies | A script with a public token, declared in the CSP |
| **WAF, Bot Fight Mode, DDoS** | Perimeter protection | See `security.md` §3 |
| **Access (Zero Trust)** | Protecting the preview environment and `/status` | Free plan, up to 50 users |
| **DNS and Registrar** | Own domain | DNSSEC and CAA |
| **Cloudflare API** | Used by Wrangler in CI to deploy, migrate and export backups | One least-privilege token per use |

## 4. Third-party services

| Service | Purpose | Data it receives | Phase | Alternative |
|---|---|---|---|---|
| **GitHub API / Actions** | CI/CD, comments with the preview URL, Renovate, CodeQL | The repository's code and metadata | 1 | Cloudflare Workers Builds |
| **Sentry** | Errors with stack traces in web, API and ingestion | Technical errors without personal data | 1 (optional) | Workers Logs only |
| **GitHub and Google OAuth** | Passwordless sign-in | The user's identifier and email (with consent) | 4 | Magic link only |
| **Resend** (D-16's plan B only) | Email if Email Service is unavailable | The recipient's email | 4–5 | n/a |
| **`bacinger/f1-circuits`** | Layouts of circuits without data since 2023 (GeoJSON, MIT) | None: copied into the repository | 2 | n/a |
| **Natural Earth** (through `world-atlas`) | Land outlines for the season map (NUC-17), public domain | None: `apps/web/scripts/world-map.mjs` generates `lib/world-land.ts`, which is committed | 2 | n/a |

Before turning on any service that receives personal data: a data processing agreement, the data's location and an entry in the record of processing activities (see `security.md` §17).

## 5. Browser APIs

| API | Purpose | Features |
|---|---|---|
| `Intl.DateTimeFormat`, `Intl.NumberFormat` | Dates, times and numbers by language and time zone | NUC-03, TRA-13 |
| `Intl.RelativeTimeFormat` | "Data from 3 hours ago" | TRA-32 |
| `matchMedia` | `prefers-reduced-motion` and `prefers-color-scheme` | TRA-24, theme |
| `requestAnimationFrame` | The "replay the race" animation and the circuit page's lap | TEC-07, NUC-43 |
| History API (`URLSearchParams`) | The views' state in the URL | TEC-10 |
| Clipboard API | The "copy link" button | TEC-10 |
| `localStorage` | Non-sensitive preferences only (units, theme) | TEC-12 |
| `IntersectionObserver` | Loading charts as they enter the viewport | Performance |

## 6. Our own API (`/api/v1`)

The project's public API. The web app consumes it over a Service Binding; anyone can use it to read data. It never calls external sources (D-05). The live list is the OpenAPI document at `/api/v1/docs`.

| Method and route | Returns | Cache | Phase |
|---|---|---|---|
| `GET /seasons` | Seasons with data | 24 h | 1 |
| `GET /seasons/{season}/schedule` | Calendar | 60 s (current) / 24 h (past) | 1 |
| `GET /races/next` | Next Grand Prix | 60 s | 1 |
| `GET /races/last` | Last race with a result (the provisional one included, D-31) | 60 s | 1 |
| `GET /seasons/{season}/standings/drivers` | Drivers' standings | 60 s / 24 h | 1 |
| `GET /seasons/{season}/standings/constructors` | Constructors' standings | 60 s / 24 h | 1 |
| `GET /seasons/{season}/races/{round}` | A race with its result, qualifying, sprint and pit stops | 5 min (for 48 h) / 24 h | 1–2 |
| `GET /seasons/{season}/standings/history` | Points per round | Same | 2 |
| `GET /seasons/{season}/standings/recalculated` | Standings under today's points system | Same | 2 |
| `GET /drivers` | Driver index with the seasons each one has in the data | 24 h | 2 |
| `GET /drivers/{id}` · `/constructors/{id}` · `/circuits/{id}` · `/circuits/{id}/layout` | Profiles and layout | 24 h | 2 |
| `GET /compare/drivers/{a}/{b}` · `/compare/drivers/{a}/{b}/{season}` | Head to head over the whole data or a single season (D-35) | 24 h | 2 |
| `GET /records/{type}` | Records | Until the next Grand Prix | 2 |
| `GET /history/this-week` | This week in history | 1 h | 2 |
| `GET /search?q=` | Search | 1 h | 2 |
| `GET /analysis` · `/analysis/{season}/{round}` | Analysed races and the tools available | 5 min | 3 |
| `GET /analysis/{season}/{round}/{tool}` · `.../telemetry/{driver}` | Each tool's JSON | Immutable per version | 3 |
| `GET /quiz/{week}` · `GET /rankings/{season}` | Weekly quiz and predictions ranking | 1 h / 5 min | 4 |
| `POST /predictions`, `GET /predictions/me` | The user's predictions | No cache | 4 |
| `POST /leagues`, `GET /leagues/{id}` | Leagues | No cache | 4 |
| `GET /health` | Service status | No cache | 1 |
| `GET /docs` | OpenAPI documentation | 1 h | 1 |

**Policies:**

- **Versioning:** `/api/v1` does not change incompatibly. An incompatible change creates `/api/v2`, and the previous version stays for at least 6 months with the `Deprecation` header.
- **Errors** (D-06): `{ "error": { "code", "message" } }`. 400 invalid parameter · 404 no data · 405 method not allowed · 429 inbound limit · 500 internal error · 503 D1 unavailable, with `Retry-After`.
- **Freshness:** an `updated_at` field in every response; an `X-Data-Stale: true` header when a cached copy is served because D1 fails or when ingestion is behind.
- **CORS** (D-07): open reads (`*`, no credentials); community routes, own origin only.
- **Limits:** see `security.md` §6.
- **Attribution and licence** (D-12): every response includes `source` (for example, `["Jolpica F1"]`) and `license: "CC BY-NC-SA 4.0"`.

Shape of a response:

```json
{
  "data": { "...": "..." },
  "source": ["Jolpica F1"],
  "license": "CC BY-NC-SA 4.0",
  "updated_at": "2026-11-02T22:14:05Z"
}
```

## 7. Feature → API matrix

| Area | Jolpica | OpenF1 | D1 | KV (analysis) | KV/Cache | Others |
|---|---|---|---|---|---|---|
| Home and calendar | ✓ | ✓ (provisional result) | ✓ | n/a | ✓ | `Intl` |
| Grand Prix page | ✓ | ✓ (weather, pit stops since 2023) | ✓ | n/a | ✓ | n/a |
| Standings | ✓ | n/a | ✓ | n/a | ✓ | n/a |
| Profiles | ✓ | ✓ (layout) | ✓ | ✓ (layout) | ✓ | `bacinger/f1-circuits` |
| Technical zone | n/a | ✓ | ✓ (index) | ✓ (JSON) | ✓ | Workflows |
| History | ✓ | n/a | ✓ | n/a | ✓ | Workflows (backfill) |
| Community | ✓ (official result) | n/a | ✓ | n/a | n/a | A demonstration today: no email, no sign-ups (D-38) |
| Content and SEO | n/a | n/a | n/a | n/a | n/a | Newsletter as a demonstration (D-33) |

## 8. Common rules for integrating any external API

1. **Server only.** No external API is called from the browser (except the analytics script and Turnstile).
2. **A closed list of outbound hosts** in the code: `api.jolpi.ca` and `api.openf1.org`.
3. **A timeout** of 10 s per request and a maximum response size (5 MB).
4. **Retries** with exponential backoff and jitter (at most 3), only on 429, 5xx and network errors.
5. **Respect for `Retry-After`** and the published limits, with a margin.
6. **Zod validation** of every response before using it (see `security.md` §8).
7. **Caching** for everything that does not change.
8. **An identifiable `User-Agent`** with the project's name and a contact URL (required by Jolpica).
9. **Visible attribution** of each source and its licence on the site and in the API.
10. **A review of the terms of use** before adding an API and before any change of use.
11. **Monitoring:** each call logs source, endpoint, status and duration; alerts if the error rate rises.
12. **Tests without a network:** external APIs are simulated with real responses stored in `fixtures/`.
