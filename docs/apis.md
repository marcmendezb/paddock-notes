# Paddock Notes — APIs

> Todas las APIs que usa el proyecto: para qué sirve cada una, quién la llama, cómo se autentica, qué límites tiene y en qué fase entra.
> Última revisión: 5 de noviembre de 2026. Límites y licencias comprobados en la documentación oficial de cada servicio ese día. Decisiones en [decisiones.md](decisiones.md).

## 1. Resumen

| API | Tipo | Para qué | Quién la llama | Autenticación | Coste | Fase |
|---|---|---|---|---|---|---|
| Jolpica F1 | Datos F1 (REST) | Calendario, resultados, clasificaciones, histórico desde 1950 | `paddock-ingest` | Ninguna (`User-Agent` propio obligatorio) | Gratis, no comercial | 1 |
| OpenF1 | Datos F1 (REST) | Sesiones, clima, stints, vueltas, posiciones, telemetría (desde 2023) | `paddock-ingest` | Ninguna (histórico) | Gratis, no comercial | 2–3 |
| Cloudflare D1 | Binding | Base de datos principal | API, ingesta | Binding | Plan Workers Paid | 1 |
| Cloudflare R2 | Binding | JSON de análisis y trazados | API, ingesta | Binding | Plan gratuito de R2 | 3 |
| Cloudflare KV | Binding | Copia de último recurso de los datos más leídos | API | Binding | Incluido | 1 |
| Cache API | Runtime | Caché de las respuestas de la API | API | — | Incluido | 1 |
| Cloudflare Workflows | Binding | Carga del histórico, análisis tras cada carrera, newsletter | Ingesta | Binding | Incluido | 2 |
| Durable Objects | Binding | Contador global del limitador saliente | Ingesta | Binding | Incluido | 1 |
| Rate Limiting | Binding | Límite de peticiones entrantes por IP | API | Binding | Incluido | 1 |
| Service Bindings | Binding | La web llama a la API sin salir a internet | Web | Binding | Sin coste por petición | 1 |
| Email Service | Binding (`send_email`) | Enlaces mágicos, avisos, newsletter | API, ingesta | Binding | 3.000/mes incluidos | 4–5 |
| Turnstile | REST (`siteverify`) | Verificación anti-bots en formularios | Web (servidor) | Clave secreta | Gratis | 4–5 |
| Web Analytics | Script | Analítica sin cookies | Navegador | Token público | Gratis | 1 |
| API de Cloudflare / Wrangler | REST | Despliegues, migraciones, copias | GitHub Actions | Token por uso con permisos mínimos | — | 1 |
| GitHub API (Actions) | REST | CI/CD, comentarios con la URL de preview | GitHub Actions | `GITHUB_TOKEN` | Gratis (repo público) | 1 |
| Sentry | REST (SDK) | Seguimiento de errores | Web, API, ingesta | DSN | Plan gratuito | 1 (opcional) |
| OAuth GitHub y Google | OAuth 2.0 | Inicio de sesión | API (Better Auth) | Client ID + secret | Gratis | 4 |
| APIs del navegador | Web | Fechas, preferencias, portapapeles, animación | Navegador | — | — | 1 |
| **API propia** `/api/v1` | REST pública | Expone los datos del proyecto | Web y cualquier consumidor | Ninguna (lectura); sesión (comunidad) | — | 1 |

**Ya no se usan:** FastF1 y Cloudflare Containers. Desde octubre de 2026, FastF1 exige una suscripción a F1TV (D-08).

## 2. Fuentes de datos de Fórmula 1

### 2.1 Jolpica F1

**Qué es:** sucesora de la API Ergast (retirada a principios de 2025), compatible con sus endpoints. Fuente principal de resultados e histórico.

| Dato | Valor |
|---|---|
| URL base | `https://api.jolpi.ca/ergast/f1/` |
| Cobertura | Resultados desde 1950; **vueltas desde 1996**; **paradas desde 2011** |
| Formato | JSON (las rutas terminan en `/` o `.json`) |
| Paginación | `limit` (por defecto 30, máximo 100) y `offset` |
| Autenticación | Ninguna. Exige un `User-Agent` propio |
| Límites publicados | 4 peticiones/s en ráfaga y 500/hora sostenidas, por IP. Han anunciado que **bajarán** cuando lancen el acceso con token |
| Exceso | `429 Too Many Requests` |
| Nuestro límite | 1/s y 400/hora (300/hora para el histórico), configurables. Con 2-3/s hubo 429 en las pruebas reales (D-10) |
| Licencia de los datos | **CC BY-NC-SA 4.0**, solo uso no comercial (`TERMS.md`, 27 de agosto de 2025) |
| Repositorio | https://github.com/jolpica/jolpica-f1 |

**Endpoints que usamos:**

| Endpoint | Para qué | Funcionalidades | Frecuencia |
|---|---|---|---|
| `/{season}/races/` | Calendario con horarios de sesiones | NUC-01, NUC-03, NUC-11–14 | Diaria |
| `/{season}/{round}/results/` | Resultado de carrera | NUC-05, NUC-21–23 | Tras cada carrera |
| `/{season}/{round}/qualifying/` | Clasificación Q1–Q3 | NUC-24 | Tras la clasificación |
| `/{season}/{round}/sprint/` | Resultado del sprint | NUC-25 | Tras el sprint |
| `/{season}/{round}/laps/` | Posición y tiempo por vuelta (desde 1996) | HIS | Tras cada carrera |
| `/{season}/{round}/pitstops/` | Paradas (desde 2011) | NUC-26 | Tras cada carrera |
| `/{season}/{round}/driverstandings/` | Clasificación de pilotos tras una ronda | NUC-30, NUC-33, NUC-35 | Tras cada carrera |
| `/{season}/{round}/constructorstandings/` | Clasificación de constructores tras una ronda | NUC-31 | Tras cada carrera |
| `/drivers/`, `/constructors/`, `/circuits/` | Fichas | NUC-40–43 | Semanal |
| `/seasons/` | Lista de temporadas | NUC-15, HIS-09 | Anual |
| `/status/` | Códigos de estado de fin de carrera | NUC-21 | Anual |

**Notas:**

- `{season}` admite un año o `current`.
- Para las vueltas, se pide la carrera completa por páginas (`/{season}/{round}/laps.json?limit=100&offset=…`), nunca vuelta a vuelta, como recomienda Jolpica.
- La duración de una parada en Jolpica incluye la entrada y la salida del pit lane (y la bandera roja, si la hubo). Se rotula como "tiempo en el pit lane", no como "tiempo parado".
- **No usamos** los volcados CSV (D-11).

### 2.2 OpenF1

**Qué es:** API abierta con datos de timing y telemetría de cada sesión desde 2023. Fuente única de la zona técnica (D-08).

| Dato | Valor |
|---|---|
| URL base | `https://api.openf1.org/v1/` |
| Cobertura | Todas las sesiones desde 2023 |
| Formato | JSON (o CSV con parámetro) |
| Autenticación | Ninguna para el histórico. Los datos en directo (de 30 min antes a 30 min después de cada sesión) son de pago: **no los usamos**. Además, **mientras hay una sesión en directo, todo el acceso sin clave (también al histórico) responde 401** con «Live F1 session in progress» (observado el 6 de noviembre de 2026): la ingesta no pide nada en esas horas (D-25) |
| Límites (nivel gratuito) | 3 peticiones/s y 30/min |
| Nuestro límite | 2/s y 25/min, configurables |
| Licencia de los datos | **CC BY-NC-SA 4.0**; uso educativo, personal y de aficionados, no comercial |
| Web | https://openf1.org/ |

**Endpoints que usamos:**

| Endpoint | Para qué | Funcionalidades |
|---|---|---|
| `/meetings` | Correspondencia entre el Gran Premio de Jolpica y el de OpenF1 | Todas las de fase 3 |
| `/sessions` | Claves de sesión (`session_key`) y horarios | Todas las de fase 3 |
| `/drivers` | Número, código y equipo de cada piloto por sesión | TEC-02–07 |
| `/session_result` | Clasificación final de la carrera, minutos después de la bandera a cuadros: resultado provisional (D-31) | NUC-05, NUC-22 |
| `/weather` | Temperatura de aire y pista, lluvia | NUC-27 |
| `/stints` | Compuesto y vueltas de cada stint | TEC-02 |
| `/pit` | Paradas (`lane_duration`; `stop_duration` solo desde el GP de EE. UU. de 2024) | NUC-26 (desde 2023), TEC-02 |
| `/laps` | Tiempos por vuelta, sectores, minisectores e instante de inicio de cada vuelta | TEC-03, TEC-04, TEC-06 |
| `/position` | Posición a lo largo de la sesión | TEC-07 |
| `/race_control` | Banderas y coche de seguridad | TEC-02, TEC-03 |
| `/car_data` | Velocidad, acelerador, freno, marcha | TEC-04 |
| `/location` | Coordenadas del coche | TEC-05, NUC-43 |

**Reglas de uso:**

- Siempre filtrar por `session_key`. `car_data` y `location` se piden **solo** para un piloto y el intervalo de tiempo de una vuelta (`date>=…&date<…`). Nunca una sesión completa.
- Campos obsoletos: `pit.pit_duration` (se elimina al final de 2026; usar `lane_duration`) y `drivers.country_code` (misma fecha). El esquema Zod no depende de ellos.
- **No usamos:** radio de equipo (audio de terceros) ni datos en directo.

## 3. Plataforma Cloudflare

Todas se usan desde los Workers mediante **bindings** declarados en Wrangler: no hay claves en el código.

| API | Binding | Uso concreto | Quién |
|---|---|---|---|
| **D1** | `DB` | Todas las tablas. Consultas con Drizzle | API (módulo `f1-read`; en fase 4, tablas de comunidad), ingesta (módulo `f1-write`) |
| **R2** | `ANALYSIS` | JSON de análisis y trazados SVG | API (lectura), ingesta (escritura) |
| **KV** | `CACHE` | Copia de último recurso del próximo GP y la clasificación actual | API |
| **Cache API** | — | Caché de todas las respuestas públicas | API |
| **Workflows** | `BACKFILL`, `POST_RACE`, `MAILING` | Histórico, análisis tras cada carrera, newsletter y avisos por email | Ingesta |
| **Durable Objects** | `OUTBOUND_LIMITER` | Contador global de peticiones a cada fuente | Ingesta y sus Workflows |
| **Cron Triggers** | — | Tareas programadas | Ingesta |
| **Rate Limiting** | `RATE_LIMIT_READ`, `RATE_LIMIT_WRITE` | Límite por IP en la API pública | API |
| **Service Bindings** | `API` | La web consulta la API internamente | Web |
| **Email Service** | `EMAIL` | Envío de emails transaccionales y newsletter | API (enlaces mágicos), ingesta (avisos, newsletter) |
| **Static Assets** | `ASSETS` | JavaScript, CSS, fuentes y SVG estáticos | Web |

**Email Service:** en beta. Solo en Workers Paid. Máximo 50 destinatarios por email; con el binding, 50 ms de CPU y 50 subpeticiones por invocación, de ahí los lotes de 40 en el Workflow. En `wrangler dev` el envío se simula y se guarda en archivos locales.

### 3.1 Servicios de Cloudflare fuera de los Workers

| Servicio | Para qué | Notas |
|---|---|---|
| **Turnstile** | Anti-bots en formularios (newsletter, login). El servidor valida el token con `siteverify` | Clave secreta solo en el servidor |
| **Web Analytics** | Visitas y Core Web Vitals sin cookies | Script con token público, declarado en la CSP |
| **WAF, Bot Fight Mode, DDoS** | Protección del perímetro | Ver `seguridad.md` §3 |
| **Access (Zero Trust)** | Proteger el entorno de preview y `/status` | Plan gratuito, hasta 50 usuarios |
| **DNS y Registrar** | Dominio propio | DNSSEC y CAA |
| **API de Cloudflare** | Usada por Wrangler en CI para desplegar, migrar y exportar copias | Un token por uso, con permisos mínimos |

## 4. Servicios de terceros

| Servicio | Para qué | Datos que recibe | Fase | Alternativa |
|---|---|---|---|---|
| **GitHub API / Actions** | CI/CD, comentarios con la URL de preview, Renovate, CodeQL | Código y metadatos del repositorio | 1 | Workers Builds de Cloudflare |
| **Sentry** | Errores con traza en web, API e ingesta | Errores técnicos sin datos personales | 1 (opcional) | Solo Workers Logs |
| **OAuth de GitHub y Google** | Inicio de sesión sin contraseña | Identificador y email del usuario (con su consentimiento) | 4 | Solo enlace mágico |
| **Resend** (solo plan B de D-16) | Email si Email Service no está disponible | Email del destinatario | 4–5 | — |
| **`bacinger/f1-circuits`** | Trazados de circuitos sin datos desde 2023 (GeoJSON, MIT) | Ninguno: se copia al repositorio | 2 | — |
| **Natural Earth** (vía `world-atlas`) | Contornos de tierra firme para el mapa de la temporada (NUC-17), dominio público | Ninguno: `apps/web/scripts/world-map.mjs` genera `lib/world-land.ts`, que se versiona | 2 | — |

Antes de activar cualquier servicio que reciba datos personales: contrato de encargado del tratamiento, ubicación de los datos y alta en el registro de tratamientos (ver `seguridad.md` §17).

## 5. APIs del navegador

| API | Para qué | Funcionalidades |
|---|---|---|
| `Intl.DateTimeFormat`, `Intl.NumberFormat` | Fechas, horas y números según idioma y zona horaria | NUC-03, TRA-13 |
| `Intl.RelativeTimeFormat` | "Datos de hace 3 horas" | TRA-32 |
| `matchMedia` | `prefers-reduced-motion` y `prefers-color-scheme` | TRA-24, tema |
| `requestAnimationFrame` | Animación de "revive la carrera" | TEC-07 |
| History API (`URLSearchParams`) | Estado de las vistas en la URL | TEC-10 |
| Clipboard API | Botón "copiar enlace" | TEC-10 |
| `localStorage` | Solo preferencias no sensibles (unidades, tema) | TEC-12 |
| `IntersectionObserver` | Cargar gráficos cuando entran en pantalla | Rendimiento |

## 6. API propia (`/api/v1`)

La API pública del proyecto. La web la consume por Service Binding; cualquier persona puede usarla para leer datos. Nunca llama a fuentes externas (D-05).

| Método y ruta | Devuelve | Caché | Fase |
|---|---|---|---|
| `GET /seasons/{season}/schedule` | Calendario | 60 s (actual) / 24 h (pasadas) | 1 |
| `GET /races/next` | Próximo GP | 60 s | 1 |
| `GET /races/last` | Última carrera con resultado | 60 s | 1 |
| `GET /seasons/{season}/standings/drivers` | Clasificación de pilotos | 60 s / 24 h | 1 |
| `GET /seasons/{season}/standings/constructors` | Clasificación de constructores | 60 s / 24 h | 1 |
| `GET /seasons/{season}/races/{round}` | Carrera con su resultado | 5 min (48 h) / 24 h | 1 |
| `GET /seasons/{season}/races/{round}/qualifying` | Clasificación Q1–Q3 | Ídem | 2 |
| `GET /seasons/{season}/races/{round}/sprint` | Sprint | Ídem | 2 |
| `GET /seasons/{season}/races/{round}/pitstops` | Paradas | Ídem | 2 |
| `GET /seasons/{season}/standings/history` | Puntos por ronda | Ídem | 2 |
| `GET /drivers/{id}` · `/constructors/{id}` · `/circuits/{id}` | Fichas | 24 h | 2 |
| `GET /compare/drivers?a=&b=` | Cara a cara | 24 h | 2 |
| `GET /records/{type}` | Récords | Hasta el siguiente GP | 2 |
| `GET /search?q=` | Búsqueda | 1 h | 2 |
| `GET /analysis/{season}/{round}/{tool}` | JSON de cada herramienta | Inmutable por versión | 3 |
| `POST /predictions`, `GET /predictions/me` | Predicciones del usuario | Sin caché | 4 |
| `POST /leagues`, `GET /leagues/{id}` | Ligas | Sin caché | 4 |
| `GET /health` | Estado del servicio | Sin caché | 1 |
| `GET /docs` | Documentación OpenAPI | 1 h | 1 |

**Políticas:**

- **Versionado:** `/api/v1` no cambia de forma incompatible. Un cambio incompatible crea `/api/v2`, y la versión anterior se mantiene al menos 6 meses con la cabecera `Deprecation`.
- **Errores** (D-06): `{ "error": { "code", "message" } }`. 400 parámetro inválido · 404 sin datos · 405 método no permitido · 429 límite entrante · 500 error interno · 503 D1 no disponible, con `Retry-After`.
- **Frescura:** campo `updated_at` en cada respuesta; cabecera `X-Data-Stale: true` si se sirve una copia en caché porque D1 falla o si la ingesta va retrasada.
- **CORS** (D-07): lectura abierta (`*`, sin credenciales); comunidad, solo el origen propio.
- **Límites:** ver `seguridad.md` §6.
- **Atribución y licencia** (D-12): cada respuesta incluye `source` (por ejemplo, `["Jolpica F1"]`) y `license: "CC BY-NC-SA 4.0"`.

Forma de una respuesta:

```json
{
  "data": { "...": "..." },
  "source": ["Jolpica F1"],
  "license": "CC BY-NC-SA 4.0",
  "updated_at": "2026-11-02T22:14:05Z"
}
```

## 7. Matriz funcionalidad → API

| Área | Jolpica | OpenF1 | D1 | R2 | KV/Cache | Otros |
|---|---|---|---|---|---|---|
| Inicio y calendario | ✓ | — | ✓ | — | ✓ | `Intl` |
| Página de GP | ✓ | ✓ (clima, paradas desde 2023) | ✓ | — | ✓ | — |
| Clasificación | ✓ | — | ✓ | — | ✓ | — |
| Fichas | ✓ | ✓ (trazado) | ✓ | ✓ (SVG) | ✓ | `bacinger/f1-circuits` |
| Zona técnica | — | ✓ | ✓ (índice) | ✓ (JSON) | ✓ | Workflows |
| Histórico | ✓ | — | ✓ | — | ✓ | Workflows (carga) |
| Comunidad | ✓ (resultado oficial) | — | ✓ | — | — | Email Service, OAuth, Turnstile |
| Contenido y SEO | — | — | — | — | — | Email Service (newsletter) |

## 8. Reglas comunes para integrar cualquier API externa

1. **Solo desde el servidor.** Ninguna API externa se llama desde el navegador (excepto el script de analítica y Turnstile).
2. **Lista cerrada de hosts** de salida en el código: `api.jolpi.ca` y `api.openf1.org`.
3. **Tiempo máximo** de 10 s por petición y tamaño máximo de respuesta (5 MB).
4. **Reintentos** con espera exponencial y aleatoriedad (máximo 3), solo en errores 429, 5xx y de red.
5. **Respeto de `Retry-After`** y de los límites publicados, con margen.
6. **Validación con Zod** de cada respuesta antes de usarla (ver `seguridad.md` §8).
7. **Caché** de todo lo que no cambia.
8. **`User-Agent` identificable** con el nombre del proyecto y una URL de contacto (obligatorio en Jolpica).
9. **Atribución** visible de cada fuente y de su licencia en la web y en la API.
10. **Revisión de términos de uso** antes de añadir una API y antes de cualquier cambio de uso.
11. **Monitorización:** cada llamada registra fuente, endpoint, código y duración; alertas si la tasa de error sube.
12. **Tests sin red:** las APIs externas se simulan con respuestas reales guardadas en `fixtures/`.
