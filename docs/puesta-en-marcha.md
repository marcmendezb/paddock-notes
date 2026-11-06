# Paddock Notes — Puesta en marcha en Cloudflare

> Lista de pasos para pasar del repositorio a la web publicada. Sigue el orden: cada paso deja lo que necesita el siguiente. Resume y concreta [stack.md §17](stack.md#17-puesta-en-marcha-orden-recomendado).
> Hasta el paso 9, GitHub solo pasa las comprobaciones (lint, tipos, tests, build y gitleaks). La preview, el despliegue y la copia de seguridad esperan a la variable `CLOUDFLARE_READY`.

## 1. Cuentas

- [ ] Cuenta de Cloudflare con 2FA (llave o passkey). Plan **Workers Paid**: lo exigen Workflows, Email Service y los límites de CPU (stack.md §14).
- [ ] Dominio `paddocknotes.dev` en Cloudflare Registrar, con DNSSEC (D-20). Si eliges otro, cambia `paddocknotes.dev` en los tres `wrangler.jsonc`, en `SITE_URL` y en `EMAIL_FROM`.
- [ ] En GitHub: 2FA, *secret scanning* con protección de push y alertas de Dependabot activadas (Settings → Code security).

## 2. Recursos (jurisdicción UE)

Desde la raíz del repo, con `pnpm exec wrangler login` hecho:

```sh
pnpm exec wrangler d1 create paddock-db --jurisdiction eu
pnpm exec wrangler d1 create paddock-db-preview --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-analysis --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-analysis-preview --jurisdiction eu
pnpm exec wrangler r2 bucket create paddock-backups --jurisdiction eu
pnpm exec wrangler kv namespace create CACHE
pnpm exec wrangler kv namespace create CACHE_PREVIEW
```

- [ ] Copia los `database_id` en `workers/api/wrangler.jsonc` y `workers/ingest/wrangler.jsonc`: hoy llevan ceros (`00000000-…-000000000000` para producción y `…-000000000001` para preview).
- [ ] Copia los `id` de KV en `workers/api/wrangler.jsonc`: también llevan ceros.
- [ ] En `paddock-backups`, regla de ciclo de vida que borre los objetos a los 90 días (D-15).

## 3. Email Service

- [ ] Añade `paddocknotes.dev` como dominio de envío en Email Service y publica los registros SPF, DKIM y DMARC que te indique.
- [ ] Comprueba que `hola@paddocknotes.dev` puede enviar. Si usas otra dirección, cambia `EMAIL_FROM` en `workers/api` y `workers/ingest`.
- [ ] `MAIL_POSTAL_ADDRESS` en `workers/ingest/wrangler.jsonc`: la dirección del responsable para el pie de la newsletter (contenido.md §5.5). Vacía, no se muestra.

## 4. Turnstile

- [ ] Crea un widget en modo *Managed* para `paddocknotes.dev` (y otro para el host de preview).
- [ ] **Clave pública:** sustituye `TURNSTILE_SITE_KEY` en `apps/web/wrangler.jsonc`. Hoy lleva la clave de pruebas de Cloudflare (`1x00000000000000000000AA`), que aprueba a cualquiera.
- [ ] **Clave secreta:** `pnpm --filter @paddock/api exec wrangler secret put TURNSTILE_SECRET` (y con `--env preview`).

## 5. Secretos de los Workers

```sh
# Firma de las sesiones: 32 bytes aleatorios, distintos en producción y en preview.
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET
openssl rand -hex 32 | pnpm --filter @paddock/api exec wrangler secret put AUTH_SECRET --env preview
```

Ningún secreto va en `vars` ni en el repositorio (seguridad.md §11). Los valores locales están en `workers/api/.dev.vars`, que no se sube.

## 6. URLs de la preview

Los Workers de preview viven en `workers.dev` con el subdominio de tu cuenta (`<subdominio>.workers.dev`).

- [ ] Sustituye `https://paddock-web-preview.workers.dev` por la URL real (`https://paddock-web-preview.<subdominio>.workers.dev`) en `apps/web/wrangler.jsonc` (`SITE_URL`) y en `workers/api/wrangler.jsonc` (`SITE_URL`, `AUTH_BASE_URL`, `TRUSTED_ORIGINS`).
- [ ] Protege los dos hosts de preview con **Cloudflare Access** (plan gratuito de Zero Trust), con tu login. Crea un *service token* para Playwright y Lighthouse.

## 7. Datos

```sh
cd workers/api && pnpm exec wrangler d1 migrations apply paddock-db --remote && cd ../..
pnpm --filter @paddock/ingest exec wrangler deploy
```

- [ ] Espera a que el cron diario cargue la temporada en curso, o lánzala a mano desde el panel de Workers (Triggers → Cron). **La web no se publica sin la temporada en D1 (D-05).**
- [ ] El histórico (`BACKFILL`) avanza solo, una temporada por cada cron de 15 minutos: unas 33 horas (D-11).

## 8. Web y API

```sh
pnpm --filter @paddock/api exec wrangler deploy
pnpm --filter @paddock/web run deploy
```

- [ ] Comprueba `https://paddocknotes.dev/api/v1/health` y la home.
- [ ] Activa Cloudflare Web Analytics para el dominio (sin cookies, seguridad.md §17).
- [ ] Antes de anunciar la web: pasa `CSP_REPORT_ONLY` a `"false"` en `apps/web/wrangler.jsonc` (seguridad.md §4.1).

## 9. GitHub Actions

En el repositorio, **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Secreto | `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta |
| Secreto (entorno `production`) | `CLOUDFLARE_API_TOKEN` | Token con *Workers Scripts: Edit*, *D1: Edit* y la zona, limitado a esta cuenta |
| Secreto | `CLOUDFLARE_API_TOKEN_PREVIEW` | Token igual, pero solo para los recursos de preview |
| Secreto (entorno `backup`) | `CLOUDFLARE_API_TOKEN_BACKUP` | Solo D1 de producción (lectura y exportación) y escritura en `paddock-backups` |
| Secreto | `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | El *service token* de Access del paso 6 |
| Variable | `SITE_URL` | `https://paddocknotes.dev` |
| Variable | `PREVIEW_URL` | La URL real de `paddock-web-preview` |
| Variable | `CLOUDFLARE_READY` | `true`, **lo último**: activa preview, despliegue y copia semanal |

- [ ] Entorno `production` con aprobación manual del autor (seguridad.md §13).
- [ ] Protección de `main`: checks en verde obligatorios y PR en lugar de push directo, cuando dejes de trabajar en solitario.
- [ ] Instala la app de **Renovate** en el repositorio: `renovate.json` ya respeta los 14 días de D-19.
- [ ] CodeQL corre solo si el repositorio es público: en uno privado exige GitHub Advanced Security.

## 10. Comprobaciones finales

- [ ] Lighthouse CI en la primera PR (TRA-40, TRA-41).
- [ ] Prueba de resultados enriquecidos de Google con una ficha de GP, un explicador y una entrada del glosario (CON-08).
- [ ] Un ciclo completo de comunidad en producción: enlace mágico, predicción, liga, alta en la newsletter, confirmación y baja en un clic desde un cliente de correo real.
