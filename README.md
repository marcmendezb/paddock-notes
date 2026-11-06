# Paddock Notes

La Fórmula 1 explicada con datos: calendario y resultados, histórico desde 1950, análisis técnico de cada carrera y explicadores para entender lo que pasa en pista. Proyecto personal y **no oficial**, sin afiliación con Formula 1, la FIA ni ningún equipo.

Todo corre en Cloudflare: una web en Next.js, una API pública propia y un Worker de ingesta que carga los datos de Jolpica F1 y OpenF1 en D1 y R2. La documentación completa (decisiones, seguridad, contenido, marca) está en [docs/](docs/README.md); qué está hecho, en [docs/estado.md](docs/estado.md).

## Qué hay

- **Temporada:** próximo GP con cuenta atrás y horarios en tu zona, resultados, clasificaciones, aspirantes al título y mapa de circuitos.
- **Histórico:** todas las temporadas desde 1950, fichas de pilotos, equipos y circuitos, récords, cara a cara y puntos recalculados con el sistema actual.
- **Zona técnica** (desde 2023): estrategia, ritmo por vuelta, sectores, telemetría comparada y la carrera vuelta a vuelta, con notas automáticas.
- **Aprende:** explicadores, una guía para entender una carrera en 10 minutos y un glosario.
- **Comunidad:** cuentas sin contraseña, predicciones, ligas privadas, quiz semanal, simulador de campeonato, favoritos, avisos y newsletter.

## Arquitectura

| Carpeta | Qué es |
|---|---|
| `apps/web` | Next.js 16 + React 19 con OpenNext → Worker `paddock-web`. HTML por petición con CSP con nonce |
| `workers/api` | API pública `/api/v1` (Hono + OpenAPI) y rutas de comunidad (Better Auth) → Worker `paddock-api` |
| `workers/ingest` | Cron Triggers, Workflows (histórico, análisis post-carrera, envíos) y limitador saliente en un Durable Object → Worker `paddock-ingest` |
| `packages/shared` | Tipos del contrato, esquemas Zod, normalización de las fuentes, plantillas de email |
| `packages/db` | Esquema Drizzle, migraciones de D1 y módulos separados de lectura y escritura (D-14) |
| `packages/analysis` | Cálculos de la zona técnica en TypeScript puro |
| `e2e/` | Playwright + axe en escritorio, móvil y modo oscuro |
| `fixtures/` | Respuestas reales de Jolpica y OpenF1 para los tests |

## Desarrollo local

Requisitos: Node 22 o superior y pnpm 10.

```sh
pnpm install
pnpm --filter @paddock/web build:worker
scripts/local-stack.sh --seed   # API :8787, ingesta :8788 y web :8789, con una D1 local compartida
```

`--seed` carga la temporada en curso desde Jolpica. Abre http://localhost:8789/es.

Para la comunidad hace falta `workers/api/.dev.vars` (no se sube al repositorio), con valores de desarrollo y las claves de prueba de Turnstile:

```sh
AUTH_SECRET=<32 bytes en hexadecimal>
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
AUTH_BASE_URL=http://localhost:8789
TRUSTED_ORIGINS=http://localhost:8789,http://localhost:8787
SITE_URL=http://localhost:8789
```

En local, los emails (enlace mágico, newsletter, avisos) no se envían: se guardan como texto en `workers/*/.wrangler/tmp/email/`.

## Comprobaciones

```sh
pnpm lint                         # incluye la regla D-14: la API y la web no pueden importar el módulo de escritura
pnpm typecheck
pnpm test                         # los tests de Workers se ejecutan en workerd con D1 local
pnpm --filter @paddock/e2e e2e    # contra el stack local
pnpm audit --audit-level high
```

La CI de GitHub pasa lo mismo en cada push y en cada PR, además de gitleaks. La puesta en marcha en Cloudflare está en [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md).

## Licencias

- Código: [MIT](LICENSE).
- Datos de F1: Jolpica F1 y OpenF1, con licencia [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Los datos derivados se publican con la misma licencia (D-12).
- Contornos del mapa: Natural Earth, dominio público.
- Fuente Archivo: SIL Open Font License (`apps/web/public/fonts/OFL.txt`).
