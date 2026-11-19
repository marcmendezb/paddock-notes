# Paddock Notes: content

> All of the site's content: voice, copy for each page, editorial formats, the initial inventory, templates, microcopy and SEO.
> Last reviewed: 19 November 2026. The product is written in Spanish, English and German (D-29); the tables below give the Spanish and English base copy, and German follows the same rules (informal *du*).

## 1. Content principles

1. **The first sentence answers: the why before the what.** The result is already known; we open with the cause or the figure (brandboard v3).
2. **Every figure with a source and a date.** Every chart carries its source and date underneath.
3. **Explain, do not impress.** Technical terms are used only when they add something, and explained the first time.
4. **No news or rumours.** Paddock Notes analyses what already happened; it does not speculate about transfers or controversies.
5. **Truly multilingual.** Each language is written separately and every version is reviewed. No unreviewed machine translation is published.
6. **Honest about limits.** If a figure is missing, incomplete or old, we say so.
7. **No official elements.** Team and driver names appear as data, never as visual branding.

## 2. Voice and tone

**Voice:** someone who watches the race closely and explains it calmly in the paddock. Close, precise, never exaggerated.

| We do | We avoid |
|---|---|
| "Norris gained 0.2 s in sector 3." | "Norris flew through sector 3!" |
| "The stop on lap 18 gave him the position." | "A masterful strategy." |
| "With this data we can't tell why." | Inventing causes the data does not show |
| Informal address: *tú* in Spanish, *du* in German, "you" in English | A sales tone, superlatives, clickbait |
| Sentences under 25 words | Paragraphs of more than 3 sentences |

**Conventions:**

- Terms fans use in English stay in English in every language: *undercut*, *overcut*, *stint*, DRS (only for 2011 to 2025), *safety car* (with «coche de seguridad» the first time in Spanish). Since 2026: "overtake mode" («modo adelantamiento») and *Boost*.
- Times in F1 notation: `1:22.167` (minutes:seconds.thousandths), the same in every language.
- Gaps in seconds with a sign: `+0,214 s` (ES, DE) / `+0.214 s` (EN).
- Positions: "P3" in tables and charts; "third" in running text.
- Dates: «16 mar 2025» (ES) / "Mar 16, 2025" (EN) / «16. März 2025» (DE).
- Drivers' full names the first time, surname afterwards.
- Sentence case for titles and buttons.
- Neutral wording about people: no gendered pronouns where the data does not need them.

## 3. Copy per page

Base UI copy in ES and EN. Text in `{braces}` is a variable. The live strings are in `apps/web/lib/i18n.ts`.

### 3.1 Shared elements

| Element | ES | EN |
|---|---|---|
| Name | Paddock Notes | Paddock Notes |
| Tagline (brandboard v3) | La Fórmula 1, explicada con datos. | Formula 1, explained with data. |
| Navigation | Carreras · Clasificación · Análisis · Cara a cara · Aprende | Races · Standings · Analysis · Head to head · Learn |
| Skip to content | Saltar al contenido | Skip to content |
| Language switcher | ES · EN · DE | ES · EN · DE |
| Footer: notice | Proyecto no oficial, sin afiliación con Formula 1 ni con ningún equipo. | Unofficial project, not affiliated with Formula 1 or any team. |
| Footer: data | Datos: Jolpica F1 y OpenF1, con licencia CC BY-NC-SA 4.0. | Data: Jolpica F1 and OpenF1, licensed CC BY-NC-SA 4.0. |
| Footer: links | Sobre el proyecto · Privacidad · Aviso legal · Accesibilidad · Código en GitHub | About · Privacy · Legal notice · Accessibility · Code on GitHub |
| Source under a chart | Fuente: {fuente}. Actualizado el {fecha}. | Source: {source}. Updated {date}. |

### 3.2 Home

| Block | ES | EN |
|---|---|---|
| Next Grand Prix: label | Próximo Gran Premio | Next Grand Prix |
| Next Grand Prix: subtitle | {circuito} · {ciudad}, {país} · Ronda {n} de {año} | {circuit} · {city}, {country} · Round {n} of {year} |
| Countdown: units | días · horas · min · s | days · hours · min · s |
| Countdown: finished | La carrera ya ha empezado. | The race has started. |
| Live session | En curso: {sesión} | Live now: {session} |
| Times | Horarios en tu zona horaria ({zona}) | Times in your time zone ({zone}) |
| Last race | Así acabó {GP} | How {GP} finished |
| Link to analysis | Ver el análisis de la carrera | See the race analysis |
| Short standings | Pilotos: los cinco primeros | Drivers: top five |
| Standings link | Ver la clasificación completa | See full standings |
| End of season | {campeón} es campeón del mundo de {año}. La próxima temporada empieza el {fecha}. | {champion} is the {year} world champion. Next season starts on {date}. |
| Newsletter | Un gráfico y una explicación después de cada carrera. | One chart and one explanation after every race. |

### 3.3 Calendar

- **Title:** Calendario {año} / {year} calendar.
- **Columns:** Ronda, Gran Premio, Circuito, Fecha, Ganador / Round, Grand Prix, Circuit, Date, Winner.
- **States:** Disputada, Próxima, Pendiente, Cancelada, Sprint / Completed, Next, Upcoming, Cancelled, Sprint.
- **Export:** Añadir al calendario (.ics) / Add to calendar (.ics).
- **Picker:** Temporada / Season.

### 3.4 Grand Prix page

- **SEO title:** Resultados del {GP} {año}: clasificación, vuelta rápida y estrategia / {year} {GP} results: classification, fastest lap and strategy.
- **Automatic lede:** «{Ganador} ganó el {GP} {año} por delante de {P2} y {P3}. La vuelta rápida fue de {piloto} ({tiempo}).» / "{Winner} won the {year} {GP} ahead of {P2} and {P3}. {Driver} set the fastest lap ({time})."
- **Sections:** Resultado · Clasificación · Sprint · Paradas · Clima · Análisis / Result · Qualifying · Sprint · Pit stops · Weather · Analysis.
- **Result columns:** Pos., Driver, Team, Grid, +/−, Laps, Time or status, Points.
- **Navigation:** Previous Grand Prix · Next Grand Prix · The {GP} in other years.

### 3.5 Standings

- **Title:** Clasificación {año} / {year} standings.
- **Tabs:** Pilotos · Constructores / Drivers · Constructors.
- **Columns:** Pos., Piloto, Equipo, Victorias, Podios, Puntos, A líder / Pos., Driver, Team, Wins, Podiums, Points, Gap.
- **Chart:** Así evolucionó el campeonato, carrera a carrera / How the championship unfolded, race by race.
- **Title in play:** Aún pueden ganar el título: {pilotos} / Still in title contention: {drivers}.

### 3.6 Profiles

- **Driver:** {name}. Lede: "{name} ({nationality}) has started {n} Grands Prix since {year}, with {w} wins and {p} podiums." Always followed by the years the data covers (D-34).
- **Team:** {name}. Lede: "{name} has raced in {n} seasons, with {w} wins."
- **Circuit:** {name}. Lede: "{name}, in {city}, is {km} km long and has hosted {n} Grands Prix since {year}."

Automatic ledes only use data from the database; if a figure is missing, the sentence is rephrased without it.

### 3.7 Technical zone

| Tool | Title (ES / EN) | Question it answers |
|---|---|---|
| Strategy | Estrategia de neumáticos / Tyre strategy | Who stopped, when and on which tyre? |
| Pace | Ritmo de carrera / Race pace | Who was really faster, lap after lap? |
| Telemetry | Comparador de telemetría / Telemetry comparison | Where does one driver gain time over another? |
| Sectors | Análisis de sectores / Sector analysis | Which part of the circuit decided the gap? |
| Replay the race | Revive la carrera / Race replay | How did the positions change lap by lap? |

**"How to read this chart"** (example, strategy): "Each row is a driver. Each stretch is a stint: the period between two stops. The pattern shows the tyre. Vertical lines mark the stops."

**Automatic note templates** (generated by rules, never inventing causes):

- Strategy: "{n} drivers stopped once and {m} twice. The winner's strategy was {compounds}."
- Pace: "In the last stint, {driver A} was {x} s per lap faster on average than {driver B}."
- Telemetry: "{A} gained {x} s in sector {n}. The biggest gap is under braking for turn {c}."
- Sectors: "{A} was fastest in {n} of 3 sectors."

### 3.8 Head to head and history

- **Head to head:** {A} contra {B} / {A} vs {B}. Since D-35 it covers the current season only, and the header says so: "This season only ({year}): every race run up to round {n}."
- **Records:** each record with its definition. Example: "Biggest comeback: positions gained between the grid and the flag in one race. Drivers starting from the pit lane do not count." Hidden until the history is complete (D-34).
- **This week in history:** "On {day} {year}, {fact}."

### 3.9 About the project (draft)

> Paddock Notes is a personal, unofficial project that explains Formula 1 with data. I built it to show how I design a complete data product: our own API over public sources, hand-made visualisations, an accessible multilingual site and a measurable content strategy.
>
> **What is behind it:** Next.js and React on Cloudflare, a database with Formula 1 history and analyses precomputed after every race.
>
> **Where the data comes from:** Jolpica F1 (results and history) and OpenF1 (timing since 2023), both licensed CC BY-NC-SA 4.0. Paddock Notes' data and charts are published under the same licence. Layouts of circuits without recent data: `bacinger/f1-circuits` (MIT).
>
> **How it was made:** the code is open (MIT licence) and the decisions are documented in the repository.
>
> **Who makes it:** {name}, developer and marketer. {link to portfolio and contact}.

## 4. Editorial formats

| Format | Length | Frequency | Goal |
|---|---|---|---|
| Post-race note | 600 to 900 words, 2 or 3 charts | Tuesday after each Grand Prix | Return visits and the newsletter |
| Explainer | 800 to 1,200 words, 1 diagram | 2 a month at the start | SEO by search intent |
| Glossary entry | 40 to 120 words, plus a worked graphic example | Ongoing | Short searches, internal linking |
| Circuit guide (editorial) | 300 to 500 words | The Monday before each Grand Prix | The weekend preview |
| Beginner's guide | ~1,500 words | Once, reviewed every season | Bringing in new fans |
| This week in history | 3 to 5 short anniversaries | Weekly | Social media and the home page |
| Weekly quiz (phase 4) | 5 questions | Weekly | Retention |

## 5. Editorial templates

### 5.1 Post-race note

```
Title: {One sentence with the main finding}  (e.g. "The lap 18 stop decided Monza")
Lede (1 or 2 sentences): what happened and why it matters for the championship.

1. The result in one line (podium, main surprise).
2. The key moment: the chart that explains it + 2 paragraphs.
3. What TV didn't show: a second chart (pace, sectors or telemetry).
4. What changes in the championship: the points gap and who is still in the fight.
5. To understand it better: a link to an explainer.

Footer: sources, date, links to that race's interactive tools.
```

### 5.2 Explainer

```
Title: the question as people search it (e.g. "What is the undercut in F1?")
First sentence: the complete answer in under 30 words.

1. The idea, with our own diagram.
2. A real example from a race (linking to its analysis).
3. When it works and when it doesn't.
4. How to see it in our charts.
5. Related terms (links to the glossary).

Metadata: search intent, keywords per language, glossary terms linked.
```

### 5.3 Glossary entry

```
Term (ES) / Term (EN) / Begriff (DE)
Definition in 1 or 2 sentences.
A short example and a worked graphic.
See also: {terms} · Explainer: {link}
```

### 5.4 Circuit guide (editorial)

```
1. The circuit in one sentence (what makes it different).
2. Key corners (3 or 4), with the annotated layout.
3. What kind of car it favours and why.
4. The usual strategy: typical stops and tyres.
5. Figures: length, laps, first edition, lap record.
6. A historic moment.
```

### 5.5 Newsletter

```
Subject: {the race's finding in < 60 characters}
Preheader: {a second idea}

1. The race in 5 lines.
2. The chart of the week (image + one sentence + link).
3. A historical fact.
4. To understand it: an explainer.
5. Next race: Grand Prix, date and time in the list's default time zone.

Footer: non-affiliation notice, one-click unsubscribe, the controller's address.
```

### 5.6 Social media

- **Post with a chart:** the finding in one sentence + the chart (square 1080×1080 and portrait 1080×1350) + a link to the interactive view.
- **Post-race carousel:** 1 cover with the finding · 3 charts · 1 closing slide with a link.
- **Anniversary:** "On this day in {year}: {fact}."
- Always with discreet branding and the source on the image.

## 6. Initial explainer inventory (12)

| # | Title ES / EN | Search intent | Key points | Own visual |
|---|---|---|---|---|
| 1 | ¿Qué es el undercut y el overcut? / What are the undercut and overcut? | "undercut f1 qué es" | Stopping earlier to use the new tyre; staying out with a clear track; when each one works | Two timelines with the laps before and after the stop |
| 2 | Por qué se degradan los neumáticos / Why tyres degrade | "degradación neumáticos f1" | Wear, temperature, graining and blistering; the effect on lap time | Pace per lap with the degradation slope |
| 3 | Los compuestos de neumático / F1 tyre compounds | "neumáticos f1 colores" | Dry (soft, medium, hard), intermediate and wet; the obligation to use two dry compounds (checked against the regulations when written, §13) | A visual table of compounds with patterns |
| 4 | Cómo funciona la clasificación / How qualifying works | "clasificación f1 q1 q2 q3" | Three phases, eliminations, the starting grid | An elimination funnel with times |
| 5 | El formato sprint / The sprint format | "carrera sprint f1 cómo funciona" | Weekend schedule, points, parc fermé (checked against the regulations when written, §13) | A standard weekend compared with a sprint weekend |
| 6 | Safety car y VSC / Safety car and VSC | "safety car f1 estrategia" | What it neutralises, why it makes the stop cheaper | Gaps before and after the safety car |
| 7 | El aire sucio / Dirty air | "aire sucio f1" | Loss of downforce when following another car; why overtaking is hard | A simplified airflow diagram |
| 8 | Cómo leer un gráfico de telemetría / How to read telemetry | "telemetría f1 explicada" | Speed, brake, throttle, gears; where time is gained | Annotated telemetry from a real lap |
| 9 | Cómo se reparten los puntos / How points work | "sistema de puntos f1" | The current system and historical changes; the fastest lap scored a point from 2019 to 2024 and stopped in 2025 | A timeline of points systems |
| 10 | Sanciones en F1 / F1 penalties | "penalización 5 segundos f1" | Time, drive-through, stop-and-go, grid, super licence penalty points | A table of penalties and their effect |
| 11 | Qué es el delta / What is the delta | "delta f1 qué significa" | The cumulative time difference; how it is computed | A delta curve over a lap |
| 12 | Del DRS al modo adelantamiento / From DRS to overtake mode | "drs f1 cómo funciona", "overtake mode f1" | Since 2026 DRS no longer exists: a car within one second gets extra electrical energy (overtake mode), usable anywhere; Boost deploys full power. DRS (2011 to 2025) as historical context | Overtake mode compared with DRS |

The regulation explainers (3, 5, 9, 10 and 12) are checked against the regulations in force on the day they are written and reviewed at the start of each season. The 2026 facts already verified are in D-21.

## 7. Initial glossary (60 terms)

Each term has a definition, an example, a worked graphic and links (template 5.3). Terms marked † depend on the regulations and are verified before publishing.

**Race and strategy (11)**
1. Undercut
2. Overcut
3. Stint
4. Pit stop
5. Pit window
6. Double stack
7. Team orders
8. Safety car
9. Virtual safety car
10. Red flag
11. Formation lap

**Tyres (10)**
12. Compound
13. Soft, medium and hard tyres
14. Intermediate tyre
15. Full wet tyre
16. Degradation
17. Graining
18. Blistering
19. Operating window
20. Tyre cliff
21. Two-compound rule †

**Aerodynamics and the car (10)**
22. Downforce
23. Drag
24. Dirty air
25. Slipstream (tow)
26. Ground effect
27. Porpoising
28. Front wing
29. Rear wing
30. Diffuser
31. Overtake mode (formerly DRS) †

**Regulations (10)**
32. Parc fermé †
33. Track limits
34. 5- and 10-second penalty †
35. Drive-through penalty
36. Stop-and-go penalty
37. Grid penalty
38. Penalty points (super licence) †
39. Cost cap †
40. Stewards
41. 107% rule †

**Timing and data (10)**
42. Delta
43. Sector
44. Mini-sector
45. Fastest lap
46. Telemetry
47. Speed trap
48. Interval
49. Gap to leader
50. Race pace
51. Out-lap and in-lap

**Paddock and the weekend (9)**
52. Paddock
53. Pit wall
54. Starting grid
55. Pole position
56. Pit lane start
57. Driver of the day
58. Lift and coast
59. Sandbagging
60. Dirty side of the grid

## 8. Beginner's guide: "How to understand a race in 10 minutes"

1. **The weekend:** practice, qualifying and the race (and the sprint, when there is one).
2. **Who competes:** teams with two drivers; the drivers' and constructors' championships.
3. **How you win:** points per position and why the grid matters.
4. **Tyres:** the factor that changes a race the most.
5. **Pit stops:** why everyone stops and what the undercut is.
6. **Flags and the safety car:** what each one means.
7. **How to read the timing screen:** intervals, gaps and sectors.
8. **How to follow a race on Paddock Notes:** what to look at before, during and after.

Each chapter: 150 to 200 words, a visual and a link to its explainer.

## 9. Microcopy

| Situation | ES | EN |
|---|---|---|
| Data error | No hemos podido cargar estos datos. Vuelve a intentarlo en unos minutos. | We couldn't load this data. Try again in a few minutes. |
| Stale data | Datos de hace {n} horas: todavía no hemos podido actualizarlos. | Data from {n} hours ago: we haven't been able to update it yet. |
| No data yet | Esta carrera aún no se ha disputado. Volverá a haber datos el {fecha}. | This race hasn't happened yet. Data will be here on {date}. |
| Partial data | Faltan los datos de {qué} para esta carrera. | {What} data is missing for this race. |
| Telemetry before 2023 | El análisis técnico solo está disponible desde 2023. | Technical analysis is only available from 2023. |
| 404 | No encontramos esta página. Prueba con la búsqueda o vuelve al inicio. | We couldn't find this page. Try searching or go back home. |
| 500 | Algo ha fallado por nuestra parte. Ya lo estamos registrando; prueba de nuevo en un momento. | Something went wrong on our side. It's been logged; try again in a moment. |
| Search without results | Sin resultados para «{q}». Prueba con un apellido o un circuito. | No results for "{q}". Try a surname or a circuit. |
| Newsletter: demo notice (D-33) | Esto es un proyecto de portfolio: tu email no se ha guardado en ningún sitio y no recibirás nada. | This is a portfolio project: your email hasn't been stored anywhere and you won't receive anything. |
| Prediction closed (phase 4) | Las predicciones para {GP} se cerraron al empezar la clasificación. | Predictions for {GP} closed when qualifying started. |
| Copy link | Enlace copiado | Link copied |

**Buttons:** See analysis · Compare · Add to calendar · Subscribe · Copy link · Play · Pause · Back to the calendar.

## 10. Legal pages (minimum content)

- **Legal notice:** the controller (name and contact), the non-commercial nature, non-affiliation with Formula 1 or the teams, attribution of the data sources and their licence (CC BY-NC-SA 4.0), the licence of the derived data (the same) and of the code (MIT).
- **Privacy:** which data is processed in each phase (no personal data in phases 1 to 3; email for the newsletter, though the demo stores nothing; the account in phase 4), the legal basis, processors (Cloudflare and any added later), retention, rights and contact. GDPR and nDSG.
- **Accessibility:** the target level (WCAG 2.2 AA), the current state, known issues (including the exceptions in D-27 and D-33), a contact to report barriers.

These texts are no substitute for advice from a legal professional.

## 11. SEO

### 11.1 Title and description patterns

| Page | Title (ES) | Description (ES) |
|---|---|---|
| Home | Paddock Notes · F1 explicada con datos | Calendario, resultados y análisis visual de cada Gran Premio de Fórmula 1. |
| Calendar | Calendario F1 {año}: fechas y horarios | Todas las carreras de la temporada {año} con horarios en tu zona horaria. |
| Grand Prix | Resultados {GP} {año}: clasificación y estrategia | Resultado completo, vuelta rápida, paradas y análisis del {GP} {año}. |
| Standings | Clasificación F1 {año}: pilotos y constructores | Puntos, victorias y evolución del campeonato {año} carrera a carrera. |
| Driver | {Piloto}: estadísticas y carrera en F1 | Victorias, poles, podios y trayectoria de {piloto} en la Fórmula 1. |
| Head to head | {A} vs {B}: comparación en F1 | Estadísticas, duelos directos y trayectoria de {A} y {B}. |
| Explainer | {Pregunta} | {Respuesta en una frase} |
| Glossary | {Término}: qué significa en F1 | {Definición breve} |

English and German follow the same patterns.

### 11.2 Initial keywords by intent

- **Informational (explainers):** undercut f1, tyre degradation, safety car strategy, how f1 qualifying works, f1 telemetry.
- **Navigational/data (templates):** {country} gp results {year}, f1 standings {year}, f1 calendar {year}, {driver} stats.
- **Comparative:** {driver} vs {driver}.

The full keyword map will be built with real volume data before phase 5.

## 12. Editorial calendar for a weekend

| Moment | Piece | Channel |
|---|---|---|
| The Monday before | Circuit guide + a related explainer | Web, social |
| Thursday | This week in history | Web, social |
| Friday | The weekend's schedule | Web, social |
| Sunday, after the race | Strategy chart (automatic) | Web, social |
| Tuesday | Post-race note | Web, newsletter |
| Thursday | Weekly quiz (phase 4) | Web |

Off-season: a fortnightly newsletter, explainers and history pieces.

## 13. Editorial flow and quality control

**Where each piece is written:**

- **Post-race note:** `apps/web/content/notes/{es,en,de}/{slug}.mdx`, plus its entry (title, lede, date, race and explainer) in `packages/shared/src/notes.ts` and the import in `apps/web/content/notes.ts`. Charts are inserted with `<StrategyFigure season={…} round={…} caption="…" />` and `<PaceFigure season={…} round={…} drivers={[…]} caption="…" />`: they render with the real data, their equivalent table and the link to the tool.
- **Circuit guide:** `apps/web/content/circuit-guides/{es,en,de}/{id}.mdx`, registered in `apps/web/content/circuit-guides.ts`. No figures in the text: the page draws the first edition, laps and fastest lap from the data.
- **Corner notes:** `apps/web/content/circuits.ts`, placed by their position in the lap (`at`) and checked against the telemetry.

1. **Draft** in MDX on a branch of the repository.
2. **Data check:** every figure checked against the database or the source; regulations verified where relevant.
3. **Style review:** the first sentence answers, short sentences, terms explained.
4. **The other languages** written and reviewed.
5. **Accessibility:** alt text for every visual, an equivalent table if there is a chart.
6. **SEO:** title, description, internal links, structured data.
7. **Pull request** with a preview; published on merge.

**Checklist before publishing:**

- [ ] The first sentence answers the title's question.
- [ ] Every figure has a source.
- [ ] No claims the data does not support.
- [ ] ES, EN and DE published and reviewed.
- [ ] Every visual has a text alternative.
- [ ] Links to the glossary and related tools.
- [ ] No logos, photos or official elements.
