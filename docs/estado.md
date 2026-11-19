# Paddock Notes — Estado de las funcionalidades

> Qué está construido y probado, por ID de [funcionalidades.md](funcionalidades.md). Última revisión: 19 de noviembre de 2026.
> **Hecho:** implementado y cubierto por tests (unitarios, de Workers o en navegador). **Parcial:** funciona con limitaciones anotadas. **Pendiente:** sin empezar.

## Resumen

| Fase | Hecho | Parcial | Pendiente |
|---|---|---|---|
| 1 · MVP | 46 | 3 | 0 |
| 2 · Histórico | 27 | 0 | 0 |
| 3 · Zona técnica | 16 | 0 | 0 |
| 4 · Comunidad | 13 | 0 | 0 |
| 5 · Contenido y SEO | 7 | 3 | 0 |

## Novedades del 6 al 19 de noviembre

- **Diseño:** cabecera y pie nuevos, transición de cortina entre páginas, desplazamiento suave (D-28). Rediseño de la portada, las carreras, la página de cada GP, la ficha de circuito (vuelta rápida a tiempo real, globo, telemetría, «La previa» como doble página; D-30), la clasificación, el histórico y el resto de páginas con una cabecera común (D-32).
- **Alemán** como tercer idioma en toda la web y en los emails (D-29).
- **Resultado provisional de OpenF1** tras cada carrera (D-31).
- **Anclas** del subencabezado de carrera y circuito comprobadas en Chromium, WebKit y Firefox (D-30).

## Fase 1 · MVP

| ID | Estado | Nota |
|---|---|---|
| NUC-01 a NUC-06 | Hecho | Próximo GP, cuenta atrás, horarios en dos zonas, sesión en curso, última carrera, clasificación resumida. La última carrera es una crónica con plantilla fija que se rellena solo con el resultado (titular escrito con los datos, podio, seis claves, salida → meta de toda la parrilla), también con el provisional (D-31, D-32) |
| NUC-07 | Hecho | Campeón y arranque de la temporada siguiente (primer GP y fecha); desde octubre la ingesta carga el calendario siguiente en cuanto Jolpica lo publica, y mientras no está se dice |
| NUC-11 a NUC-16 | Hecho | Calendario, estados, ganador, sprint, selector desde 1950, .ics |
| NUC-20 a NUC-23 | Hecho | Página de GP con resultado, posiciones ganadas y vuelta rápida, en tablas de cronometraje con subencabezado por secciones. Tras la carrera, resultado provisional de OpenF1 mientras Jolpica no publica el oficial (D-31) |
| NUC-30 a NUC-32 | Hecho | Clasificaciones con podios y diferencia con el líder |
| TRA-01, TRA-10 a TRA-14 | Hecho | Navegación, ES/EN/DE (D-29), redirección por idioma, formatos, 404/500 en los tres idiomas |
| TRA-20 a TRA-25 | Hecho | axe WCAG 2.2 AA en escritorio, móvil y modo oscuro en cada PR |
| TRA-30 | Parcial | Solo en componentes que cargan datos en el cliente (D-22) |
| TRA-31, TRA-32, TRA-34 | Hecho | Estados sin datos y datos antiguos; contenido sin JavaScript |
| TRA-40, TRA-41 | Parcial | En local (móvil): 94–100 en rendimiento y 100 en el resto, CLS 0, LCP simulado 2,5–2,7 s, pero en local el HTML sale sin comprimir (37 kB frente a ~6,5 kB con gzip). `lighthouserc.json` y el job de CI ya están; falta medir contra la preview, que comprime |
| TRA-42 a TRA-47 | Hecho | Limitador global, API versionada con OpenAPI, límite entrante, salud, CI |
| TRA-50 a TRA-52 | Hecho | Aviso, atribución y licencia; páginas legales; sin cookies |
| CON-09, CON-10 | Hecho | sitemap.xml dinámico, robots.txt, «Sobre el proyecto» |

## Fase 2 · Histórico

| ID | Estado | Nota |
|---|---|---|
| NUC-17 | Hecho | Mapa SVG propio en el calendario (contornos de Natural Earth, recuadro ampliado de Europa); cada punto lleva la ronda y enlaza a la ficha del circuito; disputada o por disputar con forma distinta |
| NUC-24 a NUC-26, NUC-29 | Hecho | Q1–Q3 (desde 1994), sprint, paradas (desde 2011), navegación entre GP |
| NUC-27 | Hecho | Clima de la carrera en la página de GP (desde 2023), resumido en el Workflow post-carrera |
| NUC-33 a NUC-36 | Hecho | Evolución con gráfico y tabla, matriz, clasificación tras cualquier ronda, aspirantes al título |
| NUC-40 a NUC-42 | Hecho | Fichas de piloto y equipo con gráfico de posición final |
| NUC-43 | Hecho | Ficha con ganadores y trazado SVG generado con `location` de OpenF1 (circuitos con carreras desde 2023) |
| HIS-01 a HIS-05, HIS-07 a HIS-09 | Hecho | Cara a cara, récords con definición, esta semana en la historia, todas las temporadas |
| HIS-06 | Hecho | `/standings/{temporada}/current-points`: pilotos con el sistema actual frente a la clasificación real, rotulado como recálculo, con desempate por victorias y segundos puestos |
| TRA-02 a TRA-04 | Hecho | Migas de pan con BreadcrumbList, búsqueda con atajo «/», enlaces cruzados |
| TRA-33 | Hecho | Datos parciales: bloques que no aparecen fuera de su cobertura |
| Carga del histórico (D-11) | Hecho | Workflow por temporada, 300 peticiones/h, salvaguarda de instancias atascadas |

## Fase 3 · Zona técnica

| ID | Estado | Nota |
|---|---|---|
| TEC-01 a TEC-10 | Hecho | Las cinco herramientas, notas automáticas, «Cómo leer», URL con el estado de la vista |
| TEC-11 | Hecho | Imágenes de 1200×630 con `next/og` para la home, cada GP y cada herramienta, con fuente y fecha |
| TEC-12, TEC-13 | Hecho | km/h o mph recordado; 14 kB por piloto de telemetría |
| NUC-28, NUC-08 | Hecho | Enlaces al análisis desde la página de GP y la home |
| NUC-44 | Hecho | Frenadas detectadas en la telemetría de la vuelta rápida (velocidad mínima, marcha, la más lenta), numeradas sobre el trazado, y notas editoriales en `content/circuits.ts` casadas por posición en la vuelta. Notas escritas: México y Austin; el resto de circuitos, a medida que se comprueben (CON-05) |

## Fase 4 · Comunidad

| ID | Estado | Nota |
|---|---|---|
| COM-01 | Hecho | Enlace mágico (Better Auth, 15 min, token guardado como hash) por Email Service; cookie `__Host-` `HttpOnly`, `Secure` y `SameSite=Lax`. Sin proveedor externo por ahora (D-23) |
| COM-02 | Hecho | Alias con filtro, idioma de los emails y favoritos |
| COM-03 | Hecho | Exportación JSON y borrado inmediato en cascada; cuentas inactivas 24 meses: aviso y borrado a los 30 días (cron semanal de ingest) |
| COM-04 | Hecho | Podio y pole, cerrados al empezar la clasificación o el sprint. Sin piloto del día: ninguna fuente abierta lo publica |
| COM-05 | Hecho | La puntuación se calcula al leer, con el resultado oficial vigente: las sanciones posteriores se reflejan solas |
| COM-06 | Hecho | Ranking global con el criterio de desempate publicado en la página |
| COM-07 | Hecho | Ligas con invitación revocable, máximo de 50, ranking y resumen del último GP (puntos de cada miembro y quién no predijo) en la página de la liga |
| COM-08 | Hecho | Quiz semanal sin cuenta; con cuenta guarda puntuación y racha |
| COM-09 | Hecho | Simulador con URL compartible, sin JavaScript |
| COM-10 | Hecho | Favoritos destacados en clasificaciones, resultados y recálculo (fondo, filete y etiqueta «Favorito») y en el gráfico de evolución: salen por defecto, con trazo más grueso, estrella en la etiqueta y «favorito» en la descripción accesible |
| COM-11 | Hecho | Aviso antes de cada GP (cuando la primera sesión empieza en menos de 48 h) y al publicar el análisis de una carrera reciente. Opcionales, desactivados por defecto, baja en un clic |
| COM-12 | Hecho | Turnstile en la petición del enlace mágico; límite de 10 escrituras por minuto en la API |
| COM-13 | Hecho | Lista de palabras bloqueadas en alias y ligas, y botón de denuncia |

## Fase 5 · Contenido y SEO

| ID | Estado | Nota |
|---|---|---|
| CON-01 | Hecho | 12 explicadores en ES y EN |
| CON-02 | Hecho | Glosario de 60 términos con buscador |
| CON-03 | Hecho | Guía «Cómo entender una carrera en 10 minutos» |
| CON-04 | Parcial | Sistema listo: notas en MDX (ES y EN) con los gráficos reales de la carrera (`<StrategyFigure>`, `<PaceFigure>`), índice en `/notes`, enlace desde la home, la ficha del GP, «Aprende», el sitemap y la newsletter, y Article en JSON-LD. Publicada: México 2026. Falta la cadencia editorial de cada GP |
| CON-05 | Parcial | Sistema listo: ficha editorial en MDX (ES y EN) en `content/circuit-guides/`, cifras calculadas con los datos (primera edición, vueltas, vuelta rápida en carrera), enlace «La previa» desde la home antes del GP e índice en «Aprende». Publicadas las de los cuatro GP que quedan en 2026: Interlagos, Las Vegas, Losail y Yas Marina. Falta el resto de circuitos, uno antes de cada GP |
| CON-06 | Hecho | Newsletter de los martes tras cada carrera, compuesta con los datos (carrera en 5 líneas, gráfico, dato histórico, explicador, próxima cita), listas ES y EN, Workflow `MAILING` en lotes de 40. Falta la dirección postal del pie (`MAIL_POSTAL_ADDRESS`) y la edición quincenal fuera de temporada |
| NUC-10 | Hecho | Alta en una línea en la home y en `/newsletter`, con Turnstile cargado al tocar el formulario y doble confirmación con botón |
| CON-07 | Hecho | Títulos, descripciones, canónicas y hreflang |
| CON-08 | Parcial | SportsEvent (con fin, dirección postal, coordenadas, imagen, estado y modo presencial), Article (imagen, URL, autor enlazado), BreadcrumbList y DefinedTerm, con tests de los campos que pide Google. Falta pasar la Prueba de resultados enriquecidos, que necesita una URL pública |
| NUC-09 | Hecho | Explicador sugerido según el próximo circuito y el formato del fin de semana, con la razón en una frase (home y newsletter) |

## Cifras de calidad

- 182 tests unitarios y de Workers (shared, db, analysis, web, ingest, api).
- 189 pruebas en navegador (186 pasan y 3 se omiten por proyecto) (escritorio, móvil y modo oscuro), con axe en todas las páginas y comprobación de enlaces internos.
- Lint con las reglas D-14 (lectura/escritura) y contra `dangerouslySetInnerHTML` (una única excepción revisada).
- `pnpm audit` sin vulnerabilidades altas; gitleaks sin hallazgos en el historial.
- CI de GitHub en verde en cada push a `main` (lint, tipos, tests, build y gitleaks).
