# Paddock Notes

F1 explicada con datos. Proyecto personal y no oficial, sin afiliación con Formula 1 ni con ningún equipo.

Todo corre en Cloudflare: una web en Next.js 16, una API pública propia y un Worker de ingesta que carga los datos de Jolpica F1 en D1. La documentación completa está en [docs/](docs/README.md).

## Estructura

| Carpeta | Qué es |
|---|---|
| `apps/web` | Next.js 16 + React 19 desplegado con OpenNext → Worker `paddock-web` |
| `workers/api` | API pública `/api/v1` (Hono + OpenAPI) → Worker `paddock-api` |
| `workers/ingest` | Ingesta programada y limitador saliente (Durable Object) → Worker `paddock-ingest` |
| `packages/shared` | Tipos del contrato, esquemas Zod y normalización de Jolpica |
| `packages/db` | Esquema Drizzle, migraciones de D1 y los módulos `f1-read` y `f1-write` |
| `fixtures/` | Respuestas reales de Jolpica para los tests |

## Desarrollo local

Requisitos: Node 22 o superior y pnpm 10.

```sh
pnpm install

# Base de datos local compartida por los tres Workers
cd workers/api && pnpm exec wrangler d1 migrations apply paddock-db --local --persist-to ../../.wrangler/state && cd ../..

# Ingesta: carga el calendario y los resultados de la temporada en curso desde Jolpica
cd workers/ingest && pnpm exec wrangler dev --test-scheduled --persist-to ../../.wrangler/state --port 8788
curl "http://localhost:8788/__scheduled?cron=0+4+*+*+*"     # en otra terminal

# API
cd workers/api && pnpm exec wrangler dev --persist-to ../../.wrangler/state --port 8787

# Web: compilada con OpenNext y servida por wrangler (enlaza con la API por Service Binding)
cd apps/web && pnpm build:worker && pnpm exec wrangler dev --port 8789
```

## Comprobaciones

```sh
pnpm lint        # incluye la regla D-14: la API y la web no pueden importar el módulo de escritura
pnpm typecheck
pnpm test        # los tests de Workers se ejecutan en workerd con D1 local
pnpm audit --audit-level high
```

## Licencias

- Código: [MIT](LICENSE).
- Datos de F1: Jolpica F1 y OpenF1, con licencia [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Los datos derivados se publican con la misma licencia (D-12).
- Fuente Archivo: SIL Open Font License (`apps/web/public/fonts/OFL.txt`).
