# Paddock Notes — Seguridad

> Política y diseño de seguridad del proyecto, de la red al código y del repositorio a la respuesta a incidentes.
> Última revisión: 5 de noviembre de 2026. Las funciones y planes de terceros citados se comprobaron en su documentación oficial ese día.

## 0. Objetivo y alcance

**Objetivo:** que Paddock Notes cumpla el **nivel 2 de OWASP ASVS** (versión vigente), el estándar habitual para aplicaciones con datos de usuarios. Las fases 1 a 3 no tratan datos personales, pero el sistema se construye desde el principio como si los tratara.

**Alcance:** web (`paddock-web`), API (`paddock-api`), ingesta (`paddock-ingest`, sus Workflows y el Durable Object del limitador), datos (D1, R2, KV), email, cuenta de Cloudflare, repositorio de GitHub y pipeline de CI/CD. Las decisiones citadas (`D-xx`) están en [decisiones.md](decisiones.md).

**Límite honesto:** ningún sistema es invulnerable. "Muy seguro" aquí significa: superficie de ataque mínima, defensa en capas, todo verificable con tests automáticos y un plan probado para cuando algo falle.

## 1. Principios

1. **Mínima superficie.** Lo que no existe no se puede atacar: sin panel de administración público, sin endpoints de escritura en la API pública, sin subida de archivos.
2. **Mínimo privilegio.** Cada Worker solo tiene los bindings que necesita; cada token, solo los permisos que usa.
3. **Denegar por defecto.** Rutas, métodos, orígenes, parámetros y hosts de salida funcionan con listas de permitidos.
4. **Todo lo externo es hostil.** La entrada del usuario y también las respuestas de Jolpica y OpenF1 se validan antes de usarse.
5. **Defensa en capas.** Cloudflare (red), Worker (aplicación), datos y repositorio tienen controles independientes.
6. **Seguro por defecto y verificable.** Cada control importante tiene un test en CI que falla si se rompe.
7. **Privacidad desde el diseño.** No se recoge un dato personal sin una funcionalidad que lo necesite.

## 2. Modelo de amenazas

### 2.1 Activos

| Activo | Por qué importa |
|---|---|
| Datos de usuarios (fase 4: email, alias, predicciones) | Privacidad y obligaciones legales (GDPR, nDSG) |
| Integridad de los datos de F1 en D1 y R2 | Un dato manipulado destruye la credibilidad del proyecto |
| Credenciales: tokens de Cloudflare, GitHub, Sentry, email | Dan control sobre la infraestructura |
| Disponibilidad de la web | Es una pieza de portfolio: debe funcionar cuando la visita un reclutador |
| Coste de la cuenta | Un abuso puede generar facturas ("denial of wallet") |
| Reputación y marca | Un defacement o contenido inyectado afecta al autor |

### 2.2 Amenazas y controles principales

| Amenaza | Vector | Controles |
|---|---|---|
| Inyección de scripts (XSS) | Datos externos o contenido renderizado sin escapar | React escapa por defecto; prohibido `dangerouslySetInnerHTML` salvo excepción revisada; CSP; validación de datos externos |
| Inyección SQL | Parámetros de la API | Drizzle con consultas parametrizadas; regla de lint contra SQL concatenado |
| Abuso de la API y scraping masivo | Bots | Rate Limiting por IP, caché, WAF, Bot Fight Mode |
| Coste disparado | Peticiones masivas o bucles | Límites de CPU por invocación, alertas de facturación, caché agresiva |
| Robo de cuentas (fase 4) | Credenciales, fijación de sesión, enlaces mágicos reutilizados | Sin contraseñas; enlaces de un solo uso y caducidad corta; cookies `__Host-`; Turnstile; límite de intentos |
| Acceso a datos ajenos (IDOR) | IDs predecibles en ligas o predicciones | Comprobación de propietario en cada consulta; IDs no secuenciales; tests de autorización |
| Datos de origen manipulados o corruptos | Respuesta inesperada de una fuente | Validación con Zod, comprobaciones de coherencia, cuarentena |
| SSRF | Un parámetro que acabe en una URL de salida | La ingesta solo llama a hosts de una lista cerrada; ningún input de usuario forma URLs de salida |
| Escritura indebida en datos de F1 | La API (expuesta a internet) comparte la base con la ingesta | Módulos `f1-read` y `f1-write` separados, con regla de lint y test de arquitectura (D-14) |
| Previews que tocan producción | Las *preview URLs* de una versión comparten bindings de producción | Entorno de preview con Workers y recursos propios; `preview_urls: false` en producción (D-18) |
| Compromiso de dependencias | Paquete malicioso en npm | Lockfiles, versiones con al menos 14 días de antigüedad, auditoría, sin scripts de instalación arbitrarios |
| Compromiso del pipeline | Acción de GitHub maliciosa, token filtrado | Acciones fijadas por SHA, permisos mínimos, entornos con aprobación, escaneo de secretos |
| Compromiso de la cuenta de Cloudflare o GitHub | Phishing | 2FA con llaves de seguridad o passkeys; tokens con alcance mínimo; registro de auditoría |
| Clickjacking | Web incrustada en un iframe ajeno | `frame-ancestors 'none'` |
| Filtración por logs | Datos personales o secretos en logs | Logs sin PII; IP truncada; nunca cabeceras de autorización |

## 3. Perímetro: Cloudflare

### 3.1 DNS y dominio

- **DNSSEC** activado.
- Registros **CAA** que solo permitan las autoridades de certificación que usa Cloudflare.
- Bloqueo de transferencia del dominio y 2FA en el registrador.
- En producción, `workers_dev: false` y `preview_urls: false` en los tres Workers: solo existe el dominio propio. El entorno de preview usa `workers.dev` detrás de Cloudflare Access (D-18).

### 3.2 TLS

- Solo HTTPS ("Always Use HTTPS") y TLS mínimo 1.2; TLS 1.3 activado.
- **HSTS** con `max-age=63072000; includeSubDomains; preload` y alta en la lista de precarga de los navegadores una vez estable.

### 3.3 WAF, bots y DDoS

| Control | Configuración |
|---|---|
| Protección DDoS | Automática de Cloudflare |
| Reglas gestionadas del WAF | **Free Managed Ruleset**: incluido en el plan gratuito de la zona y activo por defecto. Cubre vulnerabilidades de explotación masiva; el conjunto OWASP completo exige un plan de pago y no se contrata |
| Reglas personalizadas | Bloquear métodos distintos de `GET`, `HEAD`, `POST` y `OPTIONS`; bloquear `POST` fuera de las rutas que lo necesitan; bloquear rutas típicas de escaneo (`/wp-admin`, `/.env`, `/.git`) |
| Bots | Bot Fight Mode activado; Turnstile en formularios |
| Rate Limiting (perímetro) | La única regla de rate limiting del plan gratuito, por IP sobre `/api/*`, como primera barrera; el límite fino lo aplica el Worker |
| Zona de administración | `/status` y el entorno de preview detrás de **Cloudflare Access** (plan gratuito de Zero Trust, hasta 50 usuarios) con login del autor. Playwright entra con un *service token* de Access |

## 4. Cabeceras de seguridad

Aplicadas a todas las respuestas desde el middleware de Next.js y desde la API.

| Cabecera | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Ver 4.1 |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` (web) / `cross-origin` solo en la API pública de lectura |
| `X-Frame-Options` | `DENY` (compatibilidad; la protección real es `frame-ancestors`) |

### 4.1 Content Security Policy

**Política objetivo:**

```
default-src 'self';
script-src 'self' 'nonce-{aleatorio}' 'strict-dynamic';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
form-action 'self';
base-uri 'none';
object-src 'none';
upgrade-insecure-requests;
report-to csp-endpoint;
```

**Orígenes añadidos, cada uno justificado:**

| Directiva | Origen | Motivo | Fase |
|---|---|---|---|
| `script-src` | Ninguno extra: el script de Web Analytics se carga con el *nonce* y `'strict-dynamic'` lo autoriza | Analítica sin cookies | 1 |
| `connect-src` | `https://cloudflareinsights.com` | Envío de las métricas de Web Analytics | 1 |
| `script-src`, `frame-src` | `https://challenges.cloudflare.com` | Turnstile | 4–5 |

La fuente Archivo se aloja en el propio sitio, así que `font-src 'self'` no necesita excepciones.

**Decisión (D-04):** Next.js inserta scripts en línea, y la única forma estricta de autorizarlos es un *nonce* por petición. Por eso **todas las páginas se renderizan por petición** con CSP con *nonce*, sin excepciones, y la caché se traslada a la capa de datos. Se descartó la CSP con *hashes* o SRI: es experimental, solo funciona con webpack (Next.js 16 compila con Turbopack por defecto) y no cubre los scripts en línea de RSC.

**Despliegue:**

1. Primera versión publicada con `Content-Security-Policy-Report-Only` para detectar violaciones legítimas.
2. Paso a modo obligatorio antes del lanzamiento público, cuando el informe esté limpio durante una semana de pruebas.
3. Un test de Playwright comprueba en cada PR que la cabecera existe, que el *nonce* cambia entre peticiones y que no contiene `'unsafe-inline'` ni `'unsafe-eval'` en `script-src`.

Nunca se usa `'unsafe-eval'`. `'unsafe-inline'` solo se acepta en `style-src` si una dependencia lo exige, y queda documentado.

## 5. Aplicación web

- **Escapado:** React escapa todo el texto. `dangerouslySetInnerHTML` está prohibido por regla de lint; cualquier excepción necesita revisión y sanitización explícita. Única excepción aprobada: `components/json-ld.tsx` (datos estructurados, CON-08). Solo serializa JSON generado por el propio sitio, escapa `<`, `>` y `&` para que nada pueda cerrar la etiqueta `<script>`, lleva el *nonce* de la CSP y tiene un test que lo comprueba.
- **Contenido MDX:** solo se compila contenido del propio repositorio, revisado por pull request. Nunca se compila MDX de usuarios ni de fuentes externas.
- **Datos externos en pantalla:** los textos de las fuentes (nombres de pilotos, estados) se tratan como texto plano, nunca como HTML.
- **Enlaces externos:** `rel="noopener noreferrer"`; lista corta de dominios enlazables en el contenido.
- **Redirecciones:** la redirección de idioma solo acepta `es` y `en` y rutas relativas internas. No existe ningún parámetro tipo `?next=` que acepte URLs externas.
- **CSRF (fase 4):** cookies `SameSite=Lax`, comprobación de la cabecera `Origin` en toda petición que cambie estado y protección propia de las Server Actions de Next.js. Ningún `GET` modifica datos.
- **Almacenamiento en el navegador:** solo preferencias no sensibles (unidades, tema). Nunca tokens ni datos personales en `localStorage`.
- **Errores:** páginas de error genéricas; nunca trazas de pila ni mensajes internos en producción.

## 6. API (`paddock-api`)

| Control | Implementación |
|---|---|
| Validación de entrada | Zod en modo estricto para ruta, consulta y cuerpo; los parámetros desconocidos se rechazan |
| Límites de tamaño | Cuerpo máximo de 16 kB en rutas `POST` (fase 4); paginación con máximo de 100 elementos |
| Métodos | Solo los declarados en la ruta; el resto devuelve 405 |
| Límite de peticiones | Rate Limiting binding por IP (ejemplo inicial: 60/min en lectura, 10/min en escritura) → 429 con `Retry-After` |
| CORS | `GET` de lectura con `Access-Control-Allow-Origin: *` y sin credenciales (es una API pública documentada); rutas de comunidad solo para el origen propio, con credenciales (D-07) |
| Fuentes externas | La API nunca llama a Jolpica ni a OpenF1: solo lee D1 y R2 (D-05) |
| Autenticación (fase 4) | La sesión se valida en el servidor en cada petición de escritura |
| Autorización | Denegar por defecto; comprobación de propietario en cada recurso de usuario |
| Errores | Formato uniforme (`{ "error": { "code", "message" } }`) sin detalles internos; el detalle va solo a los logs |
| Caché | Claves de caché normalizadas (parámetros ordenados y validados) para evitar envenenamiento de caché; nunca se cachean respuestas autenticadas |
| Tiempo de respuesta | Tiempo máximo por consulta a D1; respuesta 503 controlada si se supera |
| Documentación | OpenAPI pública solo de los endpoints públicos |

## 7. Datos

### 7.1 Clasificación

| Clase | Ejemplos | Dónde | Medidas |
|---|---|---|---|
| Pública | Resultados, calendarios, análisis | D1, R2, KV | Integridad y copias de seguridad |
| Interna | Estado de la ingesta, métricas | D1 (`ingest_runs`), logs | Solo accesible tras Cloudflare Access |
| Personal (fase 4) | Email, alias, predicciones | D1 | Minimización, cifrado en reposo del proveedor, acceso solo por la API, borrado a petición |
| Secreta | Tokens y claves | Secretos de Wrangler y GitHub | Nunca en código, logs ni base de datos |

### 7.2 Base de datos (D1)

- **Consultas parametrizadas siempre** (Drizzle). Regla de lint contra SQL construido con plantillas de texto.
- **Separación de responsabilidades (D-14):** solo `paddock-ingest` escribe datos de F1; `paddock-api` solo los lee y solo escribe las tablas de comunidad (fase 4). D1 no ofrece bindings de solo lectura, así que la separación se garantiza en el código: módulo `f1-read` (solo `select`) para la API y `f1-write` para la ingesta, con regla `no-restricted-imports` y un test de arquitectura.
- **Migraciones** revisadas en pull request y aplicadas por el pipeline; nunca a mano en producción.
- **Copias de seguridad (D-15):** Time Travel de D1 (cualquier minuto de los últimos 30 días) y exportación semanal desde GitHub Actions (`wrangler d1 export --remote`) al bucket `paddock-backups`, con borrado automático a los 90 días. La exportación bloquea las consultas mientras dura, por eso se hace los miércoles a las 03:00 UTC. Restauración probada una vez por trimestre.
- **Ubicación de datos (D-13):** D1 y R2 se crean con jurisdicción `eu` desde el primer día; la jurisdicción de D1 no se puede cambiar después. KV no la admite, así que solo guarda copias en caché de datos públicos.

### 7.3 Archivos (R2)

- Buckets privados; el acceso público solo a través de la API o de un dominio propio con caché, nunca listando el bucket.
- Bucket de copias de seguridad separado, sin acceso desde los Workers que atienden visitas.
- Nombres de objeto generados por el sistema, nunca por el usuario.

## 8. Ingesta y datos externos

Los datos de Jolpica y OpenF1 son **entrada no confiable**:

- **Lista cerrada de hosts de salida:** `api.jolpi.ca` y `api.openf1.org`, y solo por HTTPS. Cualquier otra URL se rechaza en código.
- **Validación con Zod** de cada respuesta antes de escribir en D1. Una respuesta que no cumple el esquema no se escribe.
- **Comprobaciones de coherencia:** posiciones entre 1 y el número de participantes, puntos dentro de los valores posibles, fechas en rangos razonables.
- **Cuarentena:** si una ingesta cambia más de un umbral de filas ya consolidadas (por ejemplo, el resultado de una carrera de hace años), se detiene y alerta en lugar de sobrescribir.
- **Límites:** tiempo máximo por petición (10 s), tamaño máximo de respuesta y límite de peticiones por fuente.
- **Identificación:** `User-Agent` con el nombre del proyecto y una URL de contacto, como cortesía con las fuentes.
- **Credenciales de fuentes:** si en algún momento se usa OpenF1 autenticado, el intercambio de usuario y contraseña por token ocurre solo en el servidor, como exige su guía.

## 9. Autenticación (fase 4)

| Control | Detalle |
|---|---|
| Sin contraseñas propias | Enlace mágico por email u OAuth con GitHub o Google |
| Enlace mágico | Un solo uso, caducidad de 15 minutos, token aleatorio de al menos 128 bits guardado como hash |
| OAuth | Flujo de código con PKCE y parámetro `state`; validación estricta de la URL de retorno |
| Cookies de sesión | `__Host-` + `HttpOnly` + `Secure` + `SameSite=Lax` + `Path=/` |
| Sesiones | Rotación del identificador al iniciar sesión; caducidad por inactividad (7 días) y absoluta (30 días); cierre de todas las sesiones desde la cuenta |
| Enumeración de cuentas | Mismo mensaje y tiempo de respuesta exista o no el email |
| Fuerza bruta | Límite de envíos de enlace por email e IP; Turnstile en el formulario |
| Passkeys | Opcional, si la biblioteca de autenticación lo soporta sin complejidad extra |
| Administración | No hay rol de administrador en la aplicación. Las tareas internas se hacen con Wrangler o detrás de Cloudflare Access |

Biblioteca (D-17): Better Auth con `drizzleAdapter` sobre `drizzle-orm/d1`, instancia creada por petición; migraciones con `drizzle-kit`. Se evita escribir criptografía o gestión de sesiones a mano.

## 10. Autorización

- Toda consulta de recursos de usuario filtra por el usuario de la sesión en la propia consulta SQL, no después.
- IDs de usuario, liga y predicción no secuenciales (UUID).
- Invitaciones a ligas con token aleatorio revocable y caducidad.
- Tests de autorización: para cada endpoint de comunidad, un test que intenta acceder al recurso de otro usuario y espera 403 o 404.

## 11. Secretos

| Regla | Detalle |
|---|---|
| Dónde viven | `wrangler secret put` en Workers; secretos de entorno en GitHub; nunca en el repositorio |
| Variables públicas | Ningún secreto con prefijo `NEXT_PUBLIC_` (se incrusta en el JavaScript del navegador) |
| Tokens de Cloudflare | Un token por uso (despliegue de producción, despliegue de preview), con permisos mínimos y limitado a la cuenta y a los recursos necesarios |
| Rotación | Cada 90 días y de inmediato ante cualquier sospecha |
| Detección | gitleaks en CI (job `secrets` de `ci.yml`, historial completo); escaneo de secretos con protección de push en GitHub |
| Local | `.dev.vars` y `.env` en `.gitignore`; solo valores de desarrollo |

## 12. Cadena de suministro

- **Lockfile obligatorio** (`pnpm-lock.yaml`) e instalación congelada en CI (`pnpm install --frozen-lockfile`).
- **Antigüedad mínima de versiones (D-19):** `minimumReleaseAge: 20160` (14 días, en minutos) en `pnpm-workspace.yaml` y `minimumReleaseAge: "14 days"` en Renovate. Los parches de seguridad urgentes se excluyen con `minimumReleaseAgeExclude`, revisados en el PR.
- **Scripts de instalación:** desactivados por defecto en pnpm; solo se permiten en la lista explícita (`onlyBuiltDependencies`).
- **Auditoría en CI:** `pnpm audit`; el pipeline falla con vulnerabilidades altas o críticas sin excepción documentada.
- **Actualizaciones:** Renovate con PR agrupados semanalmente; las actualizaciones mayores, a mano.
- **Pocas dependencias:** cada nueva dependencia se justifica en el PR (qué aporta, mantenimiento, tamaño).
- **SBOM:** generado en cada release y adjunto al despliegue.

## 13. Repositorio y CI/CD

| Control | Configuración |
|---|---|
| 2FA | Obligatorio en GitHub y Cloudflare, con llave de seguridad o passkey |
| Rama `main` protegida | Sin push directo; PR con checks en verde obligatorios; historial lineal |
| Commits firmados | Obligatorios en `main` |
| GitHub Actions | Fijadas por SHA completo, no por etiqueta; `permissions: contents: read` por defecto y ampliado solo donde haga falta |
| Entorno `production` | Secretos solo disponibles en ese entorno y con aprobación manual del autor |
| PR de terceros | Los workflows de PR externos no reciben secretos (`pull_request`, nunca `pull_request_target` con código ajeno) |
| Análisis estático | CodeQL para TypeScript (`codeql.yml`); solo corre con el repositorio público, porque en uno privado exige GitHub Advanced Security |
| Tokens de Cloudflare en CI | Tres, uno por uso: despliegue de producción, despliegue de preview y copia semanal (solo D1 de producción y el bucket `paddock-backups`) |
| Alertas | Dependabot alerts y secret scanning activados |
| Registro | Registro de auditoría de Cloudflare revisado mensualmente |

## 14. Ingesta, Workflows y limitador

El Container de FastF1 desapareció del diseño (D-08); los análisis se calculan en TypeScript dentro del Workflow `POST_RACE`.

- **Sin entrada pública:** `paddock-ingest` no tiene rutas, `workers_dev` ni `preview_urls`; solo se ejecuta por Cron Triggers. Su manejador `fetch` responde 404.
- **Workflows** solo los lanza la ingesta con su binding; no hay ningún endpoint que los dispare.
- **Durable Object del limitador:** solo accesible por binding desde la ingesta; si no responde, la petición saliente no se hace (falla cerrado).
- **Pasos idempotentes:** reintentar un paso nunca duplica ni corrompe datos.
- **Salidas acotadas:** cada JSON de análisis se valida contra su esquema Zod y su tamaño máximo antes de escribirse en R2.

## 15. Disponibilidad y coste

- **Límites de CPU** por invocación en la configuración de Wrangler, para cortar ejecuciones desbocadas.
- **Alertas de facturación** y de uso en Cloudflare (Workers, D1, R2, Email Service, Workers Logs).
- **Caché** en todas las respuestas públicas: la mayoría del tráfico no llega a ejecutar código.
- **Degradación controlada:** si D1 o la API fallan, la web sirve lo último en caché con aviso de datos antiguos.
- **Reversión rápida:** cada despliegue guarda versión; el pipeline revierte si falla la comprobación de salud.

## 16. Registro y monitorización

| Qué se registra | Qué no se registra nunca |
|---|---|
| Ruta, método, código de estado, duración | Cuerpos de petición con datos personales |
| País e IP truncada (/24 en IPv4, /48 en IPv6) | IP completa (salvo investigación de abuso con base legal) |
| Errores con identificador de correlación | Cookies, cabeceras `Authorization`, tokens |
| Eventos de seguridad: 401, 403, 429, cambios de sesión | Emails completos (se registran como hash) |
| Ejecuciones de la ingesta y su resultado | Secretos |

**Alertas:** aumento de errores 5xx, picos de 429, fallos de ingesta consecutivos, violaciones de CSP, intentos de acceso a rutas de administración, cambios en la cuenta de Cloudflare.

**Retención:** logs operativos según la retención de Workers Logs en el plan contratado (con los precios de Observability desde el 1 de diciembre de 2026); eventos de seguridad agregados, 90 días.

## 17. Privacidad

- **Fases 1–3:** sin datos personales. Analítica sin cookies (Cloudflare Web Analytics), así que no hace falta banner de consentimiento.
- **Fase 5 (newsletter):** solo el email y el idioma; doble confirmación; baja en un clic (`List-Unsubscribe` y `List-Unsubscribe-Post`). La lista vive en D1 (UE) y el envío lo hace Cloudflare Email Service, así que no se añade ningún encargado del tratamiento aparte de Cloudflare (D-16). El token de confirmación se guarda como hash y caduca a las 48 h; las altas sin confirmar se borran en la tarea semanal; la baja borra la fila. El alta responde igual exista o no la dirección y no reenvía la confirmación a la misma dirección antes de 10 minutos (D-24).
- **Fase 4 (cuentas):** email, alias y predicciones; exportación y borrado desde la cuenta; borrado de cuentas inactivas tras 24 meses con aviso previo. Lo hace el cron semanal de `paddock-ingest` (`workers/ingest/src/retention.ts`): cuenta como actividad la última renovación de sesión o cambio de perfil; avisa por email y, si a los 30 días sigue sin actividad posterior al aviso, borra la cuenta en cascada. Las sesiones no guardan IP ni agente de usuario.
- **Registro de actividades de tratamiento** y política de privacidad en ES y EN antes de activar la fase 4 o la newsletter.
- Normativa de referencia: GDPR (UE) y nDSG (Suiza). Este documento no es asesoramiento legal.

## 18. Respuesta a incidentes

**Runbook:**

1. **Detectar y registrar:** hora, señal, alcance inicial.
2. **Contener:** activar el modo "Under Attack" o reglas de WAF, revertir el despliegue, revocar tokens o desactivar la funcionalidad afectada.
3. **Erradicar:** corregir la causa, rotar todos los secretos que pudieran estar expuestos.
4. **Recuperar:** restaurar datos con Time Travel o desde la copia en R2; verificar integridad.
5. **Notificar:** si hay datos personales afectados, valorar la notificación a la autoridad de protección de datos y a los afectados dentro de los plazos legales (en el GDPR, 72 horas para la autoridad).
6. **Aprender:** postmortem sin culpables en `docs/incidentes/`, con acciones y fechas.

**Preparación:** el runbook se ensaya una vez al año con un escenario simulado (por ejemplo, token de Cloudflare filtrado).

## 19. Divulgación responsable

- `/.well-known/security.txt` (RFC 9116) con contacto, idioma preferido y fecha de caducidad.
- `SECURITY.md` en el repositorio: cómo informar, qué esperar (acuse en 72 h), qué queda fuera de alcance.
- Sin programa de recompensas; agradecimiento público si el informante lo desea.

## 20. Pruebas de seguridad

| Cuándo | Prueba |
|---|---|
| Cada commit (pre-commit) | gitleaks, lint con reglas de seguridad |
| Cada PR | CodeQL, `pnpm audit`, test de arquitectura (D-14), tests de autorización, tests de cabeceras (CSP, HSTS, cookies) con Playwright |
| Cada PR contra la preview | Escaneo básico con OWASP ZAP (modo baseline) |
| Antes del lanzamiento | Revisión manual con la lista de abajo; análisis externo de cabeceras y TLS |
| Trimestral | Prueba de restauración de copias; revisión de tokens y permisos |
| Anual | Revisión completa frente a OWASP ASVS nivel 2 y actualización de este documento |

## 21. Lista de comprobación antes del lanzamiento

- [ ] DNSSEC, CAA, HSTS y TLS ≥ 1.2 activos.
- [ ] `workers_dev` y `preview_urls` desactivados en producción.
- [ ] D1 y R2 creados con jurisdicción `eu`.
- [ ] WAF, Bot Fight Mode y reglas de rate limiting activas.
- [ ] Cabeceras de seguridad presentes en todas las rutas (test en verde).
- [ ] CSP con *nonce* en modo obligatorio.
- [ ] Ningún secreto en el repositorio (gitleaks limpio en todo el historial).
- [ ] Tokens de Cloudflare con permisos mínimos; 2FA en todas las cuentas.
- [ ] `main` protegida; acciones fijadas por SHA; entorno `production` con aprobación.
- [ ] Copias de seguridad configuradas y una restauración probada.
- [ ] Alertas de errores, ingesta y facturación funcionando.
- [ ] `security.txt` y `SECURITY.md` publicados.
- [ ] Páginas de privacidad y aviso legal publicadas.
- [ ] Rutas internas (`/status`, previews) detrás de Cloudflare Access.

## 22. Mapa rápido frente a OWASP Top 10

| Riesgo OWASP | Sección de este documento |
|---|---|
| Control de acceso roto | 9, 10 |
| Fallos criptográficos | 3.2, 9, 11 |
| Inyección | 5, 6, 7.2, 8 |
| Diseño inseguro | 1, 2, 14 |
| Configuración incorrecta | 3, 4, 13 |
| Componentes vulnerables | 12 |
| Fallos de identificación y autenticación | 9 |
| Fallos de integridad de software y datos | 8, 12, 13 |
| Fallos de registro y monitorización | 16 |
| SSRF | 8 |
