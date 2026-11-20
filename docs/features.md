# Paddock Notes: features

> The complete functional specification. Each feature has an identifier, a phase, a priority and a verifiable acceptance criterion.
> Last reviewed: 19 November 2026.

## How to read this document

- **ID:** a stable code to reference the feature in issues, commits and tests (for example, `NUC-03`). The prefixes come from the original Spanish names: NUC (*núcleo*, core), TEC (technical zone), HIS (history), COM (community), CON (content), TRA (*transversal*, cross-cutting).
- **Phase:** 1 MVP · 2 History · 3 Technical zone · 4 Community · 5 Content and SEO · T cross-cutting (every phase).
- **Priority (MoSCoW):** **M** must have · **S** should have · **C** could have · **W** won't have for now.
- **Acceptance criterion:** the condition that must hold for the feature to count as finished.

Phases 1 to 3 are the core of the portfolio. Phases 4 and 5 were only tackled once the core was deployed.

---

## 1. Core: calendar, races and standings

### 1.1 Home

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| NUC-01 | "Next Grand Prix" block with name, circuit, country and round | 1 | M | Shows the first Grand Prix of the current season whose race has not started |
| NUC-02 | Countdown to the race start (days, hours, minutes, seconds) | 1 | M | Updates every second; causes no hydration error; screen readers do not announce it every second |
| NUC-03 | Times of every session of the weekend in the visitor's time zone | 1 | S | Each session shows the visitor's local time and, second, the circuit's |
| NUC-04 | "Live session" state highlighting the active session | 1 | C | Between the start and the estimated end of a session, the block says so |
| NUC-05 | "Last race" block: podium, fastest lap and a link to the Grand Prix page | 1 | M | Visible as soon as the result is in the database |
| NUC-06 | Short standings: drivers' top 5 and constructors' top 3 | 1 | M | Matches the full standings after the last round |
| NUC-07 | End-of-season state: the champion's summary and the date of the next season | 1 | S | When no races remain, the next Grand Prix block is replaced by this summary |
| NUC-08 | Featured note: the latest analysis with its main chart | 3/5 | S | In phase 3 it shows the strategy chart; in phase 5, the post-race note |
| NUC-09 | Explainer suggested for the next circuit | 5 | C | Shows an explainer tagged with that circuit or topic |
| NUC-10 | One-line newsletter sign-up | 5 | S | Double opt-in; accessible success and error messages. Currently a demonstration that stores nothing (D-33) |

### 1.2 Season calendar

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| NUC-11 | List of rounds: number, name, circuit, country, date | 1 | M | Every round of the season, in order |
| NUC-12 | State of each round: raced, next, upcoming, cancelled | 1 | M | The state is computed from the race's UTC date and time |
| NUC-13 | Winner of each race run, linking to its page | 1 | M | The link goes to `/races/[season]/[round]` |
| NUC-14 | Weekend format (standard or sprint) | 1 | S | Sprint rounds carry a visible, textual label |
| NUC-15 | Season picker back to 1950 | 1 | M | Changing the season changes the URL and keeps the language |
| NUC-16 | Export the current season to a calendar (.ics) | 1 | C | The file imports without errors into Google Calendar, Apple Calendar and Outlook |
| NUC-17 | Map view with the season's circuits | 2 | C | Our own SVG map; each dot links to the circuit page |

### 1.3 Grand Prix page

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| NUC-20 | Header: name, circuit, date, round | 1 | M | Consistent with the calendar |
| NUC-21 | Race result: position, driver, team, grid, laps, time or status, points | 1 | M | Matches the source; unclassified drivers show their status ("Engine", "Accident"...) |
| NUC-22 | Positions gained or lost against the grid | 1 | S | Computed as grid minus final position; no value if the driver started from the pit lane or did not finish |
| NUC-23 | Fastest lap marker | 1 | M | A visual and textual indicator, with the lap time |
| NUC-24 | Qualifying (Q1, Q2, Q3) | 2 | M | Each phase's times per driver |
| NUC-25 | Sprint result, if there was one | 2 | M | Only appears on sprint weekends |
| NUC-26 | Pit stops: number, lap and duration per driver | 2 | S | Jolpica since 2011 (time in the pit lane) and OpenF1 since 2023; before 2011 the block does not appear; with missing data, a partial-data notice |
| NUC-27 | Session weather (air and track temperature, rain) | 2 | C | Only since 2023 (OpenF1); before that, the block does not appear |
| NUC-28 | Links to that race's analysis tools | 3 | M | Only links the tools with data available |
| NUC-29 | Navigation: previous and next Grand Prix, and the same Grand Prix in other years | 2 | S | Correct links at the season's edges |

### 1.4 Standings

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| NUC-30 | Drivers' standings: position, driver, team, wins, podiums, points | 1 | M | Matches the source after the last round; podiums are computed from the results stored in D1 |
| NUC-31 | Constructors' standings | 1 | M | Same |
| NUC-32 | Points gap to the leader | 1 | S | A computed column |
| NUC-33 | Race-by-race points progression chart | 2 | M | One line per driver; top 10 by default; free selection; an equivalent accessible table |
| NUC-34 | Driver × race matrix with the position at each Grand Prix | 2 | S | Cells with text, not just colour |
| NUC-35 | Standings after any round ("how did it stand after round 8?") | 2 | C | A round picker with its own URL |
| NUC-36 | Indicator of who can still win the title | 2 | C | A mathematical calculation with the points still in play; tests with edge cases |

### 1.5 Profiles

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| NUC-40 | Driver profile: details, teams per season, race statistics | 2 | M | Races, wins, poles, podiums, points and retirements match the database |
| NUC-41 | Final position per season chart on the driver profile | 2 | S | With an equivalent table |
| NUC-42 | Team profile: history by season, drivers, titles | 2 | M | No logos; only data and typography |
| NUC-43 | Circuit page: our own SVG layout, details, winners by year | 2 | M | Layout generated from OpenF1 `location` if the circuit has races since 2023; otherwise from `bacinger/f1-circuits` (MIT) with attribution (D-09) |
| NUC-44 | Key corners annotated on the layout | 3 | C | Annotations with the corner number and a short note, from `content/circuits/` |

---

## 2. Technical zone (races since 2023)

Every tool reads data **precomputed** after each race from OpenF1 (D-08). No page waits on an external source.

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TEC-01 | Analysis landing page with the latest analysed races | 3 | M | A list ordered by date, linking to each tool |
| TEC-02 | **Tyre strategy:** a timeline with stints per driver, compound and stops | 3 | M | Compounds distinguishable by pattern and text, not only colour; safety car periods marked when there is data |
| TEC-03 | **Race pace:** lap times with the trend per stint | 3 | M | Up to 4 drivers; an option to exclude in and out laps and laps under the safety car |
| TEC-04 | **Telemetry comparison:** two drivers, one lap, speed, brake, throttle and cumulative delta | 3 | M | Views synchronised on hover or with the keyboard; each driver's fastest lap by default; the delta is labelled as an estimate computed from speed |
| TEC-05 | Circuit map coloured by who is faster on each stretch | 3 | M | A textual legend; an alternative table by mini-sector |
| TEC-06 | **Sectors:** a driver × sector matrix with the gap to the best | 3 | S | Toggle between best sector and average sector |
| TEC-07 | **Replay the race:** lap-by-lap positions with play, pause and speed | 3 | S | With `prefers-reduced-motion` it shows a static version navigable by lap |
| TEC-08 | An automatic note under each chart ("what you see") | 3 | M | Generated by rules from the data; never invents causes |
| TEC-09 | A collapsible "How to read this chart" and a link to the explainer | 3 | S | Present in all five tools |
| TEC-10 | Its own URL with the view's state (drivers, lap) | 3 | M | Copying and opening the URL reproduces the same view |
| TEC-11 | A social image generated per view | 3 | S | 1200×630, with source and date |
| TEC-12 | km/h or mph units | 3 | C | Preference remembered in the browser |
| TEC-13 | A data budget per view | 3 | M | < 300 kB compressed per telemetry view |

---

## 3. History

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| HIS-01 | **Head to head** between two drivers | 2 | M | Answers in < 1 s without calling external sources. Since D-35, limited to the current season |
| HIS-02 | Absolute and relative statistics (per race started) | 2 | M | Percentages with their base visible ("12 wins in 150 races") |
| HIS-03 | Career aligned by season (1st, 2nd, 3rd...) | 2 | S | A chart with an equivalent table |
| HIS-04 | Direct duels in shared races | 2 | S | A count of who finished ahead, with the list of races |
| HIS-05 | Record against teammates | 2 | S | Per season and in total |
| HIS-06 | Points recalculated with today's system (optional, labelled) | 2 | C | Always labelled as a recalculation |
| HIS-07 | **Records:** wins, poles, podiums, points, comebacks, retirements, streaks | 2 | M | Each record shows its exact definition and is regenerated after each Grand Prix. Hidden until the history is complete (D-34) |
| HIS-08 | **This week in history** | 2 | S | Anniversaries from the current week; reviewed before being published on the home page or social media |
| HIS-09 | Full navigation of any season since 1950 | 2 | M | Calendar, standings and results for any year |

---

## 4. Community (optional)

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| COM-01 | An account with an email magic link or an external provider | 4 | M | No passwords of our own; a secure session (`HttpOnly`, `Secure`, `SameSite` cookies) |
| COM-02 | A minimal profile: display name, language, optional favourites | 4 | M | Only the data strictly needed |
| COM-03 | Export and delete the account | 4 | M | JSON export; effective and immediate deletion |
| COM-04 | **Predictions:** podium, pole and an optional driver of the day | 4 | M | They close when qualifying (or the sprint) starts |
| COM-05 | Automatic scoring and resolution | 4 | M | Resolved with the official result; recalculated after later penalties |
| COM-06 | Global ranking per season | 4 | M | Ties broken by a published rule |
| COM-07 | Private leagues with an invitation link (at most 50 members) | 4 | S | A ranking and a summary after each Grand Prix |
| COM-08 | **Weekly quiz:** 5 questions with explanations | 4 | S | Playable without an account; with an account it stores the score and streak |
| COM-09 | **Championship simulator** "what if...?" | 4 | S | Works without an account, in the browser; a shareable URL for the scenario |
| COM-10 | Favourites highlighted in tables and charts | 4 | C | A visible and textual highlight |
| COM-11 | Email notices before each Grand Prix and when the analysis is published | 4 | C | May stay simulated in the demo; one-click unsubscribe |
| COM-12 | Bot protection on forms | 4 | M | Verification without visual puzzles (see stack) |
| COM-13 | Filtering and reporting of display names and league names | 4 | S | A blocklist and a report button |

---

## 5. Content and SEO

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| CON-01 | MDX explainers with our own diagrams | 5 | M | 12 published in every language (see `content.md`) |
| CON-02 | Glossary with search | 5 | M | 60 terms in every language; instant search in the browser |
| CON-03 | Beginner's guide "How to understand a race in 10 minutes" | 5 | M | Published in every language |
| CON-04 | Post-race notes | 5 | M | Published within 48 h of each Grand Prix |
| CON-05 | Circuit guides with editorial copy | 5 | S | Published before each Grand Prix |
| CON-06 | Weekly newsletter | 5 | S | Double opt-in; separate lists per language |
| CON-07 | Metadata per page, `hreflang`, canonicals | 5 | M | Validated with SEO tools |
| CON-08 | Structured data (`SportsEvent`, `Article`, `BreadcrumbList`, `DefinedTerm`) | 5 | S | No errors in the Rich Results validator |
| CON-09 | `sitemap.xml` per language and `robots.txt` | 1 | M | Generated automatically; include every public page |
| CON-10 | "About the project" page and case study | 1/5 | M | Explains the project in 30 seconds and links to the repository |

---

## 6. Cross-cutting features

### 6.1 Navigation and search

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-01 | A header with five areas: Races, Standings, Analysis, Head to head, Learn | 1 | M | The current page marked with `aria-current`; only areas with published content appear. Head to head replaced History in D-35 |
| TRA-02 | Breadcrumbs on second-level pages and deeper | 2 | S | With `BreadcrumbList` structured data |
| TRA-03 | Global search with a keyboard shortcut | 2 | S | Drivers, teams, circuits, races, glossary and explainers; results in < 200 ms |
| TRA-04 | Automatic cross-links to profiles | 2 | S | Every driver, team or circuit name links to its page |

### 6.2 Languages and formats

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-10 | Spanish, English and German with `/es`, `/en` and `/de` routes | 1 | M | Every page exists in all three languages (D-29) |
| TRA-11 | Initial redirect by the visitor's country, then `Accept-Language` | 1 | M | Germany and Switzerland to German, Spain to Spanish, everyone else to English (D-36) |
| TRA-12 | A language switcher that keeps the current page | 1 | M | Only the prefix changes |
| TRA-13 | Localised dates, numbers and units | 1 | M | `Intl` with the page's language |
| TRA-14 | 404 and 500 error pages in every language | 1 | M | Shown in the URL's language; English without a prefix |
| TRA-15 | German as a third language | 1 | M | Done (D-29) |

### 6.3 Accessibility (WCAG 2.2 AA)

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-20 | Semantic HTML, a "skip to content" link, visible focus | 1 | M | Keyboard review of every core page |
| TRA-21 | AA contrast in light and dark | 1 | M | Verified after applying the brand |
| TRA-22 | A text alternative and an equivalent table for every chart | 1–3 | M | No data only in the chart |
| TRA-23 | Interactive charts navigable with the keyboard | 3 | M | Arrow keys to move between points; the value announced |
| TRA-24 | Respect for `prefers-reduced-motion` | 1 | M | No animations with the preference on |
| TRA-25 | Accessibility statement | 1 | S | An `/accessibility` page listing the known gaps |

### 6.4 Interface states

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-30 | Loading skeletons shaped like the content | 1 | S | Never a blank screen; only in components that load data on the client, not on whole pages (D-22) |
| TRA-31 | A "no data yet" state with an expected date | 1 | M | For example, a race not yet run |
| TRA-32 | A "stale data" state when ingestion is behind or the database does not answer | 1 | M | Withdrawn from the web app (D-41); the API keeps `X-Data-Stale` (D-06) |
| TRA-33 | A "partial data" state | 2 | S | Says what is missing and why |
| TRA-34 | Core content readable without JavaScript | 1 | S | Only interactive pieces need JS |

### 6.5 Performance, reliability and quality

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-40 | Lighthouse ≥ 90 in all four categories, on mobile | 1 | M | Checked in CI on key pages |
| TRA-41 | LCP < 2.5 s on the home page (mobile, simulated 4G) | 1 | M | Same |
| TRA-42 | Ingestion with a request limit towards external sources | 1 | M | Never more than 400 requests/hour to Jolpica |
| TRA-43 | Our own public API, versioned and documented | 1 | M | OpenAPI available at `/api/v1/docs` |
| TRA-44 | An inbound request limit on the public API | 1 | S | A 429 response with `Retry-After` |
| TRA-45 | Health check and structured logging | 1 | M | `/api/v1/health` and searchable logs |
| TRA-46 | Tests in CI on every pull request | 1 | M | Unit, API, end-to-end and accessibility |
| TRA-47 | Preview deployments per pull request | 1 | S | The preview URL linked in the PR |

### 6.6 Legal and privacy

| ID | Feature | Phase | Prio. | Acceptance criterion |
|---|---|---|---|---|
| TRA-50 | A permanent unofficial-project notice, data attribution and licence | 1 | M | In the footer of every page: sources (Jolpica F1, OpenF1) and the data's CC BY-NC-SA 4.0 licence (D-12) |
| TRA-51 | Privacy, legal notice and accessibility pages | 1 | M | In every language |
| TRA-52 | Cookieless analytics | 1 | M | No consent banner needed |
| TRA-53 | Data processing compliant with GDPR and the Swiss nDSG (if there are accounts or a newsletter) | 4/5 | M | A record of processing activities and contracts with processors |

---

## 7. Our own public API (`/api/v1`)

| Method and route | Returns | Phase |
|---|---|---|
| `GET /seasons` | Seasons with data | 1 |
| `GET /seasons/{season}/schedule` | Calendar | 1 |
| `GET /races/next` | Next Grand Prix | 1 |
| `GET /races/last` | Last race with a result | 1 |
| `GET /seasons/{season}/standings/drivers` | Drivers' standings | 1 |
| `GET /seasons/{season}/standings/constructors` | Constructors' standings | 1 |
| `GET /seasons/{season}/races/{round}` | A race with its result (qualifying, sprint and pit stops included from phase 2) | 1 |
| `GET /seasons/{season}/standings/history` | Points per round | 2 |
| `GET /seasons/{season}/standings/recalculated` | Standings under today's points system | 2 |
| `GET /drivers` · `/drivers/{id}` · `/constructors/{id}` · `/circuits/{id}` · `/circuits/{id}/layout` | Index and profiles | 2 |
| `GET /compare/drivers/{a}/{b}` · `/compare/drivers/{a}/{b}/{season}` | Head to head (whole data or one season) | 2 |
| `GET /records/{type}` | Records | 2 |
| `GET /history/this-week` | This week in history | 2 |
| `GET /search?q=` | Search | 2 |
| `GET /analysis` · `/analysis/{season}/{round}` · `/analysis/{season}/{round}/{tool}` · `.../telemetry/{driver}` | Data for each chart | 3 |
| `GET /quiz/{week}` · `GET /rankings/{season}` · `POST /predictions` · `GET /leagues/{id}` · ... | Community | 4 |
| `GET /health` | Service status | 1 |

**Error contract** (D-06): 400 invalid parameter · 404 no data · 405 method not allowed · 429 inbound limit · 500 internal error · 503 D1 unavailable with no cached copy (with `Retry-After`) · an `X-Data-Stale: true` header when a cached copy is served or ingestion is behind. The API never calls external sources (D-05).

---

## 8. Out of scope

- Live data during the race as the main proposition.
- News, rumours or the driver market.
- User comments or forums.
- Advertising, paid subscriptions or affiliation.
- Official F1 or team logos, photos, typefaces or colours.
- A native mobile app.
