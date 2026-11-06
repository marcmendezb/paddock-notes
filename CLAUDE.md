# Paddock Notes

Web no oficial que explica la F1 con datos. Monorepo pnpm, todo en TypeScript y desplegado en Cloudflare.

## Fuente de verdad

- `docs/` manda. Antes de cambiar algo, lee la decisión que lo cubre en `docs/decisiones.md` (`D-xx`).
- Si cambias una decisión, no la borres: márcala como sustituida y añade una nueva.
- Funcionalidades por ID en `docs/funcionalidades.md` (por ejemplo, `NUC-03`). Úsalos en commits y tests.
- Qué está hecho y qué falta: `docs/estado.md`. Actualízalo al terminar cada funcionalidad.
- Reglas visuales en `docs/marca.md`; tokens en `apps/web/app/globals.css`, copiados del brandboard sin cambios.

## Reglas que no se rompen

- **D-05:** solo `workers/ingest` llama a Jolpica y OpenF1, siempre a través de `fetchJson` (lista cerrada de hosts, limitador, Zod).
- **D-14:** la API y la web nunca importan `@paddock/db/f1-write`. Lo vigilan ESLint y `packages/db/test/architecture.test.ts`.
- **D-04:** todo el HTML se renderiza por petición con CSP con nonce (`apps/web/middleware.ts`). Nada de `style=""` en línea, ni `dangerouslySetInnerHTML`, ni scripts de terceros sin justificar en `docs/seguridad.md` §4.1.
- **D-19:** pnpm no instala versiones con menos de 14 días (`pnpm-workspace.yaml`).
- Todo lo externo es hostil: valida con Zod antes de escribir en D1.
- Textos de interfaz en ES y EN por separado (`apps/web/lib/i18n.ts`); la voz está en `docs/contenido.md` §2.

## Comandos

```sh
pnpm lint && pnpm typecheck && pnpm test
pnpm db:generate                        # tras cambiar packages/db/src/schema.ts
pnpm --filter @paddock/web build:worker # build de OpenNext
scripts/local-stack.sh [--seed]         # stack local completo en :8787, :8788 y :8789
pnpm --filter @paddock/e2e e2e          # Playwright + axe contra el stack local
```

Desarrollo local completo: ver `README.md`.

## Trampas conocidas

- En selects de Drizzle, no uses `constructor` como clave de campo: choca con `Object.prototype.constructor`.
- Las respuestas servidas desde la Cache API tienen cabeceras inmutables: cópialas (`new Response(res.body, res)`) antes de tocarlas.
- `@cloudflare/vitest-pool-workers` se llama ahora `@cloudflare/vitest-plugin` (`cloudflareTest()` en `vitest.config.ts`).
- `middleware.ts` y no `proxy.ts`: OpenNext solo admite de forma estable el middleware edge (D-03).
- Nada de `loading.tsx` de página entera: rompe los 404 y el contenido sin JavaScript (D-22).
- Un título o una clasificación final solo valen si la temporada está completa (`COMPLETE_DRIVERS` en f1-history): durante la carga del histórico hay temporadas a medias.
- En local, cambiar código o `wrangler.jsonc` de la ingesta recarga el Worker y pierde las instancias de Workflow en curso: hay que reiniciar `backfill:instance` / `analysis:instance` en `ingest_state`.
- `wrangler dev` reescribe el host y el Origin al dominio de `routes`: la web local se arranca con `--local-upstream localhost:8789` (ya en `scripts/local-stack.sh`), o la protección CSRF rechaza los formularios.
- Por Service Binding no se puede reenviar la cabecera Origin (es "prohibida" en fetch): la web manda `x-paddock-origin`, que la API solo acepta en peticiones internas (sin CF-Connecting-IP).
- Las pruebas en navegador también corren en modo oscuro: comprueba el contraste de cualquier color nuevo en los dos modos.
