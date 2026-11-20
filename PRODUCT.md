# PRODUCT.md

**register:** product

## Product purpose

An unofficial site that explains Formula 1 with data: the current season race by race, post-race analysis of strategy, pace and telemetry, and plain explanations for people who are still learning the sport. It is non-commercial by licence (D-12): no ads, no payments, no affiliation.

It is also a portfolio work sample. The site has to be good as a product, and the repository has to show how it was built: decisions written down, rules enforced by tests, nothing claimed that the code does not do.

## Users

Primarily **F1 fans who want the why, not the what**: they already know who won and want to understand how. Many are newer to the sport, so jargon is explained the first time it appears.

Secondarily **recruiters and technical leads** reading the repository and opening the site. For them the details matter more than the feature count: the CSP, the read/write boundary, the accessibility checks, the honest empty states.

The product reads in Spanish, English and German. The repository is in English (D-36).

## Voice

Someone who watches the race closely and explains it calmly in the paddock. Close, precise, never exaggerated. Full rules in [docs/content.md](docs/content.md) §2.

- The why before the what: open with the cause or the figure.
- The figure instead of the adjective: "Norris gained 0.2 s in sector 3", not "Norris flew".
- One idea per sentence; under 25 words.
- Jargon is explained once.
- We say what we do not know. Automatic notes never invent causes (TEC-08).

## Anti-references

- Official F1 and team branding: no logos, liveries, team colours or photos. Names appear as data only.
- News and rumour sites: no transfers, no controversies, no clickbait.
- Betting and fantasy dashboards: dense neon numbers, odds, urgency.
- The generic dark analytics template: gradient cards, glowing charts, a hero metric row.

## Strategic principles

1. **Data first, honest about its limits.** Every chart has a source and a date. Missing or partial data is said out loud (TRA-31, TRA-33); stale data shows no banner, by the author's decision (D-41). A record computed over a few seasons is not shown as an F1 record (D-34).
2. **Every chart has a table.** Nothing lives only in a picture (TRA-22). Core content works without JavaScript (TRA-34).
3. **Never wait on someone else's API.** Pages read precomputed data; only ingestion talks to Jolpica and OpenF1 (D-05).
4. **Write the decision down.** Anything non-obvious gets a `D-xx` entry in [docs/decisions.md](docs/decisions.md), and superseded decisions stay in the log.
