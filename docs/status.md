# Paddock Notes: feature status

> What is built and tested, by ID from [features.md](features.md). Last reviewed: 20 November 2026.
> **Done:** implemented and covered by tests (unit, Workers or browser). **Partial:** works, with the limitations noted. **Pending:** not started.

## Summary

| Phase | Done | Partial | Pending |
|---|---|---|---|
| 1 · MVP | 46 | 3 | 0 |
| 2 · History | 27 | 0 | 0 |
| 3 · Technical zone | 16 | 0 | 0 |
| 4 · Community | 13 | 0 | 0 |
| 5 · Content and SEO | 7 | 3 | 0 |

## What changed between 6 and 19 November

- **Design:** new header and footer, a curtain transition between pages, smooth scrolling (D-28). Redesigned home page, races, each Grand Prix page, the circuit page (the fastest lap in real time, a globe, telemetry, the circuit guide as a magazine spread; D-30), standings and every other page with a shared header (D-32).
- **German** as a third language across the site and the emails (D-29).
- **Provisional result from OpenF1** after each race (D-31).
- **Anchors** in the race and circuit sub-navigation checked in Chromium, WebKit and Firefox (D-30).
- **Demo newsletter:** signing up stores and sends nothing and says so in a notice (D-33). The hero video cannot be paused, a conscious exception to WCAG 2.2.2 (D-33).
- **Records hidden and History removed:** with the history half loaded, the records pages answer 404 and the History section became a head to head for the current season (D-34, D-35).
- **Language by country** for unprefixed URLs, and the repository in English (D-36).
- **Responsive pass** (20 November): charts drawn with a phone geometry, timing tables like a timing screen on phones, the footer and two race pages no longer wider than the screen, a compact header on a phone on its side, safe areas for notches and touch-only fixes (D-37).
- **Hosting** (20 November): the author's Cloudflare account, on workers.dev until `pn.marcmendezb.com`, deployed only from GitHub Actions. No email and no sign-ups: signing in is a portfolio demonstration like the newsletter, and the Workers have no Email Service binding (D-38).
- **Free plan only** (20 November): analysis JSON in Workers KV instead of R2, D1 backups as GitHub artifacts, no lap-by-lap history, crons in production only and the API's KV copy written at most hourly. No payment method on the account (D-39).
- **Jolpica from GitHub Actions** (20 November): Jolpica answers 429 to every Cloudflare Worker, so its ingestion runs every 15 minutes from a public repository's Actions with the same code, writing to D1 through the REST API (D-40).

## Phase 1 · MVP

| ID | Status | Note |
|---|---|---|
| NUC-01 to NUC-06 | Done | Next Grand Prix, countdown, times in two time zones, live session, last race, short standings. The last race is a report with a fixed template filled in from the result alone (a headline written from the data, podium, six key facts, start to finish for the whole grid), the provisional result included (D-31, D-32) |
| NUC-07 | Done | Champion and the start of the next season (first Grand Prix and date); from October, ingestion loads the next calendar as soon as Jolpica publishes it, and says so while it is missing |
| NUC-11 to NUC-16 | Done | Calendar, states, winner, sprint, a season picker back to 1950, .ics |
| NUC-20 to NUC-23 | Done | Grand Prix page with the result, positions gained and fastest lap, in timing-screen tables with a sub-navigation by section. After the race, OpenF1's provisional result while Jolpica has not published the official one (D-31) |
| NUC-30 to NUC-32 | Done | Standings with podiums and the gap to the leader |
| TRA-01, TRA-10 to TRA-14 | Done | Navigation, ES/EN/DE (D-29), redirect by country and language (D-36), formats, 404/500 in all three languages |
| TRA-20 to TRA-25 | Done | axe WCAG 2.2 AA on desktop, mobile and dark mode on every PR. Documented exceptions to 2.2.2 (D-27, D-33) |
| TRA-30 | Partial | Only in components that load data on the client (D-22) |
| TRA-31, TRA-32, TRA-34 | Done | No-data and stale-data states; content without JavaScript |
| TRA-40, TRA-41 | Partial | Locally (mobile): 94 to 100 for performance and 100 for the rest, CLS 0, simulated LCP 2.5 to 2.7 s, but locally the HTML is served uncompressed (37 kB against about 6.5 kB with gzip). `lighthouserc.json` and the CI job exist; measuring against the preview, which compresses, is still to do |
| TRA-42 to TRA-47 | Done | Global limiter, versioned API with OpenAPI, inbound limit, health, CI |
| TRA-50 to TRA-52 | Done | Disclaimer, attribution and licence; legal pages; no cookies |
| CON-09, CON-10 | Done | Dynamic sitemap.xml, robots.txt, "About the project" |

## Phase 2 · History

| ID | Status | Note |
|---|---|---|
| NUC-17 | Done | Our own SVG map on the calendar (Natural Earth outlines, an enlarged inset for Europe); each dot carries the round and links to the circuit page; raced and upcoming in different shapes |
| NUC-24 to NUC-26, NUC-29 | Done | Q1 to Q3 (since 1994), sprint, pit stops (since 2011), navigation between Grands Prix |
| NUC-27 | Done | Race weather on the Grand Prix page (since 2023), summarised in the post-race Workflow |
| NUC-33 to NUC-36 | Done | Progression with a chart and a table, matrix, standings after any round, title contenders |
| NUC-40 to NUC-42 | Done | Driver and team profiles with a final-position chart and the years their data covers (D-34) |
| NUC-43 | Done | Circuit page with winners and an SVG layout generated from OpenF1 `location` (circuits raced since 2023) |
| HIS-01 to HIS-05, HIS-07 to HIS-09 | Done | Head to head (current season only, D-35), records with definitions (hidden until the history is complete, D-34), this week in history, every season |
| HIS-06 | Done | `/standings/{season}/current-points`: drivers under today's points system against the real standings, labelled as a recalculation, with ties broken by wins and second places |
| TRA-02 to TRA-04 | Done | Breadcrumbs with BreadcrumbList, search with the "/" shortcut, cross-links |
| TRA-33 | Done | Partial data: blocks that do not appear outside their coverage |
| History backfill (D-11) | Done | A Workflow per season, 300 requests/h, a safeguard for stuck instances |

## Phase 3 · Technical zone

| ID | Status | Note |
|---|---|---|
| TEC-01 to TEC-10 | Done | The five tools, automatic notes, "How to read it", the view's state in the URL |
| TEC-11 | Done | 1200×630 images with `next/og` for the home page, each Grand Prix and each tool, with source and date |
| TEC-12, TEC-13 | Done | km/h or mph remembered; 14 kB of telemetry per driver |
| NUC-28, NUC-08 | Done | Links to the analysis from the Grand Prix page and the home page |
| NUC-44 | Done | Braking zones detected in the fastest lap's telemetry (minimum speed, gear, the slowest one), numbered on the layout, with editorial notes in `content/circuits.ts` matched by position in the lap. Notes written: Mexico and Austin; the remaining circuits as they are checked (CON-05) |

## Phase 4 · Community

| ID | Status | Note |
|---|---|---|
| COM-01 | Done | Magic link (Better Auth, 15 min, token stored as a hash) through Email Service; `__Host-` cookie, `HttpOnly`, `Secure` and `SameSite=Lax`. No external provider for now (D-23) |
| COM-02 | Done | Display name with a filter, email language and favourites |
| COM-03 | Done | JSON export and immediate cascading deletion; accounts inactive for 24 months: a warning and deletion 30 days later (weekly ingest cron) |
| COM-04 | Done | Podium and pole, closed when qualifying or the sprint starts. No driver of the day: no open source publishes it |
| COM-05 | Done | Scores are computed on read, with the current official result: later penalties show up on their own |
| COM-06 | Done | Global ranking with the tie-break rule published on the page |
| COM-07 | Done | Leagues with a revocable invitation, at most 50 members, a ranking and a summary of the last Grand Prix (each member's points and who did not predict) on the league page |
| COM-08 | Done | Weekly quiz without an account, with a progress bar; with an account it stores the score and streak |
| COM-09 | Done | Simulator with a shareable URL, without JavaScript |
| COM-10 | Done | Favourites highlighted in standings, results and the recalculation (background, border and a "Favourite" label) and in the progression chart: shown by default, with a heavier stroke, a star on the label and "favourite" in the accessible description |
| COM-11 | Done | A notice before each Grand Prix (when the first session starts in under 48 h) and when the analysis of a recent race is published. Optional, off by default, one-click unsubscribe |
| COM-12 | Done | Turnstile on the magic-link request; a limit of 10 writes per minute in the API |
| COM-13 | Done | A blocklist for display names and leagues, and a report button |

## Phase 5 · Content and SEO

| ID | Status | Note |
|---|---|---|
| CON-01 | Done | 12 explainers in ES, EN and DE, laid out as magazine articles with numbered sections and a table of contents |
| CON-02 | Done | A 60-term glossary with search; each term has its own page with a worked graphic example |
| CON-03 | Done | The guide "How to understand a race in 10 minutes", in chapters |
| CON-04 | Partial | The system is ready: MDX notes (ES, EN and DE) with the race's real charts (`<StrategyFigure>`, `<PaceFigure>`), an index at `/notes`, links from the home page, the Grand Prix page, "Learn", the sitemap and the newsletter, and Article in JSON-LD. Published: Mexico 2026. The editorial cadence for each Grand Prix is missing |
| CON-05 | Partial | The system is ready: an editorial MDX guide (ES, EN and DE) in `content/circuit-guides/`, figures computed from the data (first edition, laps, fastest race lap), a link from the home page before the Grand Prix and an index at `/learn/circuits`. Published for the four Grands Prix left in 2026: Interlagos, Las Vegas, Lusail and Yas Marina. The remaining circuits are missing, one before each Grand Prix |
| CON-06 | Done | The Tuesday newsletter after each race, composed from the data (the race in 5 lines, a chart, a historical fact, an explainer, the next race), ES, EN and DE lists, the `MAILING` Workflow in batches of 40. Missing: the postal address in the footer (`MAIL_POSTAL_ADDRESS`) and the fortnightly off-season edition. No recipients while the demo newsletter lasts (D-33) |
| NUC-10 | Done | One-line sign-up on the home page and at `/newsletter`, as a demonstration that stores nothing (D-33) |
| CON-07 | Done | Titles, descriptions, canonicals and hreflang |
| CON-08 | Partial | SportsEvent (with end date, postal address, coordinates, image, status and attendance mode), Article (image, URL, linked author), BreadcrumbList and DefinedTerm, with tests for the fields Google asks for. Passing the Rich Results Test, which needs a public URL, is still to do |
| NUC-09 | Done | An explainer suggested from the next circuit and the weekend format, with the reason in one sentence (home page and newsletter) |

## Quality figures

- 189 unit and Workers tests (shared, db, analysis, web, ingest, api).
- 228 browser tests (223 pass and 5 are skipped per project) on desktop, mobile and dark mode, with axe on every page and an internal link check.
- Lint with the D-14 rules (read/write) and against `dangerouslySetInnerHTML` (a single reviewed exception).
- `pnpm audit` with no high-severity vulnerabilities; gitleaks finds nothing in the history.
- GitHub CI green on every push to `main` (lint, types, tests, build and gitleaks).
