# Paddock Notes: brand rules for the code

> An operational summary of brandboard v3 (November 2026) for implementation. The source of truth is [brandboard/](brandboard/): `Brandboard Paddock Notes.dc.html`, the tokens in `brandboard/tokens/globals.css` and the logos in `brandboard/assets/logo/`.
> `Identidad Paddock Notes.dc.html` is version 2 (the previous mark, with the "p" as a marker). Version 3 wins.

## 1. Idea

**Tagline:** "Formula 1, explained with data." (in Spanish, «La Fórmula 1, explicada con datos.»; in German, «Die Formel 1, mit Daten erklärt.»). It is Paddock Notes' tagline everywhere: the footer, the logo's label and the metadata. It is always written this way, with "Formula 1" in full and a full stop.

**The technical drawing's dimension line:** a measuring line between two ticks with the value written above it. It is used for the countdown (the gap until the start), to annotate a stretch on a chart or an undercut in a strategy. "Notes" is the gesture: the value written over the measurement.

## 2. Logo

- Mark: a single-weight "pn" ligature, slanted 12°, with a lime square as the full stop. 48-unit grid, 6-unit stroke, arcs of radius 7.
- The logo lives **on black**. On white it is all black, without lime.
- Versions (SVG with outlined text): horizontal, vertical, compact, wordmark and mark, each in `-sobre-negro` (on black), `-blanco` (white) and `-negro` (black).
- Mobile header: the compact version at 24 px high. Below 24 px, the mark alone.
- Clear space: the mark's x-height on each side.
- **Not allowed:** lime on white, inverted colours, stretching or squashing, rounding the dot.
- Favicon (`brandboard/favicon.svg`) and avatars, always on black.

## 3. Colour

- Black and lime, with lilac as an occasional accent. Proportion: black 80 %, off-white and greys 16 %, lime 3 %, lilac 1 %.
- **Lime and lilac only appear on black**, and only mark what deserves attention: key figures, notes, dimension lines and active state. Never as a large background, a gradient or a glow.
- Lime and lilac are never in the same element or in the logo. The only exception, decided by the author: the logo's animated lap on hover (or focus) is lilac; the dot stays lime.
- **Header and hero always on black**, in light mode too: the `data-surface="ink"` attribute.
- In light mode: background `#FFFFFF`, text `#0A0A0A`, secondary `#5A5A5A`, black accent; dark lilac `#6A3FC8` as the secondary accent.
- `--line` is for borders and grids only, never for text.
- **No one-sided rules** in colour or heavier than the rest (a side, top or bottom strip marking a block). To emphasise: a background (black or grey), a full 1 px border, a pictogram or nothing.

The tokens are copied verbatim from `brandboard/tokens/globals.css` to `apps/web/app/globals.css`.

## 4. Typography

- **Archivo** (SIL OFL), variable in weight and width, **self-hosted** (the CSP does not allow Google Fonts, see `security.md` §4.1).
- Two widths: semi-condensed (`font-stretch: 87.5%`) for headlines, large figures and the logo; normal (100 %) for body text, UI and tables.
- Body: 400, 17/27 px, at most 68 characters per line (`--measure`).
- Tabular figures (`font-variant-numeric: tabular-nums`) in tables, times and the countdown.
- No letter-spaced capitals and no monospace.

| Token | px | Weight · width | Use |
|---|---|---|---|
| `--step-count` | 44–112 | 600 · 87.5 | Countdown |
| `--step-5` | 40–80 | 700 · 87.5 | Grand Prix name |
| `--step-4` | 36–56 | 700 · 87.5 | Article title |
| `--step-3` | 28–36 | 700 · 87.5 | h2 |
| `--step-2` | 26 | 700 · 87.5 | h3, home sections |
| `--step-1` | 21 | 400 · 100 | Lede |
| `--step-0` | 17 | 400 · 100 | Body |
| `--step--1` | 15 | 400–600 · 100 | UI, tables, notes |
| `--step--2` | 13 | 400–500 · 100 | Axes, chart captions |

## 5. Charts

| Element | Rule |
|---|---|
| Categorical series | Six (`--data-1` to `--data-6`), each with its own marker and stroke: circle/solid, square/long dash, triangle/dotted, diamond/dash-dot, cross/short dash, ring/thin solid. No combination reproduces a team's livery |
| Sequential | `--seq-1` to `--seq-7`: speed on the map, throttle, degradation |
| Diverging | `--div-loss-*` (losing time, lilac) ↔ `--div-mid` ↔ `--div-gain-*` (gaining time); the + or − sign always goes with the colour |
| Axes | Only the zero or base line; the unit once, on the last value ("4.3 km") |
| Grid | Horizontal, 1 px in `--line`, three to five lines; no vertical grid except dashed sector boundaries |
| Labels | Direct, at the end of each series, instead of a legend; 13 px, tabular figures, secondary colour |
| Weight | Series 2 px; the protagonist 3 px; references 1 px; 8 px markers every N points |
| Notes | The brand's signature: Archivo 600 in `--accent`, anchored with a 9 px dot with a halo of the background colour; a stretch is marked with the dimension line (a 2 px line with end ticks). At most two notes per chart, twelve words at most, in the present tense |
| Empty state | The chart's frame stays, dashed, and a one-sentence note says why there is no data and when there will be. No illustrations |
| Phones | A narrow geometry (380 units) with fewer ticks and codes for end labels, never the wide one scaled down: labels stay at 10 px or more (D-37) |

## 6. Voice

Matches [content.md](content.md) §2. Five rules from the brandboard: the why before the what · the figure instead of the adjective · one idea per sentence · jargon is explained once · we say what we do not know.

## 7. Reference applications

- `brandboard/Home.dc.html`: home page with the header and hero on black, the countdown as a dimension line, the circuit's and the visitor's local times, the drivers' top five and a sample chart from the technical zone.
- `brandboard/OG Post-carrera.dc.html`: a 1200×630 image with the headline on the left and a chart with its two notes on the right. Variable fields: headline, lede, round, chart and notes.

## 8. Open questions from the brandboard

Brandboard v2 left questions for the author. Those the documents already answer:

| Question | Answer |
|---|---|
| Start time: the circuit's and the visitor's local time, or just the visitor's? | Both: the visitor's in the foreground and the circuit's second (NUC-03) |
| Default language and language in the URL | Chosen by country (D-36); `/es`, `/en` and `/de` routes (TRA-10, TRA-11) |
| Domain | `paddocknotes.dev` proposed (D-20) |
| Real driver and team names in tables | Yes, as text and without colours or logos (`content.md` §1.7) |

Still open for the author: the social media handle and final sign-off on the lime `#C6F432` (it must not recall any team).
