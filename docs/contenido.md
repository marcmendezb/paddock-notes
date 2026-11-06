# Paddock Notes — Contenido

> Todo el contenido del sitio: voz, textos de cada página, tipos de pieza editorial, inventario inicial, plantillas, microcopy y SEO.
> Última revisión: 5 de noviembre de 2026.

## 1. Principios de contenido

1. **La primera frase responde: el porqué antes que el qué.** El resultado ya se sabe; abrimos con la causa o con el dato (brandboard v3).
2. **Cada dato con fuente y fecha.** Cada gráfico lleva fuente y fecha debajo.
3. **Explicar, no impresionar.** Se usan términos técnicos solo cuando aportan, y se explican la primera vez.
4. **Sin noticias ni rumores.** Paddock Notes analiza lo que ya pasó; no especula sobre fichajes ni polémicas.
5. **Bilingüe de verdad.** Español e inglés se escriben por separado y se revisan los dos. No se publica una traducción automática sin revisar.
6. **Honesto con los límites.** Si un dato falta, está incompleto o es antiguo, se dice.
7. **Sin elementos oficiales.** Los nombres de equipos y pilotos aparecen como dato, nunca como marca visual.

## 2. Voz y tono

**Voz:** la de alguien que ve la carrera con atención y te la explica con calma en el paddock. Cercana, precisa, sin exageración.

| Hacemos | Evitamos |
|---|---|
| "Norris ganó 0,2 s en el sector 3." | "¡Norris voló en el sector 3!" |
| "La parada en la vuelta 18 le dio la posición." | "Una estrategia magistral." |
| "Con estos datos no se puede saber por qué." | Inventar causas que los datos no muestran |
| Tutear al lector en español; "you" en inglés | Tono de venta, superlativos, clickbait |
| Frases de menos de 25 palabras | Párrafos de más de 3 frases |

**Convenciones:**

- Términos que la afición usa en inglés se mantienen en inglés en ambos idiomas: *undercut*, *overcut*, *stint*, DRS (solo para 2011–2025), *safety car* (con "coche de seguridad" la primera vez en español). Desde 2026: "modo adelantamiento" (*overtake mode*) y *Boost*.
- Tiempos con la notación de la F1: `1:22.167` (minutos:segundos.milésimas), igual en ES y EN.
- Diferencias en segundos con signo: `+0,214 s` (ES) / `+0.214 s` (EN).
- Posiciones: "P3" en tablas y gráficos; "tercero" en el texto corrido.
- Fechas: "16 mar 2025" (ES) / "Mar 16, 2025" (EN).
- Nombres de pilotos completos la primera vez, apellido después.
- Mayúscula solo al inicio de la frase en títulos y botones.

## 3. Textos por página

Textos base de la interfaz en ES y EN. Los textos entre `{llaves}` son variables.

### 3.1 Elementos comunes

| Elemento | ES | EN |
|---|---|---|
| Nombre | Paddock Notes | Paddock Notes |
| Lema (brandboard v3) | F1 explicada con datos | F1, explained with data |
| Navegación | Carreras · Clasificación · Análisis · Histórico · Aprende | Races · Standings · Analysis · History · Learn |
| Saltar al contenido | Saltar al contenido | Skip to content |
| Selector de idioma | English | Español |
| Pie: aviso | Proyecto no oficial, sin afiliación con Formula 1 ni con ningún equipo. | Unofficial project, not affiliated with Formula 1 or any team. |
| Pie: datos | Datos: Jolpica F1 y OpenF1, con licencia CC BY-NC-SA 4.0. | Data: Jolpica F1 and OpenF1, licensed CC BY-NC-SA 4.0. |
| Pie: enlaces | Sobre el proyecto · Privacidad · Aviso legal · Accesibilidad · Código en GitHub | About · Privacy · Legal notice · Accessibility · Code on GitHub |
| Fuente bajo gráfico | Fuente: {fuente}. Actualizado el {fecha}. | Source: {source}. Updated {date}. |

### 3.2 Inicio

| Bloque | ES | EN |
|---|---|---|
| Próximo GP: etiqueta | Próximo Gran Premio | Next Grand Prix |
| Próximo GP: subtítulo | {circuito} · {ciudad}, {país} · Ronda {n} de {año} | {circuit} · {city}, {country} · Round {n} of {year} |
| Cuenta atrás: unidades | días · horas · min · s | days · hours · min · s |
| Cuenta atrás: terminada | La carrera ya ha empezado. | The race has started. |
| Sesión en curso | En curso: {sesión} | Live now: {session} |
| Horarios | Horarios en tu zona horaria ({zona}) | Times in your time zone ({zone}) |
| Última carrera | Así acabó {GP} | How {GP} finished |
| Enlace a análisis | Ver el análisis de la carrera | See the race analysis |
| Clasificación resumida | Pilotos: los cinco primeros | Drivers: top five |
| Enlace clasificación | Ver la clasificación completa | See full standings |
| Fin de temporada | {campeón} es campeón del mundo de {año}. La próxima temporada empieza el {fecha}. | {champion} is the {year} world champion. Next season starts on {date}. |
| Newsletter | Un gráfico y una explicación después de cada carrera. | One chart and one explanation after every race. |

### 3.3 Calendario

- **Título:** Calendario {año} / {year} calendar.
- **Columnas:** Ronda, Gran Premio, Circuito, Fecha, Ganador / Round, Grand Prix, Circuit, Date, Winner.
- **Estados:** Disputada, Próxima, Pendiente, Cancelada, Sprint / Completed, Next, Upcoming, Cancelled, Sprint.
- **Exportar:** Añadir al calendario (.ics) / Add to calendar (.ics).
- **Selector:** Temporada / Season.

### 3.4 Página de Gran Premio

- **Título SEO:** Resultados del {GP} {año}: clasificación, vuelta rápida y estrategia / {year} {GP} results: classification, fastest lap and strategy.
- **Entradilla automática:** "{Ganador} ganó el {GP} {año} por delante de {P2} y {P3}. La vuelta rápida fue de {piloto} ({tiempo})." / "{Winner} won the {year} {GP} ahead of {P2} and {P3}. {Driver} set the fastest lap ({time})."
- **Secciones:** Resultado · Clasificación · Sprint · Paradas · Clima · Análisis / Result · Qualifying · Sprint · Pit stops · Weather · Analysis.
- **Columnas del resultado:** Pos., Piloto, Equipo, Parrilla, +/−, Vueltas, Tiempo o estado, Puntos.
- **Navegación:** GP anterior · GP siguiente · El {GP} en otros años.

### 3.5 Clasificación

- **Título:** Clasificación {año} / {year} standings.
- **Pestañas:** Pilotos · Constructores / Drivers · Constructors.
- **Columnas:** Pos., Piloto, Equipo, Victorias, Podios, Puntos, A líder / Pos., Driver, Team, Wins, Podiums, Points, Gap.
- **Gráfico:** Así evolucionó el campeonato, carrera a carrera / How the championship unfolded, race by race.
- **Título en juego:** Aún pueden ganar el título: {pilotos} / Still in title contention: {drivers}.

### 3.6 Fichas

- **Piloto:** {nombre}. Entradilla: "{nombre} ({nacionalidad}) ha disputado {n} Grandes Premios desde {año}, con {v} victorias y {p} podios."
- **Equipo:** {nombre}. Entradilla: "{nombre} ha competido en {n} temporadas, con {v} victorias."
- **Circuito:** {nombre}. Entradilla: "{nombre}, en {ciudad}, mide {km} km y ha acogido {n} Grandes Premios desde {año}."

Las entradillas automáticas solo usan datos de la base; si falta un dato, la frase se reformula sin él.

### 3.7 Zona técnica

| Herramienta | Título (ES / EN) | Pregunta que responde (ES) |
|---|---|---|
| Estrategia | Estrategia de neumáticos / Tyre strategy | ¿Quién paró, cuándo y con qué neumático? |
| Ritmo | Ritmo de carrera / Race pace | ¿Quién fue realmente más rápido vuelta a vuelta? |
| Telemetría | Comparador de telemetría / Telemetry comparison | ¿Dónde gana tiempo un piloto frente a otro? |
| Sectores | Análisis de sectores / Sector analysis | ¿En qué parte del circuito se decidió la diferencia? |
| Revive la carrera | Revive la carrera / Race replay | ¿Cómo cambiaron las posiciones vuelta a vuelta? |

**"Cómo leer este gráfico"** (ejemplo, estrategia): "Cada fila es un piloto. Cada tramo es un stint: el periodo entre dos paradas. El patrón indica el neumático. Las líneas verticales marcan las paradas."

**Plantillas de nota automática** (generadas por reglas, sin inventar causas):

- Estrategia: "{n} pilotos pararon una vez y {m} dos veces. La estrategia del ganador fue {compuestos}."
- Ritmo: "En el último stint, {piloto A} fue {x} s por vuelta más rápido de media que {piloto B}."
- Telemetría: "{A} ganó {x} s en el sector {n}. La mayor diferencia está en la frenada de la curva {c}."
- Sectores: "{A} fue el más rápido en {n} de 3 sectores."

### 3.8 Histórico

- **Cara a cara:** {A} contra {B} / {A} vs {B}. Aviso: "Comparar épocas es difícil: los calendarios, los coches y los sistemas de puntos cambiaron. Por eso mostramos también porcentajes por carrera y el balance frente a compañeros de equipo."
- **Récords:** cada récord con su definición. Ejemplo: "Mayor remontada: posiciones ganadas entre la parrilla y la meta en una carrera. No cuenta a quien salió desde boxes."
- **Esta semana en la historia:** "Un {día} de {año}, {hecho}."

### 3.9 Sobre el proyecto (borrador)

> Paddock Notes es un proyecto personal y no oficial que explica la Fórmula 1 con datos. Lo construí para demostrar cómo diseño un producto de datos completo: una API propia sobre fuentes públicas, visualizaciones hechas a mano, una web bilingüe y accesible, y una estrategia de contenido medible.
>
> **Qué hay detrás:** Next.js y React sobre Cloudflare, una base de datos con toda la historia de la F1 desde 1950 y análisis precalculados después de cada carrera.
>
> **De dónde salen los datos:** Jolpica F1 (resultados e histórico) y OpenF1 (timing desde 2023), ambos con licencia CC BY-NC-SA 4.0. Los datos y gráficos de Paddock Notes se publican con la misma licencia. Trazados de circuitos sin datos recientes: `bacinger/f1-circuits` (MIT).
>
> **Cómo se hizo:** el código es abierto (licencia MIT) y las decisiones están documentadas en el repositorio.
>
> **Quién lo hace:** {nombre}, developer y marketer. {enlace a portfolio y contacto}.

## 4. Tipos de pieza editorial

| Tipo | Extensión | Frecuencia | Objetivo |
|---|---|---|---|
| Nota post-carrera | 600–900 palabras, 2–3 gráficos | Martes tras cada GP | Retorno y newsletter |
| Explicador | 800–1.200 palabras, 1 diagrama | 2 al mes al inicio | SEO por intención de búsqueda |
| Entrada de glosario | 40–120 palabras | Continua | Búsquedas cortas, enlazado interno |
| Ficha de circuito (editorial) | 300–500 palabras | Lunes previo a cada GP | Previa del fin de semana |
| Guía de iniciación | ~1.500 palabras | Única, revisada cada temporada | Captar aficionados nuevos |
| Esta semana en la historia | 3–5 efemérides breves | Semanal | Redes y home |
| Quiz semanal (fase 4) | 5 preguntas | Semanal | Retención |

## 5. Plantillas editoriales

### 5.1 Nota post-carrera

```
Título: {Una frase con el hallazgo principal}  (ej.: "La parada de la vuelta 18 decidió Monza")
Entradilla (1-2 frases): qué pasó y por qué importa para el campeonato.

1. El resultado en una línea (podio, sorpresa principal).
2. El momento clave: el gráfico que lo explica + 2 párrafos.
3. Lo que no se vio en la tele: un segundo gráfico (ritmo, sectores o telemetría).
4. Qué cambia en el campeonato: diferencia de puntos y quién sigue en la pelea.
5. Para entenderlo mejor: enlace a un explicador.

Pie: fuentes, fecha, enlaces a las herramientas interactivas de esa carrera.
```

### 5.2 Explicador

```
Título: la pregunta tal como se busca (ej.: "¿Qué es el undercut en F1?")
Primera frase: la respuesta completa en menos de 30 palabras.

1. La idea, con un diagrama propio.
2. Un ejemplo real de una carrera (con enlace a su análisis).
3. Cuándo funciona y cuándo no.
4. Cómo verlo en nuestros gráficos.
5. Términos relacionados (enlaces al glosario).

Metadatos: intención de búsqueda, palabras clave ES/EN, términos de glosario enlazados.
```

### 5.3 Entrada de glosario

```
Término (ES) / Term (EN)
Definición en 1-2 frases.
Ejemplo breve.
Ver también: {términos} · Explicador: {enlace}
```

### 5.4 Ficha de circuito (editorial)

```
1. El circuito en una frase (qué lo hace distinto).
2. Curvas clave (3-4), con el trazado anotado.
3. Qué tipo de coche favorece y por qué.
4. Estrategia habitual: paradas típicas y neumáticos.
5. Datos: longitud, vueltas, primera edición, récord de vuelta.
6. Un momento histórico.
```

### 5.5 Newsletter

```
Asunto: {hallazgo de la carrera en < 60 caracteres}
Preencabezado: {segunda idea}

1. La carrera en 5 líneas.
2. El gráfico de la semana (imagen + una frase + enlace).
3. Un dato histórico.
4. Para entender: un explicador.
5. Próxima cita: GP, fecha y hora en la zona horaria por defecto de la lista.

Pie: aviso de no afiliación, baja en un clic, dirección del responsable.
```

### 5.6 Redes

- **Post con gráfico:** hallazgo en una frase + gráfico (cuadrado 1080×1080 y vertical 1080×1350) + enlace a la vista interactiva.
- **Carrusel post-carrera:** 1 portada con el hallazgo · 3 gráficos · 1 cierre con enlace.
- **Efeméride:** "Tal día como hoy, {año}: {hecho}."
- Todo con la marca discreta y la fuente en la imagen.

## 6. Inventario inicial de explicadores (12)

| # | Título ES / EN | Intención de búsqueda (ES) | Puntos clave | Visual propio |
|---|---|---|---|---|
| 1 | ¿Qué es el undercut y el overcut? / What are the undercut and overcut? | "undercut f1 qué es" | Parar antes para aprovechar el neumático nuevo; quedarse fuera con pista libre; cuándo funciona cada uno | Dos líneas de tiempo con las vueltas antes y después de la parada |
| 2 | Por qué se degradan los neumáticos / Why tyres degrade | "degradación neumáticos f1" | Desgaste, temperatura, graining y blistering; efecto en el tiempo por vuelta | Ritmo por vuelta con la pendiente de degradación |
| 3 | Los compuestos de neumático / F1 tyre compounds | "neumáticos f1 colores" | Seco (blando, medio, duro), intermedio y lluvia; obligación de usar dos compuestos en seco (se contrasta con el reglamento al escribirlo, §13) | Tabla visual de compuestos con patrones |
| 4 | Cómo funciona la clasificación / How qualifying works | "clasificación f1 q1 q2 q3" | Tres fases, eliminaciones, parrilla de salida | Embudo de eliminaciones con tiempos |
| 5 | El formato sprint / The sprint format | "carrera sprint f1 cómo funciona" | Calendario del fin de semana, puntos, parque cerrado (se contrasta con el reglamento al escribirlo, §13) | Comparación de fin de semana normal y sprint |
| 6 | Safety car y VSC / Safety car and VSC | "safety car f1 estrategia" | Qué neutraliza, por qué abarata la parada | Gráfico de huecos antes y después del coche de seguridad |
| 7 | El aire sucio / Dirty air | "aire sucio f1" | Pérdida de carga al seguir a otro coche; por qué cuesta adelantar | Diagrama de flujo de aire simplificado |
| 8 | Cómo leer un gráfico de telemetría / How to read telemetry | "telemetría f1 explicada" | Velocidad, freno, acelerador, marchas; dónde se gana tiempo | Telemetría anotada de una vuelta real |
| 9 | Cómo se reparten los puntos / How points work | "sistema de puntos f1" | Sistema actual y cambios históricos; la vuelta rápida dio un punto de 2019 a 2024 y dejó de darlo en 2025 | Línea de tiempo de los sistemas de puntos |
| 10 | Sanciones en F1 / F1 penalties | "penalización 5 segundos f1" | Tiempo, *drive-through*, *stop-and-go*, parrilla, puntos de superlicencia | Tabla de sanciones con su efecto |
| 11 | Qué es el delta / What is the delta | "delta f1 qué significa" | Diferencia de tiempo acumulada; cómo se calcula | Curva de delta sobre una vuelta |
| 12 | Del DRS al modo adelantamiento / From DRS to overtake mode | "drs f1 cómo funciona", "overtake mode f1" | Desde 2026 el DRS no existe: el coche a menos de un segundo recibe energía eléctrica extra (modo adelantamiento), utilizable en cualquier punto; el Boost despliega la potencia máxima. El DRS (2011–2025) como contexto histórico | Diagrama del modo adelantamiento frente al DRS |

Los explicadores sobre reglamento (3, 5, 9, 10 y 12) se contrastan con el reglamento en vigor el día que se escriben y se revisan al inicio de cada temporada. Los hechos de 2026 ya comprobados están en D-21.

## 7. Glosario inicial (60 términos)

Cada término tendrá definición, ejemplo y enlaces (plantilla 5.3). Los marcados con † dependen del reglamento y se verifican antes de publicar.

**Carrera y estrategia (11)**
1. Undercut / Undercut
2. Overcut / Overcut
3. Stint / Stint
4. Parada en boxes / Pit stop
5. Ventana de parada / Pit window
6. Doble parada (*double stack*) / Double stack
7. Órdenes de equipo / Team orders
8. Coche de seguridad / Safety car
9. Coche de seguridad virtual / Virtual safety car
10. Bandera roja / Red flag
11. Vuelta de formación / Formation lap

**Neumáticos (10)**
12. Compuesto / Compound
13. Neumático blando, medio y duro / Soft, medium and hard tyres
14. Neumático intermedio / Intermediate tyre
15. Neumático de lluvia extrema / Full wet tyre
16. Degradación / Degradation
17. *Graining* / Graining
18. *Blistering* / Blistering
19. Ventana de funcionamiento / Operating window
20. Caída de rendimiento (*cliff*) / Tyre cliff
21. Regla de los dos compuestos † / Two-compound rule

**Aerodinámica y coche (10)**
22. Carga aerodinámica / Downforce
23. Resistencia aerodinámica / Drag
24. Aire sucio / Dirty air
25. Rebufo / Slipstream (tow)
26. Efecto suelo / Ground effect
27. *Porpoising* / Porpoising
28. Alerón delantero / Front wing
29. Alerón trasero / Rear wing
30. Difusor / Diffuser
31. Modo adelantamiento (antes, DRS) † / Overtake mode (formerly DRS)

**Reglamento (10)**
32. Parque cerrado † / Parc fermé
33. Límites de pista / Track limits
34. Penalización de 5 y 10 segundos † / 5- and 10-second penalty
35. *Drive-through* / Drive-through penalty
36. *Stop-and-go* / Stop-and-go penalty
37. Penalización de parrilla / Grid penalty
38. Puntos de superlicencia † / Penalty points (super licence)
39. Límite de presupuesto † / Cost cap
40. Comisarios / Stewards
41. Regla del 107 % † / 107% rule

**Timing y datos (10)**
42. Delta / Delta
43. Sector / Sector
44. Minisector / Mini-sector
45. Vuelta rápida / Fastest lap
46. Telemetría / Telemetry
47. Trampa de velocidad / Speed trap
48. Intervalo / Interval
49. Diferencia con el líder / Gap to leader
50. Ritmo de carrera / Race pace
51. Vuelta de salida y de entrada / Out-lap and in-lap

**Paddock y fin de semana (9)**
52. Paddock / Paddock
53. Muro de boxes / Pit wall
54. Parrilla de salida / Starting grid
55. *Pole position* / Pole position
56. Salida desde boxes / Pit lane start
57. Piloto del día / Driver of the day
58. *Lift and coast* / Lift and coast
59. *Sandbagging* / Sandbagging
60. Lado sucio de la parrilla / Dirty side of the grid

## 8. Guía de iniciación: "Cómo entender una carrera en 10 minutos"

1. **El fin de semana:** entrenamientos, clasificación y carrera (y el sprint, cuando lo hay).
2. **Quién compite:** equipos con dos pilotos; campeonato de pilotos y de constructores.
3. **Cómo se gana:** puntos por posición y por qué la parrilla importa.
4. **Los neumáticos:** el factor que más cambia una carrera.
5. **Las paradas:** por qué todos paran y qué es el undercut.
6. **Banderas y coche de seguridad:** qué significa cada una.
7. **Cómo leer la tabla de tiempos:** intervalos, diferencias y sectores.
8. **Cómo seguir una carrera en Paddock Notes:** qué mirar antes, durante y después.

Cada apartado: 150–200 palabras, un visual y un enlace a su explicador.

## 9. Microcopy

| Situación | ES | EN |
|---|---|---|
| Error de datos | No hemos podido cargar estos datos. Vuelve a intentarlo en unos minutos. | We couldn't load this data. Try again in a few minutes. |
| Datos antiguos | Datos de hace {n} horas: todavía no hemos podido actualizarlos. | Data from {n} hours ago: we haven't been able to update it yet. |
| Sin datos todavía | Esta carrera aún no se ha disputado. Volverá a haber datos el {fecha}. | This race hasn't happened yet. Data will be here on {date}. |
| Datos parciales | Faltan los datos de {qué} para esta carrera. | {What} data is missing for this race. |
| Telemetría anterior a 2023 | El análisis técnico solo está disponible desde 2023. | Technical analysis is only available from 2023. |
| 404 | No encontramos esta página. Prueba con la búsqueda o vuelve al inicio. | We couldn't find this page. Try searching or go back home. |
| 500 | Algo ha fallado por nuestra parte. Ya lo estamos registrando; prueba de nuevo en un momento. | Something went wrong on our side. It's been logged; try again in a moment. |
| Búsqueda sin resultados | Sin resultados para "{q}". Prueba con un apellido o un circuito. | No results for "{q}". Try a surname or a circuit. |
| Newsletter: éxito | Revisa tu correo para confirmar la suscripción. | Check your inbox to confirm your subscription. |
| Newsletter: error | No hemos podido apuntarte. Revisa el email e inténtalo de nuevo. | We couldn't sign you up. Check the email and try again. |
| Predicción cerrada (fase 4) | Las predicciones para {GP} se cerraron al empezar la clasificación. | Predictions for {GP} closed when qualifying started. |
| Copiar enlace | Enlace copiado | Link copied |

**Botones:** Ver análisis · Comparar · Añadir al calendario · Suscribirme · Copiar enlace · Reproducir · Pausar · Volver al calendario.

## 10. Páginas legales (contenido mínimo)

- **Aviso legal:** responsable (nombre y contacto), naturaleza no comercial, no afiliación con Formula 1 ni equipos, atribución de fuentes de datos y su licencia (CC BY-NC-SA 4.0), licencia de los datos derivados (la misma) y del código (MIT).
- **Privacidad:** qué datos se tratan en cada fase (ninguno personal en fases 1–3; email en newsletter; cuenta en fase 4), base legal, proveedores (Cloudflare y los que se añadan), conservación, derechos y contacto. GDPR y nDSG.
- **Accesibilidad:** nivel objetivo (WCAG 2.2 AA), estado actual, problemas conocidos, contacto para informar de barreras.

Estos textos no sustituyen el asesoramiento de un profesional del derecho.

## 11. SEO

### 11.1 Patrones de título y descripción

| Página | Título (ES) | Descripción (ES) |
|---|---|---|
| Inicio | Paddock Notes · F1 explicada con datos | Calendario, resultados y análisis visual de cada Gran Premio de Fórmula 1. |
| Calendario | Calendario F1 {año}: fechas y horarios | Todas las carreras de la temporada {año} con horarios en tu zona horaria. |
| GP | Resultados {GP} {año}: clasificación y estrategia | Resultado completo, vuelta rápida, paradas y análisis del {GP} {año}. |
| Clasificación | Clasificación F1 {año}: pilotos y constructores | Puntos, victorias y evolución del campeonato {año} carrera a carrera. |
| Piloto | {Piloto}: estadísticas y carrera en F1 | Victorias, poles, podios y trayectoria de {piloto} en la Fórmula 1. |
| Cara a cara | {A} vs {B}: comparación en F1 | Estadísticas, duelos directos y trayectoria de {A} y {B}. |
| Explicador | {Pregunta} | {Respuesta en una frase} |
| Glosario | {Término}: qué significa en F1 | {Definición breve} |

### 11.2 Palabras clave iniciales por intención

- **Informativa (explicadores):** undercut f1, degradación neumáticos, safety car estrategia, cómo funciona la clasificación f1, telemetría f1.
- **Navegacional/datos (plantillas):** resultados gp {país} {año}, clasificación f1 {año}, calendario f1 {año}, {piloto} estadísticas.
- **Comparativa:** {piloto} vs {piloto}.

El mapa de palabras clave completo se hará con datos de volumen reales antes de la fase 5.

## 12. Calendario editorial de un fin de semana

| Momento | Pieza | Canal |
|---|---|---|
| Lunes previo | Ficha de circuito + explicador relacionado | Web, redes |
| Jueves | Esta semana en la historia | Web, redes |
| Viernes | Horarios del fin de semana | Web, redes |
| Domingo, tras la carrera | Gráfico de estrategia (automático) | Web, redes |
| Martes | Nota post-carrera | Web, newsletter |
| Jueves | Quiz semanal (fase 4) | Web |

Fuera de temporada: newsletter quincenal, explicadores y piezas de histórico.

## 13. Flujo editorial y control de calidad

**Dónde se escribe cada pieza:**

- **Nota post-carrera:** `apps/web/content/notes/es/{slug}.mdx` y `en/{slug}.mdx`, más su entrada (título, entradilla, fecha, carrera y explicador) en `packages/shared/src/notes.ts` y el import en `apps/web/content/notes.ts`. Los gráficos se insertan con `<StrategyFigure season={…} round={…} caption="…" />` y `<PaceFigure season={…} round={…} drivers={[…]} caption="…" />`: salen con los datos reales, su tabla equivalente y el enlace a la herramienta.
- **Notas de curvas:** `apps/web/content/circuits.ts`, situadas por su posición en la vuelta (`at`) y comprobadas contra la telemetría.

1. **Borrador** en MDX en una rama del repositorio.
2. **Comprobación de datos:** cada cifra contrastada con la base de datos o la fuente; reglamento verificado si aplica.
3. **Revisión de estilo:** primera frase responde, frases cortas, términos explicados.
4. **Versión en el otro idioma** escrita y revisada.
5. **Accesibilidad:** texto alternativo de cada visual, tabla equivalente si hay gráfico.
6. **SEO:** título, descripción, enlaces internos, datos estructurados.
7. **Pull request** con previsualización; publicación al fusionar.

**Lista de comprobación antes de publicar:**

- [ ] La primera frase responde a la pregunta del título.
- [ ] Todas las cifras tienen fuente.
- [ ] No hay afirmaciones que los datos no sostengan.
- [ ] ES y EN publicados y revisados.
- [ ] Cada visual tiene alternativa textual.
- [ ] Enlaces al glosario y a herramientas relacionadas.
- [ ] Ningún logo, foto o elemento oficial.
