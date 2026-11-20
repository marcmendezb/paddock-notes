# DESIGN.md

The system comes from brandboard v3 ([docs/brandboard/](docs/brandboard/)); the rules the code must follow are in [docs/brand.md](docs/brand.md). Tokens live in `apps/web/app/globals.css`, copied from `docs/brandboard/tokens/globals.css` without changes.

## Color

**Strategy: black and lime, with lilac as an occasional accent.** Proportion: black 80 %, off-white and greys 16 %, lime 3 %, lilac 1 %.

| Token | Light | Dark and ink | Role |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#0A0A0A` | Page ground |
| `--surface` | `#F5F5F5` | `#161616` | Cards, bands, favourites |
| `--text` | `#0A0A0A` | `#F5F5F5` | Primary text |
| `--muted` | `#5A5A5A` | `#A3A3A3` | Secondary text |
| `--line` | `#DADADA` | `#2A2A2A` | Borders and grids only, never text |
| `--accent` | `#0A0A0A` | `#C6F432` | Lime: what deserves attention, and live |
| `--accent-2` | `#6A3FC8` | `#B98CFF` | Lilac: next, and the second series |

**Lime and lilac only on black.** On white the accent is black. The header, the hero and the footer are always black, in light mode too (`data-surface="ink"`). Lime and lilac never share an element.

**Status colours:** next is always lilac, live is always lime (D-28).

Charts use their own scales: six categorical series, each with its own marker and stroke so none depends on hue alone; a sequential lime scale for speed; a diverging scale for gaining and losing time, always with a sign (brand.md §5).

Every pairing clears WCAG AA in both themes, checked with axe in the browser tests, dark mode included.

## Typography

**Archivo** (SIL OFL), self-hosted because the CSP does not allow Google Fonts. One family, two widths: semi-condensed (`font-stretch: 87.5%`) for headlines, large figures and the logo; normal width for body text, UI and tables. Tabular figures in tables, times and countdowns. No letter-spaced capitals and no monospace.

The scale runs from `--step--2` (13 px, chart axes) to `--step-count` (44 to 112 px, the countdown). Body is 17/27 px with a 68-character measure.

## Layout

Dense where the data is (timing-screen tables, standings, telemetry), generous around the reading (explainers, notes, circuit guides). Grid items always get `minmax(0, 1fr)` or `min-inline-size: 0`, so long names never push the page wider than the screen.

The dimension line from technical drawing is the recurring motif: the countdown, a stretch on a chart, an undercut in a strategy.

## Motion

`--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` on almost everything. Only `transform`, `opacity` and `clip-path` animate. Scroll-linked effects use CSS `animation-timeline`; smooth scrolling uses Lenis, with our own anchor handling (D-30). One page transition (a two-layer curtain) and one entrance per session.

Everything goes still under `prefers-reduced-motion`. Browser tests run with reduced motion and check the page at rest.

## Bans for this project

- No inline `style=""` and no `dangerouslySetInnerHTML` (D-04). Positions go through SVG attributes or the CSSOM.
- No one-sided rules in colour or a heavier weight. Emphasis is a background, a full 1 px border, a pictogram or nothing.
- No lime on white, no gradient backgrounds, no glows, no glass.
- No official F1 or team logos, colours or photos.
- No focus rings by the author's decision, but focus stays visible (WCAG 2.4.7): an underline, a background or the logo turning lilac.
