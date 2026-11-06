# Paddock Notes — Funcionalidades

> Especificación funcional completa. Cada funcionalidad tiene un identificador, una fase, una prioridad y un criterio de aceptación verificable.
> Última revisión: 5 de noviembre de 2026.

## Cómo leer este documento

- **ID:** código estable para referenciar la funcionalidad en issues, commits y tests (por ejemplo, `NUC-03`).
- **Fase:** 1 MVP · 2 Histórico · 3 Zona técnica · 4 Comunidad · 5 Contenido y SEO · T transversal (todas las fases).
- **Prioridad (MoSCoW):** **M** imprescindible · **S** debería estar · **C** podría estar · **W** no se hará por ahora.
- **Criterio de aceptación:** la condición que debe cumplirse para dar la funcionalidad por terminada.

Las fases 1 a 3 forman el núcleo del portfolio. Las fases 4 y 5 solo se abordan con el núcleo desplegado.

---

## 1. Núcleo: calendario, carreras y clasificaciones

### 1.1 Inicio

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| NUC-01 | Bloque "próximo Gran Premio" con nombre, circuito, país y ronda | 1 | M | Muestra el primer GP de la temporada en curso cuya carrera no ha empezado |
| NUC-02 | Cuenta atrás a la salida de la carrera (días, horas, minutos, segundos) | 1 | M | Se actualiza cada segundo; no provoca error de hidratación; los lectores de pantalla no la anuncian cada segundo |
| NUC-03 | Horarios de todas las sesiones del fin de semana en la zona horaria del visitante | 1 | S | Cada sesión muestra la hora local del visitante y, en segundo plano, la del circuito |
| NUC-04 | Estado "sesión en curso" que destaca la sesión activa | 1 | C | Entre el inicio y el fin estimado de una sesión, el bloque lo indica |
| NUC-05 | Bloque "última carrera": podio, vuelta rápida y enlace a la página del GP | 1 | M | Visible desde que el resultado está disponible en la base de datos |
| NUC-06 | Clasificación resumida: top 5 de pilotos y top 3 de constructores | 1 | M | Coincide con la clasificación completa tras la última ronda |
| NUC-07 | Estado de fin de temporada: resumen del campeón y fecha de la siguiente temporada | 1 | S | Cuando no quedan carreras, el bloque de próximo GP se sustituye por este resumen |
| NUC-08 | Nota destacada: último análisis con su gráfico principal | 3/5 | S | En fase 3 muestra el gráfico de estrategia; en fase 5, la nota post-carrera |
| NUC-09 | Explicador sugerido según el próximo circuito | 5 | C | Muestra un explicador etiquetado con ese circuito o tema |
| NUC-10 | Suscripción a la newsletter en una línea | 5 | S | Envío con doble confirmación; mensaje de éxito y de error accesibles |

### 1.2 Calendario de temporada

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| NUC-11 | Lista de rondas: número, nombre, circuito, país, fecha | 1 | M | Todas las rondas de la temporada, en orden |
| NUC-12 | Estado de cada ronda: disputada, próxima, pendiente, cancelada | 1 | M | El estado se calcula con la fecha y hora UTC de la carrera |
| NUC-13 | Ganador de cada carrera disputada con enlace a su página | 1 | M | El enlace lleva a `/races/[season]/[round]` |
| NUC-14 | Formato del fin de semana (normal o sprint) | 1 | S | Las rondas sprint llevan una etiqueta visible y textual |
| NUC-15 | Selector de temporada desde 1950 | 1 | M | Cambiar de temporada cambia la URL y conserva el idioma |
| NUC-16 | Exportar la temporada en curso a calendario (.ics) | 1 | C | El archivo se importa sin errores en Google Calendar, Apple Calendar y Outlook |
| NUC-17 | Vista de mapa con los circuitos de la temporada | 2 | C | Mapa en SVG propio; cada punto enlaza a la ficha del circuito |

### 1.3 Página de Gran Premio

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| NUC-20 | Cabecera: nombre, circuito, fecha, ronda | 1 | M | Datos coherentes con el calendario |
| NUC-21 | Resultado de carrera: posición, piloto, equipo, parrilla, vueltas, tiempo o estado, puntos | 1 | M | Coincide con la fuente; los no clasificados muestran su estado ("Motor", "Accidente"...) |
| NUC-22 | Posiciones ganadas o perdidas respecto a la parrilla | 1 | S | Calculadas como parrilla − posición final; sin valor si salió desde boxes o no terminó |
| NUC-23 | Marca de vuelta rápida | 1 | M | Indicador visual y textual, con el tiempo de la vuelta |
| NUC-24 | Clasificación (Q1, Q2, Q3) | 2 | M | Tiempos de cada fase por piloto |
| NUC-25 | Resultado del sprint, si lo hubo | 2 | M | Solo aparece en fines de semana con sprint |
| NUC-26 | Paradas en boxes: número, vuelta y duración por piloto | 2 | S | Jolpica desde 2011 (tiempo en el pit lane) y OpenF1 desde 2023; antes de 2011 el bloque no aparece; si faltan datos, aviso de datos parciales |
| NUC-27 | Clima de la sesión (temperatura de aire y pista, lluvia) | 2 | C | Solo desde 2023 (OpenF1); antes, el bloque no aparece |
| NUC-28 | Accesos a las herramientas de análisis de esa carrera | 3 | M | Solo enlaza las herramientas con datos disponibles |
| NUC-29 | Navegación: GP anterior y siguiente, y mismo GP en otros años | 2 | S | Enlaces correctos en los límites de temporada |

### 1.4 Clasificación

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| NUC-30 | Clasificación de pilotos: posición, piloto, equipo, victorias, podios, puntos | 1 | M | Coincide con la fuente tras la última ronda; los podios se calculan a partir de los resultados guardados en D1 |
| NUC-31 | Clasificación de constructores | 1 | M | Ídem |
| NUC-32 | Diferencia de puntos con el líder | 1 | S | Columna calculada |
| NUC-33 | Gráfico de evolución de puntos carrera a carrera | 2 | M | Una línea por piloto; top 10 por defecto; selección libre; tabla equivalente accesible |
| NUC-34 | Matriz piloto × carrera con la posición en cada GP | 2 | S | Celdas con texto, no solo color |
| NUC-35 | Clasificación tras cualquier ronda ("¿cómo iba tras la ronda 8?") | 2 | C | Selector de ronda con URL propia |
| NUC-36 | Indicador de quién puede ganar todavía el título | 2 | C | Cálculo matemático con los puntos en juego restantes; tests con casos límite |

### 1.5 Fichas

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| NUC-40 | Ficha de piloto: datos, equipos por temporada, estadísticas de carrera | 2 | M | Carreras, victorias, poles, podios, puntos y abandonos coinciden con la base de datos |
| NUC-41 | Gráfico de posición final por temporada en la ficha de piloto | 2 | S | Con tabla equivalente |
| NUC-42 | Ficha de equipo: historia por temporadas, pilotos, títulos | 2 | M | Sin logos; solo datos y tipografía |
| NUC-43 | Ficha de circuito: trazado en SVG propio, datos, ganadores por año | 2 | M | Trazado generado a partir de `location` de OpenF1 si el circuito tiene carreras desde 2023; si no, a partir de `bacinger/f1-circuits` (MIT) con atribución (D-09) |
| NUC-44 | Curvas clave anotadas en el trazado | 3 | C | Anotaciones con número de curva y nota breve, desde `content/circuits/` |

---

## 2. Zona técnica (carreras desde 2023)

Todas las herramientas leen datos **precalculados** después de cada carrera a partir de OpenF1 (D-08). Ninguna página espera a una fuente externa.

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TEC-01 | Portada de análisis con las últimas carreras analizadas | 3 | M | Lista ordenada por fecha con enlaces a cada herramienta |
| TEC-02 | **Estrategia de neumáticos:** línea de tiempo con stints por piloto, compuesto y paradas | 3 | M | Compuesto distinguible por patrón y texto, no solo por color; periodos de coche de seguridad marcados si hay datos |
| TEC-03 | **Ritmo de carrera:** tiempos por vuelta con tendencia por stint | 3 | M | Hasta 4 pilotos; opción de excluir vueltas de entrada/salida de boxes y bajo coche de seguridad |
| TEC-04 | **Comparador de telemetría:** dos pilotos, una vuelta, velocidad, freno, acelerador y delta acumulado | 3 | M | Vistas sincronizadas al pasar el cursor o con el teclado; vuelta más rápida de cada uno por defecto; el delta se rotula como estimación calculada a partir de la velocidad |
| TEC-05 | Mapa del circuito coloreado por quién es más rápido en cada tramo | 3 | M | Leyenda textual; alternativa en tabla por mini-sectores |
| TEC-06 | **Sectores:** matriz piloto × sector con la diferencia respecto al mejor | 3 | S | Alternar entre mejor sector y sector medio |
| TEC-07 | **Revive la carrera:** posiciones vuelta a vuelta con reproducción, pausa y velocidad | 3 | S | Con `prefers-reduced-motion` muestra una versión estática navegable por vuelta |
| TEC-08 | Nota automática bajo cada gráfico ("qué se ve") | 3 | M | Generada por reglas a partir de los datos; nunca inventa causas |
| TEC-09 | "Cómo leer este gráfico" plegable y enlace al explicador | 3 | S | Presente en las cinco herramientas |
| TEC-10 | URL propia con el estado de la vista (pilotos, vuelta) | 3 | M | Copiar y abrir la URL reproduce la misma vista |
| TEC-11 | Imagen para redes generada por vista | 3 | S | 1200×630, con fuente y fecha |
| TEC-12 | Unidades km/h o mph | 3 | C | Preferencia recordada en el navegador |
| TEC-13 | Presupuesto de datos por vista | 3 | M | < 300 kB comprimidos por vista de telemetría |

---

## 3. Histórico

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| HIS-01 | **Cara a cara** entre dos pilotos de cualquier época | 2 | M | Respuesta en < 1 s sin llamar a fuentes externas |
| HIS-02 | Estadísticas absolutas y relativas (por carrera disputada) | 2 | M | Porcentajes con su base visible ("12 victorias en 150 carreras") |
| HIS-03 | Trayectoria alineada por temporada de carrera (1.ª, 2.ª, 3.ª...) | 2 | S | Gráfico con tabla equivalente |
| HIS-04 | Duelos directos en carreras compartidas | 2 | S | Cuenta de quién terminó delante, con lista de carreras |
| HIS-05 | Balance frente a compañeros de equipo | 2 | S | Por temporada y total |
| HIS-06 | Puntos recalculados con el sistema actual (opcional, rotulado) | 2 | C | Siempre etiquetado como recálculo |
| HIS-07 | **Récords:** victorias, poles, podios, puntos, remontadas, abandonos, rachas | 2 | M | Cada récord muestra su definición exacta y se regenera tras cada GP |
| HIS-08 | **Esta semana en la historia** | 2 | S | Efemérides de la semana en curso; revisadas antes de publicarse en home o redes |
| HIS-09 | Navegación completa por cualquier temporada desde 1950 | 2 | M | Calendario, clasificación y resultados de cualquier año |

---

## 4. Comunidad (opcional)

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| COM-01 | Cuenta con enlace mágico por email o proveedor externo | 4 | M | Sin contraseñas propias; sesión segura (cookies `HttpOnly`, `Secure`, `SameSite`) |
| COM-02 | Perfil mínimo: alias, idioma, favoritos opcionales | 4 | M | Solo los datos estrictamente necesarios |
| COM-03 | Exportar y borrar la cuenta | 4 | M | Exportación JSON; borrado efectivo e inmediato |
| COM-04 | **Predicciones:** podio, pole y piloto del día opcional | 4 | M | Se cierran al empezar la clasificación (o el sprint) |
| COM-05 | Puntuación y resolución automática | 4 | M | Se resuelve con el resultado oficial; se recalcula si hay sanciones posteriores |
| COM-06 | Ranking global por temporada | 4 | M | Empates resueltos con criterio publicado |
| COM-07 | Ligas privadas con enlace de invitación (máx. 50 miembros) | 4 | S | Ranking y resumen tras cada GP |
| COM-08 | **Quiz semanal:** 5 preguntas con explicación | 4 | S | Jugable sin cuenta; con cuenta guarda puntuación y racha |
| COM-09 | **Simulador de campeonato** "¿y si...?" | 4 | S | Funciona sin cuenta, en el navegador; URL compartible del escenario |
| COM-10 | Favoritos destacados en tablas y gráficos | 4 | C | Resaltado visible y textual |
| COM-11 | Avisos por email antes de cada GP y al publicar el análisis | 4 | C | Pueden quedar simulados en la demo; baja en un clic |
| COM-12 | Protección anti-bots en formularios | 4 | M | Verificación sin rompecabezas visuales (ver stack) |
| COM-13 | Filtro y denuncia de alias y nombres de liga | 4 | S | Lista de palabras bloqueadas y botón de denuncia |

---

## 5. Contenido y SEO

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| CON-01 | Explicadores en MDX con diagramas propios | 5 | M | 12 publicados en ES y EN (ver `contenido.md`) |
| CON-02 | Glosario con buscador | 5 | M | 60 términos ES/EN; búsqueda instantánea en el navegador |
| CON-03 | Guía de iniciación "Cómo entender una carrera en 10 minutos" | 5 | M | Publicada en ES y EN |
| CON-04 | Notas post-carrera | 5 | M | Publicadas en las 48 h siguientes a cada GP |
| CON-05 | Fichas de circuito con texto editorial | 5 | S | Publicadas antes de cada GP |
| CON-06 | Newsletter semanal | 5 | S | Doble confirmación; listas separadas ES y EN |
| CON-07 | Metadatos por página, `hreflang`, canónicas | 5 | M | Validados con herramientas de SEO |
| CON-08 | Datos estructurados (`SportsEvent`, `Article`, `BreadcrumbList`, `DefinedTerm`) | 5 | S | Sin errores en el validador de resultados enriquecidos |
| CON-09 | `sitemap.xml` por idioma y `robots.txt` | 1 | M | Generados automáticamente; incluyen todas las páginas públicas |
| CON-10 | Página "Sobre el proyecto" y caso de estudio | 1/5 | M | Explica el proyecto en 30 segundos y enlaza al repositorio |

---

## 6. Funcionalidades transversales

### 6.1 Navegación y búsqueda

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-01 | Cabecera con cinco áreas: Carreras, Clasificación, Análisis, Histórico, Aprende | 1 | M | Página actual marcada con `aria-current`; solo aparecen las áreas con contenido publicado (en fase 1: Carreras y Clasificación) |
| TRA-02 | Migas de pan en páginas de segundo nivel o más | 2 | S | Con datos estructurados `BreadcrumbList` |
| TRA-03 | Búsqueda global con atajo de teclado | 2 | S | Pilotos, equipos, circuitos, carreras, glosario y explicadores; resultados en < 200 ms |
| TRA-04 | Enlaces cruzados automáticos a fichas | 2 | S | Cada nombre de piloto, equipo o circuito enlaza a su ficha |

### 6.2 Idiomas y formatos

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-10 | Español e inglés con rutas `/es` y `/en` | 1 | M | Todas las páginas existen en ambos idiomas |
| TRA-11 | Redirección inicial según `Accept-Language` | 1 | M | Por defecto, español |
| TRA-12 | Selector de idioma que conserva la página actual | 1 | M | Cambia solo el prefijo |
| TRA-13 | Fechas, números y unidades localizados | 1 | M | `Intl` con el idioma de la página |
| TRA-14 | Páginas de error 404 y 500 bilingües | 1 | M | Se muestran en el idioma de la URL; español si no hay prefijo |
| TRA-15 | Alemán como tercer idioma | — | W | Pendiente de decisión |

### 6.3 Accesibilidad (WCAG 2.2 AA)

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-20 | HTML semántico, enlace "saltar al contenido", foco visible | 1 | M | Revisión con teclado de todas las páginas núcleo |
| TRA-21 | Contraste AA en claro y oscuro | 1 | M | Verificado tras aplicar la marca |
| TRA-22 | Alternativa textual y tabla equivalente en cada gráfico | 1–3 | M | Ningún dato solo en el gráfico |
| TRA-23 | Gráficos interactivos navegables con teclado | 3 | M | Flechas para recorrer puntos; anuncio del valor |
| TRA-24 | Respeto de `prefers-reduced-motion` | 1 | M | Sin animaciones con la preferencia activa |
| TRA-25 | Declaración de accesibilidad | 1 | S | Página `/accessibility` con lo conocido que no cumple |

### 6.4 Estados de interfaz

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-30 | Esqueletos de carga con la forma del contenido | 1 | S | Nunca pantalla en blanco; solo en componentes que cargan datos en el cliente, no en páginas enteras (D-22) |
| TRA-31 | Estado "sin datos todavía" con fecha prevista | 1 | M | Por ejemplo, carrera aún no disputada |
| TRA-32 | Estado "datos antiguos" cuando la ingesta va retrasada o la base de datos no responde | 1 | M | Aviso con la antigüedad del dato, a partir de `X-Data-Stale` y `updated_at` (D-06) |
| TRA-33 | Estado "datos parciales" | 2 | S | Indica qué falta y por qué |
| TRA-34 | Contenido núcleo legible sin JavaScript | 1 | S | Solo lo interactivo requiere JS |

### 6.5 Rendimiento, fiabilidad y calidad

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-40 | Lighthouse ≥ 90 en las cuatro categorías, en móvil | 1 | M | Comprobado en CI sobre páginas clave |
| TRA-41 | LCP < 2,5 s en la home (móvil, 4G simulado) | 1 | M | Ídem |
| TRA-42 | Ingesta con límite de peticiones a fuentes externas | 1 | M | Nunca más de 400 peticiones/hora a Jolpica |
| TRA-43 | API pública propia, versionada y documentada | 1 | M | OpenAPI accesible en `/api/v1/docs` |
| TRA-44 | Límite de peticiones entrante en la API pública | 1 | S | Respuesta 429 con `Retry-After` |
| TRA-45 | Comprobación de salud y registro estructurado | 1 | M | `/api/v1/health` y logs consultables |
| TRA-46 | Tests en CI en cada pull request | 1 | M | Unitarios, API, extremo a extremo y accesibilidad |
| TRA-47 | Despliegues de previsualización por pull request | 1 | S | URL de preview enlazada en el PR |

### 6.6 Legal y privacidad

| ID | Funcionalidad | Fase | Prio. | Criterio de aceptación |
|---|---|---|---|---|
| TRA-50 | Aviso permanente de proyecto no oficial, atribución de datos y licencia | 1 | M | En el pie de todas las páginas: fuentes (Jolpica F1, OpenF1) y licencia CC BY-NC-SA 4.0 de los datos (D-12) |
| TRA-51 | Páginas de privacidad, aviso legal y accesibilidad | 1 | M | En ES y EN |
| TRA-52 | Analítica sin cookies | 1 | M | Sin banner de consentimiento necesario |
| TRA-53 | Tratamiento de datos conforme a GDPR y nDSG (si hay cuentas o newsletter) | 4/5 | M | Registro de tratamientos y contratos con proveedores |

---

## 7. API pública propia (`/api/v1`)

| Método y ruta | Devuelve | Fase |
|---|---|---|
| `GET /seasons/{season}/schedule` | Calendario | 1 |
| `GET /races/next` | Próximo GP | 1 |
| `GET /races/last` | Última carrera con resultado | 1 |
| `GET /seasons/{season}/standings/drivers` | Clasificación de pilotos | 1 |
| `GET /seasons/{season}/standings/constructors` | Clasificación de constructores | 1 |
| `GET /seasons/{season}/races/{round}` | Carrera con su resultado | 1 |
| `GET /seasons/{season}/races/{round}/qualifying` | Clasificación (Q1–Q3) | 2 |
| `GET /seasons/{season}/races/{round}/sprint` | Sprint | 2 |
| `GET /seasons/{season}/races/{round}/pitstops` | Paradas | 2 |
| `GET /seasons/{season}/standings/history` | Puntos por ronda | 2 |
| `GET /drivers/{id}` · `/constructors/{id}` · `/circuits/{id}` | Fichas | 2 |
| `GET /compare/drivers?a=&b=` | Cara a cara | 2 |
| `GET /records/{type}` | Récords | 2 |
| `GET /search?q=` | Búsqueda | 2 |
| `GET /analysis/{season}/{round}/{tool}` | Datos de cada gráfico | 3 |
| `POST /predictions` · `GET /leagues/{id}` · ... | Comunidad | 4 |
| `GET /health` | Estado del servicio | 1 |

**Contrato de errores** (D-06): 400 parámetro inválido · 404 sin datos · 405 método no permitido · 429 límite entrante · 500 error interno · 503 D1 no disponible y sin copia en caché (con `Retry-After`) · cabecera `X-Data-Stale: true` cuando se sirve una copia en caché o la ingesta va retrasada. La API nunca llama a fuentes externas (D-05).

---

## 8. Fuera de alcance

- Datos en directo durante la carrera como propuesta principal.
- Noticias, rumores o mercado de pilotos.
- Comentarios de usuarios o foros.
- Publicidad, suscripciones de pago o afiliación.
- Logos, fotografías, tipografías o colores oficiales de F1 o de los equipos.
- App móvil nativa.
