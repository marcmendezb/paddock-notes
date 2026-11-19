# Paddock Notes — Registro de decisiones

> Cada decisión tiene un identificador estable (`D-xx`), su contexto, lo decidido y lo que se descartó. Si una decisión cambia, no se borra: se marca como sustituida y se añade una nueva.
> Última revisión: 5 de noviembre de 2026. Fuentes al final.

## Resumen

| ID | Decisión | Estado |
|---|---|---|
| D-01 | Proyecto desde cero en un monorepo pnpm | Vigente |
| D-02 | Todo desplegado en Cloudflare con el plan Workers Paid | Vigente |
| D-03 | Next.js 16 con OpenNext (vinext descartado tras la comprobación) | Vigente |
| D-04 | HTML renderizado por petición con CSP con *nonce*; la caché vive en la capa de datos | Vigente |
| D-05 | La API nunca llama a fuentes externas | Vigente |
| D-06 | Contrato de errores y semántica de "datos antiguos" | Vigente |
| D-07 | CORS abierto para lectura pública, cerrado para comunidad | Vigente |
| D-08 | Fase 3 sin FastF1: OpenF1 y cálculo en TypeScript | Vigente |
| D-09 | Trazados de circuito: OpenF1 y, si no hay datos, GeoJSON con licencia MIT | Vigente |
| D-10 | Limitador saliente en un Durable Object por fuente | Vigente |
| D-11 | Carga del histórico con un Workflow sobre la API de Jolpica | Vigente |
| D-12 | Licencia: datos CC BY-NC-SA 4.0, código MIT, proyecto no comercial | Vigente |
| D-13 | Datos en la jurisdicción de la UE (D1 y R2) desde el primer día | Vigente |
| D-14 | Separación lectura/escritura en D1 por código, no por binding | Vigente |
| D-15 | Copias de seguridad: Time Travel + exportación semanal desde GitHub Actions | Vigente |
| D-16 | Email con Cloudflare Email Service; newsletter propia en D1 | Vigente |
| D-17 | Autenticación con Better Auth y el adaptador de Drizzle | Vigente (fase 4) |
| D-18 | Entornos: preview con Workers propios y protegidos con Access | Vigente |
| D-19 | Cadena de suministro: versiones con al menos 14 días de antigüedad | Vigente |
| D-20 | Dominio `paddocknotes.dev` | Propuesta (pendiente de compra) |
| D-21 | Reglamento 2026 en el contenido | Vigente |
| D-22 | Sin `loading.tsx` de página entera: 404 reales y contenido sin JavaScript | Vigente |

---

## D-01 · Proyecto desde cero en un monorepo pnpm

**Contexto:** los documentos anteriores daban por hecho un esqueleto previo (backend FastAPI y frontend Next.js 15). Ese código no existe.

**Decisión:** el proyecto empieza desde cero, solo con TypeScript, en el monorepo descrito en `stack.md` §15. Toda la lógica (normalización de Jolpica, limitador, contrato de errores) se escribe directamente en TypeScript, con tests desde el primer commit.

**Consecuencia:** Python desaparece del proyecto (ver D-08).

## D-02 · Todo en Cloudflare con Workers Paid

**Decisión:** web, API, ingesta, base de datos, archivos, tareas programadas, email y analítica en Cloudflare. Plan Workers Paid (5 USD/mes).

**Motivo:** un solo proveedor, un solo lenguaje y un coste previsible. El plan gratuito limita la CPU a 10 ms por invocación, poco para renderizar Next.js, y no incluye Email Service.

## D-03 · Next.js 16 con vinext; OpenNext como plan B

**Decisión:** Next.js 16 + React 19 desplegado con **vinext**, la ruta que Cloudflare recomienda para proyectos nuevos y la que Wrangler configura por defecto.

**Cómo se resuelven las dos dudas de compatibilidad:**

| Pieza | Solución con vinext | Solución con OpenNext |
|---|---|---|
| MDX | `@mdx-js/rollup` como plugin de Vite, colocado **antes** de `vinext()` en `vite.config.ts` | `@next/mdx` |
| Imágenes OG | `next/og` cargado con `import()` dinámico dentro del manejador (si se importa al inicio del módulo, falla en Workers al cargar la fuente); respuesta cacheada como inmutable | `next/og` nativo |

**Comprobación al arrancar (primera semana):** si `npx vinext check` muestra bloqueos en App Router, middleware de idioma, metadatos, MDX u OG, se pasa a OpenNext y se anota aquí. Si `next/og` falla en ambos, las imágenes se generan en el Workflow posterior a la carrera con Satori + resvg-wasm y se guardan en R2.

**Resultado de la comprobación (5 de noviembre de 2026): se adopta OpenNext.** Motivos:

1. La documentación de vinext no dice si aplica el *nonce* de la CSP a sus scripts, y D-04 depende de ello. Con OpenNext se ejecuta Next.js real, que lee el *nonce* de la cabecera `Content-Security-Policy` que fija `proxy.ts`.
2. vinext ya no genera `wrangler.jsonc`: usa un `cloudflare.config.ts` y una CLI nueva (`cf`), distinta de la de los otros dos Workers, y no documenta Service Bindings genéricos (D-05 los necesita).
3. OpenNext es la ruta estable y admite Next.js 16.

Paquete: `@opennextjs/cloudflare`, con la versión más reciente que cumpla D-19 y su rango de `next`. MDX con `@next/mdx`; OG con `next/og`. vinext se revisará cuando salga de beta.

**`middleware.ts` en lugar de `proxy.ts`:** Next.js 16 renombra el middleware a `proxy.ts`, que se ejecuta en el runtime de Node. OpenNext 1.20 lo admite, pero lo marca como experimental y sin mantenimiento oficial. Se usa `middleware.ts` (runtime edge), que OpenNext admite de forma estable; Next.js solo avisa de que la convención está obsoleta. Se migrará a `proxy.ts` cuando OpenNext lo dé por estable.

## D-04 · Renderizado por petición con CSP con nonce

**Contexto:** Next.js solo puede aplicar una CSP estricta con *nonce* si la página se renderiza en cada petición; con *nonce*, la generación estática e ISR quedan desactivadas. La alternativa basada en *hashes* (SRI) es experimental, solo funciona con webpack (Next.js 16 usa Turbopack por defecto) y no cubre los scripts en línea de RSC.

**Decisión:** todas las páginas HTML se renderizan por petición con una CSP estricta con *nonce*, sin excepciones. **La caché se traslada a la capa de datos:**

- La web pide los datos a la API por Service Binding; la API responde desde la Cache API o KV (TTL por recurso, ver `apis.md` §6).
- Los estáticos (JS, CSS, fuentes, SVG) se sirven con caché inmutable desde Static Assets.
- El MDX se compila en el build; renderizarlo por petición cuesta pocos milisegundos.

**Descartado:** ISR con `'unsafe-inline'` (anula la protección contra XSS) y CSP solo en modo informe (no protege).

**Coste:** unos pocos ms de CPU por visita, dentro de los 30 millones de ms incluidos al mes. El riesgo para el rendimiento lo vigila Lighthouse CI (TRA-40, TRA-41); si el LCP en móvil supera 2,5 s, se revisa esta decisión.

## D-05 · La API nunca llama a fuentes externas

**Contexto:** el plan anterior permitía que la API consultara Jolpica en el MVP antes de cargar la base de datos, lo que contradecía el principio de arquitectura.

**Decisión:** solo `paddock-ingest` habla con Jolpica y OpenF1. El lanzamiento exige que la temporada en curso esté cargada en D1 (paso de puesta en marcha en `stack.md` §17). Si un recurso aún no está en la base, la API responde 404 con el estado "sin datos todavía".

## D-06 · Contrato de errores y "datos antiguos"

Como la API ya no depende de fuentes externas en tiempo de petición, desaparece el 502 y cambia el significado de 503:

| Código | Cuándo |
|---|---|
| 400 | Parámetro de ruta o consulta inválido, o cuerpo inválido (fase 4) |
| 404 | Recurso inexistente o sin datos todavía |
| 405 | Método no permitido en esa ruta |
| 429 | Límite de peticiones entrante superado (con `Retry-After`) |
| 500 | Error interno no previsto |
| 503 | D1 no responde o supera el tiempo máximo, sin copia en caché (con `Retry-After`) |

Formato: `{ "error": { "code": "not_found", "message": "..." } }`.

**`X-Data-Stale: true`** se envía cuando:

1. D1 falla y la API sirve la última copia en caché, o
2. el dato es más antiguo de lo esperado: por ejemplo, la carrera terminó hace más de 6 horas y la ingesta todavía no ha guardado el resultado.

Cada respuesta incluye `updated_at` (última ingesta correcta de ese recurso).

## D-07 · CORS

**Contexto:** `stack.md` restringía CORS a los orígenes propios y `seguridad.md` lo abría para la API pública.

**Decisión:** los `GET` de lectura responden con `Access-Control-Allow-Origin: *` y sin credenciales: es una API pública y documentada. Las rutas de comunidad (fase 4) solo aceptan el origen propio, con credenciales y comprobación de `Origin`.

## D-08 · Fase 3 sin FastF1

**Contexto:** desde octubre de 2026, Formula 1 exige autenticación en sus APIs de datos. FastF1 3.9.0 (24 de octubre de 2026) obliga a usar una cuenta de F1TV para la mayoría de sus datos. Usar una suscripción personal para automatizar un servicio público no es viable ni defendible.

**Decisión:**

- La zona técnica usa **OpenF1**, cuyo histórico desde 2023 sigue siendo gratuito y sin autenticación: `laps`, `stints`, `pit`, `position`, `race_control`, `weather`, y `car_data` y `location` **filtrados** por sesión, piloto e intervalo de tiempo de una vuelta.
- Los cálculos (stints, ritmo, telemetría reducida, delta, minisectores, posiciones vuelta a vuelta) se escriben en **TypeScript** en `packages/analysis` y se ejecutan en el Workflow `POST_RACE`.
- Se eliminan **Python, FastF1 y Cloudflare Containers** del proyecto.

**Ventajas:** un solo lenguaje, sin imagen de Container que mantener y una pieza menos que proteger.

**Riesgo:** OpenF1 depende a su vez de los datos de F1. Si pierde el acceso, los análisis ya calculados siguen en R2, porque se guardan para siempre. Las carreras nuevas quedarían sin zona técnica hasta encontrar otra fuente.

**Coste en peticiones por carrera:** unas 50 a OpenF1 (telemetría de la vuelta rápida de cada piloto + 8 endpoints de sesión). Con el límite propio de 25/min, son unos 2 minutos por carrera.

## D-09 · Trazados de circuito

**Decisión:**

1. Circuitos con carreras desde 2023: trazado generado a partir de `location` de OpenF1 (una vuelta limpia), simplificado y guardado como SVG en R2.
2. Circuitos sin datos desde 2023: trazado a partir del repositorio `bacinger/f1-circuits` (GeoJSON, licencia MIT), con atribución en la ficha.
3. Curvas anotadas (NUC-44): archivo de datos por circuito en `content/circuits/`, escrito a mano. Ya no dependemos de los datos de curvas de FastF1/MultiViewer.

## D-10 · Limitador saliente

**Contexto:** el cron cada 15 minutos y los Workflows (histórico, posterior a la carrera) pueden ejecutarse a la vez.

**Decisión:** el contador vive en un **Durable Object** (`OUTBOUND_LIMITER`), una instancia por host. Cada petición saliente pide permiso al Durable Object antes de salir.

| Fuente | Límite publicado | Nuestro límite |
|---|---|---|
| Jolpica | 4/s en ráfaga, 500/h sostenidas (anunciado que bajarán) | 1/s y 400/h (300/h para el histórico), configurables |
| OpenF1 | 3/s y 30/min | 2/s y 25/min, configurables |

Si una fuente responde 429, el limitador bloquea esa fuente durante el `Retry-After` (60 s si no lo envía) y la petición se reintenta. Si la espera supera 30 s, la tarea se aplaza al siguiente cron.

**Prueba real (5 de noviembre de 2026):** cargar la temporada 2026 (29 peticiones) a 3/s provocó un 429 de Jolpica en la petición 28, aunque estábamos por debajo de su límite publicado. Jolpica envió un `Retry-After` corto y el reintento funcionó. Por eso el límite por segundo baja a 2.

**Segunda prueba (6 de noviembre de 2026):** la carga del histórico a 2/s siguió recibiendo algún 429. El límite real de Jolpica se comporta como un cubo que se rellena más despacio de lo que dice su documentación. Se baja a 1/s: no reduce el rendimiento, porque el tope que manda es el horario (400/h, y 300/h para el histórico, para dejar margen a la ingesta en directo).

## D-11 · Carga del histórico

**Decisión:** Workflow `BACKFILL` sobre la API de Jolpica, una temporada por paso, con pausas para respetar el límite. Usa el mismo código de normalización que la ingesta diaria.

**Volumen estimado:** unas 13.000 peticiones (≈1.150 carreras; las vueltas desde 1996 exigen paginación). Con 400/h, son unas 33 horas, una sola vez.

**Descartado:** los volcados CSV de Jolpica. Tienen otro esquema, obligarían a mantener una segunda normalización y llegan con 14 días de retraso.

## D-12 · Licencia y uso no comercial

**Contexto:** los datos de Jolpica y de OpenF1 se publican bajo **CC BY-NC-SA 4.0** y solo para uso no comercial.

**Decisión:**

- Paddock Notes es y seguirá siendo **no comercial**: sin anuncios, sin pago, sin afiliación (ya estaba fuera de alcance).
- Los datos derivados (respuestas de la API, JSON de análisis, gráficos e imágenes) se publican bajo **CC BY-NC-SA 4.0**, con atribución a Jolpica F1 y OpenF1.
- Las respuestas de la API incluyen los campos `source` y `license`.
- El código del repositorio se publica bajo **MIT**.
- Los trazados de `bacinger/f1-circuits` (MIT) se atribuyen en la ficha y en la página "Sobre el proyecto".

## D-13 · Datos en la UE

**Contexto:** la jurisdicción de una base D1 no se puede cambiar después de crearla, y en la fase 4 habrá datos personales.

**Decisión:** `paddock-db`, `paddock-db-preview` y los buckets de R2 se crean con jurisdicción **`eu`** desde el principio. KV no admite jurisdicción, así que solo guarda copias en caché de datos públicos.

## D-14 · Separación de lectura y escritura en D1

**Contexto:** D1 no ofrece bindings de solo lectura.

**Decisión:** `packages/db` exporta dos módulos:

- `f1-read`: solo consultas `select` sobre las tablas de F1. Es el único que puede importar `paddock-api`.
- `f1-write`: inserciones idempotentes. Solo puede importarlo `paddock-ingest`.

Una regla de lint (`no-restricted-imports`) y un test de arquitectura fallan si la API importa el módulo de escritura.

## D-15 · Copias de seguridad

**Decisión:**

1. **Time Travel** de D1: restauración a cualquier minuto de los últimos 30 días.
2. **Exportación semanal** con un workflow de GitHub Actions (`backup.yml`, miércoles a las 03:00 UTC, sin sesiones de F1): `wrangler d1 export --remote` y subida al bucket `paddock-backups`, con una regla de ciclo de vida que borra a los 90 días.

**Motivo:** la exportación no está disponible desde un binding y bloquea las consultas mientras dura. Con una base de decenas de MB, son segundos en una franja sin tráfico. Ningún Worker tiene acceso al bucket de copias.

## D-16 · Email y newsletter

**Decisión:**

- **Cloudflare Email Service** (binding `send_email`) para enlaces mágicos, avisos y newsletter. Incluye 3.000 emails al mes en Workers Paid; después, 0,35 USD por cada 1.000.
- **Newsletter propia sobre D1:** suscriptores, doble confirmación, listas ES/EN y baja en un clic (cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post`). El envío lo hace un Workflow en lotes de 40 por paso (el binding admite 50 subpeticiones por invocación).
- **Plan B:** Resend, si Email Service (en beta) cambia de condiciones.

**Motivo:** el email queda en el mismo proveedor y no se añade ningún encargado de tratamiento nuevo.

## D-17 · Autenticación (fase 4)

**Decisión:** Better Auth con `drizzleAdapter` sobre `drizzle-orm/d1`. La instancia se crea por petición a partir de los bindings. Las migraciones se generan con `drizzle-kit` y se aplican con `wrangler d1 migrations apply`, no con `better-auth migrate`. La versión se fija al empezar la fase 4.

## D-18 · Entornos de previsualización

**Contexto:** las *preview URLs* de una versión de Worker comparten los bindings de producción. Si las previews apuntaran a la base de producción, una PR podría escribir en ella.

**Decisión:**

- Entorno `preview` de Wrangler con Workers propios (`paddock-web-preview`, `paddock-api-preview`, `paddock-ingest-preview`) y recursos propios (`paddock-db-preview`, buckets de preview).
- Cada PR despliega en ese entorno; con un solo autor, la última PR desplegada gana.
- Las URL del entorno de preview y la página `/status` están detrás de **Cloudflare Access** (plan gratuito de Zero Trust, hasta 50 usuarios). Playwright entra con un *service token* de Access.
- En producción, `workers_dev: false` y `preview_urls: false`: solo existe el dominio propio.

## D-19 · Cadena de suministro

**Decisión:** pnpm 10 o superior, fijado en `packageManager`, con `minimumReleaseAge: 20160` (14 días, en minutos) en `pnpm-workspace.yaml`. Renovate con `minimumReleaseAge: "14 days"`. Los parches de seguridad se excluyen a mano con `minimumReleaseAgeExclude` y se revisan en el PR.

## D-20 · Dominio (propuesta)

**Comprobación (5 de noviembre de 2026):** `paddocknotes.com` (registrado en 2021) y `paddocknotes.net` (registrado en abril de 2026) están ocupados. `paddocknotes.dev`, `.app`, `.io` y `.es` no tienen registro DNS (NXDOMAIN), así que probablemente están libres.

**Propuesta:** `paddocknotes.dev`. Encaja con un portfolio de developer, es HTTPS obligatorio por diseño (precarga HSTS de todo el TLD) y Cloudflare Registrar lo vende a precio de coste. Compra pendiente del autor. Mientras tanto, el código usa la variable `SITE_URL`.

## D-21 · Reglamento 2026 en el contenido

**Hechos verificados para el contenido:**

- Desde 2026 el **DRS ya no existe**. Lo sustituye el **modo adelantamiento** (*Overtake mode*): energía eléctrica extra para el coche que está a menos de un segundo, utilizable en cualquier punto del circuito. Aparece además el **Boost**, que despliega la máxima potencia del motor y la batería.
- La **vuelta rápida ya no da punto** desde la temporada 2025.

**Consecuencia:** el explicador 12 y el glosario tratan el DRS como sistema histórico (2011–2025) y explican el modo adelantamiento como sistema vigente. Los demás puntos de reglamento siguen el flujo editorial de `contenido.md` §13.

## D-22 · Sin `loading.tsx` de página entera

**Contexto:** las pruebas de extremo a extremo destaparon dos problemas de los esqueletos de carga de Next.js (`loading.tsx`). Abren un Suspense y la respuesta empieza a enviarse con estado 200 antes de que la página decida que no existe, así que un `notFound()` respondía 200 en lugar de 404. Además, sin JavaScript, el contenido que llega en streaming dentro del Suspense nunca se muestra, lo que incumple TRA-34.

**Decisión:** las páginas no usan `loading.tsx`. Los datos llegan de la API por Service Binding y desde caché, en milisegundos. Los parámetros se validan en los *layouts* de cada segmento, de modo que una URL inválida responde 404 real. Los esqueletos (TRA-30) se usan solo en componentes que cargan datos en el cliente, como los gráficos de la fase 3 (`components/skeleton.tsx`).

## D-23 · Comunidad: autenticación detrás de la web

**Contexto:** la fase 4 añade cuentas. La web habla con la API por Service Binding (D-05), así que el navegador nunca llega a la API directamente y la API no ve el `Origin` real ni la IP del usuario. Además, `wrangler dev` reescribe host y `Origin` al dominio de producción si no se le indica lo contrario.

**Decisión:**

- **Better Auth** con enlace mágico (15 min, token guardado como hash) enviado por Email Service, y Turnstile en la petición del enlace. Sin contraseñas ni, por ahora, proveedores externos.
- **Cookie** `__Host-pn.session_token`: el prefijo `__Host-` obliga a `Secure`, `Path=/` y a no llevar `Domain`, y la cookie la pone la web en su propio dominio.
- **Formularios HTML** que publican en `/[lang]/forms/[action]` (funcionan sin JavaScript): la web comprueba que el `Origin` coincide con el suyo (CSRF), llama a la API y redirige (PRG).
- **Cabeceras internas** `x-paddock-origin` y `x-paddock-client-ip`: la web las reenvía y la API solo las acepta cuando la petición no trae `cf-connecting-ip`, es decir, cuando llega por Service Binding y no desde internet.
- **En local**, la web arranca con `--local-upstream localhost:8789` para que el `Origin` sea el real (`scripts/local-stack.sh`).
- **Retención:** el cron semanal de ingest avisa a las cuentas inactivas 24 meses y las borra 30 días después si no vuelven (seguridad.md §17). Ingest usa el módulo `community` solo para eso; su escritura de F1 sigue en `f1-write` (D-14).

**Consecuencia:** la API de comunidad no se expone con CORS abierto (D-07) y no hay ningún dato de sesión legible desde JavaScript. Un proveedor OAuth se añadiría como otro plugin de Better Auth sin tocar este flujo.

## D-24 · Envíos: newsletter y avisos

**Contexto:** D-16 fija Email Service y una newsletter propia sobre D1. Faltaba decidir quién escribe cada número, cómo se dispara y cómo funciona la baja en un clic, que el cliente de correo hace sin navegador.

**Decisión:**

- **Contenido generado con los datos:** la newsletter se compone en ingest desde D1 siguiendo `contenido.md` §5.5: la carrera en cinco líneas, el gráfico de estrategia, un dato de «esta semana en la historia», el explicador sugerido para el próximo GP (NUC-09) y la próxima cita con la hora de la lista (Madrid o Londres). Las notas editoriales (CON-04) podrán sustituir a la primera sección cuando existan.
- **Un solo Workflow `MAILING`** para la newsletter, los avisos de GP y los de análisis. Primero compone el contenido, sin idioma; después envía lotes de 40, un paso por lote. Se dispara una vez por envío: id de instancia `tipo-temporada-ronda` y marca `mail:` en `ingest_state`.
- **Cuándo se envía:** la newsletter, el martes a las 8:00 UTC si hubo carrera en los últimos 7 días; el aviso de GP, cuando la primera sesión empieza en menos de 48 h; el aviso de análisis, al terminar `POST_RACE` y solo si la carrera tiene menos de 7 días, para no avisar de las carreras antiguas que se analizan al cargar el histórico.
- **Baja en un clic (RFC 8058):** `POST /api/v1/email/unsubscribe/{token}`, sin comprobación de Origin. El proveedor de correo no manda Origin ni cookies, y el token solo sirve para darse de baja. Pasa por el límite de escritura. El enlace del pie lleva a una página con botón.
- **Confirmar y darse de baja exigen pulsar un botón:** los escáneres de enlaces de los servidores de correo abren las URL y, si bastara con abrirlas, confirmarían o darían de baja por el usuario.
- **Turnstile en el alta**, cargado en la home solo cuando el visitante toca el formulario, para no penalizar la carga.

**Consecuencia:** no hay herramienta de terceros para enviar ni editor de newsletters. Fuera de temporada no sale nada hasta que exista contenido editorial (la edición quincenal de `contenido.md` §12 queda pendiente). Si un lote falla a medias, el reintento puede repetir algún email de ese lote, nunca de los anteriores.

## D-25 · OpenF1 se cierra durante las sesiones en directo

**Contexto:** el 6 de noviembre de 2026, con una sesión del GP de Brasil en curso, OpenF1 respondió 401 a peticiones de histórico: «Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends». Un análisis que coincidiera con una sesión fallaba y `advanceAnalysis` lo marcaba como fallido para siempre.

**Decisión:**

- `advanceAnalysis` no empieza ningún análisis si, según el calendario cargado, hay una sesión en curso, terminó hace menos de 45 minutos (margen para retrasos y banderas rojas) o empieza en menos de una hora (OpenF1 se cierra 30 minutos antes).
- `fetchJson` convierte ese 401 concreto de OpenF1 en `LiveSessionError` (un aplazamiento, no un error) y pausa el limitador de OpenF1 15 minutos.
- Los pasos de `POST_RACE` se reintentan 30 veces cada 5 minutos: dos horas y media, más que una sesión con interrupciones.

**Consecuencia:** el análisis de una carrera puede retrasarse unas horas si el fin de semana siguiente empieza enseguida, pero no se pierde. Seguimos sin clave de pago (D-08).

## D-26 · La web también sirve `/api/*`

**Contexto:** los enlaces de los emails (enlace mágico y baja en un clic) apuntan a `{SITE_URL}/api/v1/...`. En producción la ruta `paddocknotes.dev/api/*` del dominio lleva al Worker de la API y la cookie de sesión queda en el host de la web. En la preview, la web y la API son hosts distintos de `workers.dev`: esos enlaces daban 404 y la cookie habría quedado en el host equivocado. En local funcionaba solo porque las cookies no distinguen puertos.

**Decisión:** la web tiene una ruta `/api/[...path]` que reenvía a la API por Service Binding. Descarta todas las cabeceras `x-paddock-*` y `cf-*` que lleguen del navegador, reenvía solo las cookies `__Host-pn.*` y fija ella misma el origen real (`x-paddock-origin`, para la comprobación CSRF) y la IP del visitante (`x-paddock-client-ip` para el límite de escritura y `x-paddock-proxy-ip` para el de lectura, que la API solo acepta en peticiones internas). `AUTH_BASE_URL` es siempre el origen de la web, también en local (`http://localhost:8789`).

**Consecuencia:** el mismo flujo funciona en local, en la preview y en producción. En producción el proxy no se usa, porque la ruta del dominio llega antes.

## D-27 · Cabecera, hero y movimiento

**Contexto:** rediseño de la cabecera y del hero de la home, pedido por el autor, para que la web tenga una primera impresión a la altura del contenido.

**Decisión:**

- **Cabecera de muro de boxes.** Arriba, un cronometraje que se desplaza sin parar: empieza por lo que está en directo o por el próximo evento y alterna evento y dato (sesiones que quedan, siguientes GP, líderes, último ganador, vuelta rápida, remontada, análisis, nota y efeméride). Se recalcula cada 30 s y pide datos nuevos cada 10 minutos. Debajo, una barra flotante con el símbolo (solo el símbolo; el nombre va en la etiqueta accesible), las secciones con un bloque lima que se desliza bajo la señalada y un panel con datos reales por sección. En móvil, menú a pantalla completa con un `<details>`, que funciona sin JavaScript.
- **Hero.** Vídeo propio de fondo, grabado desde la grada, en blanco y negro, sin sonido y recortado para que no aparezca ninguna marca; pesa 700 kB (escritorio) o 400 kB (móvil), se carga cuando la página ya ha cargado y aparece con un fundido cuando puede reproducirse sin cortes. Se sirve por `/media`, que responde a peticiones por rangos (HTTP 206), porque los recursos estáticos de Workers no lo hacen y Safari en iPhone lo necesita. Encima, el trazado del próximo circuito coloreado por velocidad con un cuadrado lima que lo recorre al ritmo real de la vuelta rápida, la cuenta atrás como cota y el fin de semana como calendario.
- **Movimiento.** Desplazamiento suave con Lenis; entrada coreografiada del hero y animaciones ligadas al scroll con CSS (`animation-timeline`), solo `transform` y `opacity` y curvas exponenciales. Todo se desactiva con «reducir movimiento». Las pruebas en navegador se ejecutan con movimiento reducido: comprueban la página en reposo.

**Excepción consciente a WCAG 2.2.2 (Pausar, detener, ocultar, nivel A).** El autor decidió que el cronometraje no se pueda parar. El único mecanismo que queda es la preferencia «reducir movimiento» del sistema, con la que se queda quieto. Es un incumplimiento de TRA-20 asumido y documentado; para volver a cumplir basta con recuperar el botón de pausa del componente `TimingStrip`. El vídeo del hero sí tiene su botón de pausa.

**Consecuencia:** la CSP añade `media-src 'self'`. La cabecera hace siete consultas a la API por página, todas cacheadas en la capa de datos y tolerantes a fallos: si la API no responde, la navegación sale igual.

## D-28 · Secciones de la home, foco y colores de estado

**Contexto:** segunda tanda del rediseño, pedida por el autor: última carrera, clasificación y newsletter, y reglas visuales que valen para toda la web.

**Decisión:**

- **Colores de estado.** «Siguiente» va siempre en lila (acento 2) y «en directo» siempre en lima (acento 1): en el cronometraje (lo fijo de la izquierda, un bloque de color entero con texto negro, completa D-27), en el calendario del fin de semana y en las cuentas atrás de la cinta.
- **Última carrera.** Banda clara (gris de la marca) que abre una franja a cuadros de meta, con el circuito de la carrera de fondo (curva suave y un círculo lila que lo recorre). El ganador y la nota van en bloques negros; el gráfico de posiciones, en una tarjeta con leyenda y las cuatro cifras al pie. La meta muestra las posiciones ganadas o perdidas (+4, −1).
- **Clasificación como pelea por el título.** Banda negra con un carril por piloto (y por equipo): puntos, lo que aún puede sumar, los puntos del líder y el máximo posible. El titular sale de la cuenta de NUC-36 («X, campeón del mundo», «Cosa de dos», «N pilotos aún pueden ser campeones»). Los equipos suman como máximo un primero y un segundo por ronda.
- **Newsletter que se enseña.** Junto al formulario, un número de muestra hecho con la última carrera (nota, cinco primeros, línea de posición del ganador y próxima cita en hora de Madrid o Londres), rotulado como muestra.
- **Pictogramas animados.** Cada pictograma tiene una pieza que se mueve (aguja, bandera, manecillas…) al pasar por encima de su enlace o botón y, en bloques marcados, al entrar en pantalla. Quietos con «reducir movimiento».
- **Foco sin anillo.** El autor no quiere anillos de selección. El foco con teclado sigue viéndose (WCAG 2.4.7): los enlaces se subrayan con el color de foco, los controles toman un fondo tenue y el logo se pinta en lila.
- **Sin filetes de un solo lado** en color o más gruesos (marca.md §3): se destacan los bloques con fondo, borde completo o pictograma.
- **Pie de página.** Siempre en negro. A la izquierda, el símbolo en grande: una luz lila lo recorre sin parar por una trazada curva y sin esquinas, con estela dentro de las letras; el punto lima no se mueve (no se deforma) y respira al volver la luz. Se inclina en 3D hacia el cursor. Debajo, el eslogan y la newsletter. A la derecha, la temporada carrera a carrera y la navegación. Lo legal, en una línea pequeña con el contraste mínimo de AA.
- **Transición entre páginas.** Cortina en dos capas (lima y lila, alternando cuál va delante) que sube desde abajo al instante del clic, tapa mientras se carga la página nueva y sigue subiendo para descubrirla. Se hace con un componente propio (`RouteCurtain`), no con la View Transitions API: esta solo anima cuando la página nueva ya ha cargado, y el clic se quedaba sin respuesta. Sin JavaScript o con «reducir movimiento», navegación normal.
- **Cabecera.** Negra a todo el ancho en todas las páginas, también en la home. La página activa y el hover van en cursiva. El panel de «Carreras» es un panel ancho con el próximo GP (sesiones en la hora del visitante), la temporada alrededor de hoy y la última carrera.
- **Scroll.** Lenis con más inercia y sin rebote elástico en los bordes.
- **Newsletter.** Casilla de consentimiento obligatoria con enlace a la política de privacidad, comprobada también en la API.

**Consecuencia:** la home pide además el calendario de la temporada y el trazado del circuito de la última carrera; las dos consultas son tolerantes a fallos y, sin ellas, las secciones salen sin el dato que falta.


## D-29 · Alemán como tercer idioma

**Contexto:** el autor quiere toda la web también en alemán, con opción de elegirlo.

**Decisión:**

- `LANGS` pasa a `es`, `en` y `de`. Rutas `/de/…`, `hreflang` en todas las páginas y en el sitemap, y negociación por `Accept-Language` (un navegador en alemán entra en `/de`; los idiomas sin traducción siguen yendo al español).
- Todo se escribe en alemán por separado, no se traduce en tiempo real: el diccionario de interfaz, los 13 explicadores, las fichas de circuito, las notas de carrera, el glosario, las páginas de texto, las notas de curvas, los nombres de Grandes Premios («Großer Preis von Brasilien») y los emails (newsletter, avisos, enlace de acceso y aviso de borrado). Se tutea, como en español.
- Fechas y números con `de-DE`; la lista alemana de la newsletter usa la hora de Berlín.
- El selector de idioma enseña los tres (ES · EN · DE, con el nombre completo como etiqueta accesible) y conserva la página.

**Consecuencia:** cada texto nuevo de interfaz o contenido se escribe en los tres idiomas; TypeScript lo exige (`Record<Lang, …>`). Las pruebas en navegador incluyen páginas en alemán.
---

## Fuentes (consultadas el 5 de noviembre de 2026)

- Jolpica F1: límites (`docs/rate_limits.md`), términos (`TERMS.md`), volcados, vueltas desde 1996 y paradas desde 2011 — https://github.com/jolpica/jolpica-f1
- OpenF1: límites, histórico gratuito, licencia y endpoints — https://openf1.org/ y https://openf1.org/docs
- FastF1: requisito de F1TV desde 3.9.0 — https://docs.fastf1.dev/
- Cloudflare Containers, precios — https://developers.cloudflare.com/containers/pricing/
- Cloudflare Email Service: precios y límites — https://developers.cloudflare.com/email-service/platform/pricing/ y https://developers.cloudflare.com/email-service/platform/limits/
- D1: jurisdicción — https://developers.cloudflare.com/changelog/post/2025-11-05-d1-jurisdiction/
- D1: importación y exportación — https://developers.cloudflare.com/d1/best-practices/import-export-data/
- Next.js, CSP — https://nextjs.org/docs/app/guides/content-security-policy
- vinext con MDX y OG en Workers — https://dev.to/devoresyah/deploy-fumadocs-to-cloudflare-workers-with-vinext-j83
- pnpm `minimumReleaseAge` — https://pnpm.io/settings
- Cloudflare Access, plan gratuito — https://www.cloudflare.com/products/cloudflare-access
- WAF, Free Managed Ruleset — https://developers.cloudflare.com/waf/managed-rules/
- Workers Observability, precios desde el 1 de diciembre de 2026 — https://developers.cloudflare.com/observability/pricing/
- Containers, control de salida (ya no aplica tras D-08) — https://developers.cloudflare.com/containers/platform-details/outbound-traffic/
- `bacinger/f1-circuits` (MIT) — https://github.com/bacinger/f1-circuits
- Reglamento 2026 — https://www.formula1.com/en/latest/article/from-smaller-cars-to-a-bigger-budget-cap-12-rule-changes-you-need-to-know-in.56uUTFhB0z5j3iZfhC0rGP

## D-30 · Ficha de circuito, anclas y animación de entrada

**Contexto:** la ficha de circuito se leía como una lista (un mapamundi en una tarjeta, un trazado en negro y una tabla), y el subencabezado de carrera y circuito llevaba a una sección equivocada.

**Decisión:**

- **Ficha de circuito:**
  - **La vuelta rápida a tiempo real** en el hero: el trazado coloreado por la velocidad de cada tramo y el cuadrado lima recorriéndolo con los tiempos de la telemetría. La acompañan un velocímetro, el crono y una barra de progreso. Se mueve con `requestAnimationFrame` y atributos SVG; se puede pausar (WCAG 2.2.2), se para fuera de pantalla y con movimiento reducido no arranca sola.
  - **«La vuelta»**, en una banda negra: cifras de la vuelta, la traza de velocidad metro a metro con dos notas (la punta y la frenada más lenta) y una ficha por frenada con la nota editorial. Sustituye a la tabla de frenadas.
  - **«Dónde está»**: un globo ortográfico girado hacia el circuito, con la noche de ese momento (posición del sol aproximada a un grado), la hora local y la diferencia con la del visitante.
  - **Palmarés**: ranking de pilotos y equipos (desde cuatro Grandes Premios) y todos los ganadores, año a año.
  - Sin telemetría, el hero usa el trazado de bacinger/f1-circuits (MIT) y la ficha omite «La vuelta».
- **Anclas:** las lleva `SmoothScroll` y no Lenis. Lenis no cancelaba el salto nativo, restaba dos veces el margen y medía con las transformaciones de las animaciones de entrada.
  - La posición se calcula con `offsetTop` y se descuentan la cabecera y el subencabezado.
  - Sin JavaScript, `scroll-margin-top` deja el título en el mismo sitio.
  - La pestaña pulsada queda marcada hasta que se vuelve a desplazar a mano.
  - Comprobado en Chromium, WebKit y Firefox.
- **Animación de entrada:** una vez por sesión del navegador (`sessionStorage`). Al recargar o navegar no se repite, para no hacer esperar al lector.

**Consecuencia:** `topojson-client` y `world-atlas` pasan a dependencias de ejecución de la web. Safari aplica `upgrade-insecure-requests` también a `http://localhost`, así que para probar WebKit en local hay que quitar esa directiva de la CSP en la prueba (en producción, con HTTPS, no afecta).

## D-31 · Resultado provisional de OpenF1

**Contexto:** el 8 de noviembre de 2026, tras el GP de São Paulo, Jolpica dejó de responder durante horas. La web siguió sin resultado aunque OpenF1 tenía la clasificación final minutos después de la bandera a cuadros. El autor quiere la web siempre al día.

**Decisión:**

- En el cron de 15 minutos, tras una carrera y antes de pedir el oficial a Jolpica, la ingesta lee `session_result` y `drivers` de OpenF1 (validados con Zod) y los guarda en una tabla aparte, `provisional_results`. Si OpenF1 falla (por ejemplo, cerrado por otra sesión en directo, D-25), se intenta el oficial igualmente.
- Los pilotos se casan por su código de tres letras con la parrilla de la temporada. No se inventan identificadores: hasta dos debutantes se omiten, salvo que estén en el podio; si algo más no cuadra (posiciones repetidas, sin ganador, número de coches imposible), no se escribe nada.
- La API sirve el provisional, con `provisional: true`, solo mientras no hay resultado oficial; también cuenta como «última carrera» de la portada. No entra en clasificaciones, récords ni histórico. Cuando llega el oficial, la siguiente pasada borra el provisional.
- La página de carrera lo muestra con un aviso: falta la confirmación oficial, puede cambiar por sanciones y sus puntos aún no cuentan en el Mundial. Sin parrilla ni vuelta rápida, que OpenF1 no da en esa respuesta.

**Consecuencia:** sigue sin clave de pago (D-08). El directo vuelta a vuelta durante la carrera queda fuera: exige la cuenta de pago de OpenF1 y sería una decisión aparte.

## D-32 · Cabecera y piezas comunes de las páginas de sección

**Contexto:** las páginas que no tenían diseño propio (análisis, aprende, notas, glosario, récords, fichas de piloto y equipo, cara a cara, quiz, simulador, predicciones, newsletter, cuenta, búsqueda, páginas de texto y ligas) eran un título sobre blanco con listas y formularios del navegador.

**Decisión:**

- **`PageHero`** (`components/page-hero.tsx`): la misma banda negra que las páginas de carrera, circuito, histórico y clasificación.
  - Contiene antetítulo con pictograma, título grande, entradilla y un hueco a la derecha para cifras (`HeroStats`) o acciones.
  - Detrás, el pictograma de la sección en gigante y en trazo tenue.
- **Fichas de piloto y equipo** (`components/profile-view.tsx`):
  - el dorsal (o las iniciales del equipo) enorme en contorno, detrás;
  - los títulos como insignias lima;
  - el balance frente al compañero de equipo como barra partida;
  - temporada a temporada en tabla oscura, con barra de puntos.
- **Tarjetas enlazadas (`.tile`)** para listas de destinos: herramientas, explicadores, carreras analizadas y resultados de búsqueda.
- **Tablas de datos en el estilo de cronometraje** (`.timing`, con barras): récords, simulador, predicciones, recálculo y trayectorias.
- **Formularios con el lenguaje de la marca:** campos de borde completo, opciones grandes en el quiz, podio para las predicciones y «A vs B» en cara a cara.
- **La crónica de la portada (`race-report.tsx`)** es una plantilla fija que se rellena solo con el resultado, también el provisional (D-31):
  - un titular escrito con los datos;
  - el podio escalonado;
  - seis claves;
  - el gráfico de salida a meta de toda la parrilla;
  - los puntos del 4.º al 10.º.

**Consecuencia:** una página nueva empieza por `PageHero` y reutiliza estas piezas. Las pruebas en navegador apuntan a las clases nuevas (`.an-latest-title`, `.an-tools`, `.sim-champion`).

## D-33 · Newsletter de demostración, vídeo sin pausa y selector de idioma al pasar el ratón

**Contexto:** Paddock Notes es un proyecto de portfolio. El autor no quiere recoger emails de visitantes ni que el vídeo del hero se pueda pausar, y quiere que el selector de idioma se comporte como los desplegables de la cabecera.

**Decisión:**

- **Newsletter (NUC-10) como demostración:**
  - El formulario se ve como el real, pero al enviarlo no sale nada del navegador: se vacía y se abre un aviso (`<dialog>` nativo) que explica que es un proyecto de portfolio, que el email no se ha guardado y que no se enviará nada.
  - Sin JavaScript, la ruta de formularios responde sin leer el cuerpo y vuelve a `/newsletter` con el mismo aviso.
  - El formulario ya no carga Turnstile.
  - La política de privacidad lo dice en los tres idiomas.
  - El endpoint de la API se conserva por si se reactiva; la web no lo llama.
- **Vídeo del hero sin botón de pausa:** es una excepción consciente a WCAG 2.2.2 (pausar contenido en movimiento de más de 5 s). Para atenuarla, con movimiento reducido el vídeo no se reproduce y queda en su primer fotograma, y el velo del hero lo mantiene en segundo plano.
- **Selector de idioma:** con ratón se abre al pasar por encima y se cierra al salir, con 150 ms de margen y un puente invisible sobre el hueco. Con teclado y en táctil sigue siendo un `<details>` que se abre al pulsar.

**Consecuencia:** la newsletter de los martes (CON-06) no tiene destinatarios mientras dure la demostración. Si se reactiva, se sustituye esta decisión y vuelven Turnstile y el texto de privacidad anterior.
