#!/usr/bin/env bash
# Levanta el stack local completo con una D1 compartida en .wrangler/state:
#   ingesta en :8788, API en :8787 y web (build de OpenNext) en :8789.
# Uso: scripts/local-stack.sh [--seed | --backfill | --no-cron]   (--seed lanza la tarea diaria de ingesta contra Jolpica)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.wrangler/state"
LOGS="$ROOT/.wrangler/logs"
mkdir -p "$LOGS"

(cd "$ROOT/workers/api" && pnpm exec wrangler d1 migrations apply paddock-db --local --persist-to "$STATE" >/dev/null)

trap 'kill 0' EXIT INT TERM

# Arranque escalonado y un puerto de inspector distinto para cada Worker: si arrancan a la vez,
# los tres wrangler dev compiten por los mismos sockets internos ("Address already in use").
(cd "$ROOT/workers/api" && pnpm exec wrangler dev --persist-to "$STATE" --port 8787 --inspector-port 9230 >"$LOGS/api.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8787/api/v1/health

(cd "$ROOT/workers/ingest" && pnpm exec wrangler dev --test-scheduled --persist-to "$STATE" --port 8788 --inspector-port 9231 --var BACKFILL_LAPS:false --var SITE_URL:http://localhost:8789 >"$LOGS/ingest.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8788/ || true

(cd "$ROOT/apps/web" && pnpm exec wrangler dev --port 8789 --inspector-port 9232 --local-upstream localhost:8789 --var CSP_REPORT_ONLY:false --var SITE_URL:http://localhost:8789 >"$LOGS/web.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8789/es
echo "Stack listo: web http://localhost:8789 · API http://localhost:8787/api/v1/docs · logs en .wrangler/logs"

if [[ "${1:-}" == "--seed" ]]; then
  curl -s "http://localhost:8788/__scheduled?cron=0+4+*+*+*" >/dev/null
  echo "Ingesta diaria lanzada (ver .wrangler/logs/ingest.log)"
fi

# --backfill: lanza el cron de 15 minutos, que crea la siguiente instancia del Workflow del histórico.
# En local no se cargan las vueltas (BACKFILL_LAPS=false). Repítelo para avanzar de temporada.
if [[ "${1:-}" == "--backfill" ]]; then
  curl -s "http://localhost:8788/__scheduled?cron=*/15+*+*+*+*" >/dev/null
  echo "Avance del histórico lanzado (ver .wrangler/logs/ingest.log)"
fi

# Crons de la ingesta: wrangler dev no los dispara solos (--test-scheduled solo los expone). Mientras el
# stack está arriba se lanzan como en producción (workers/ingest/wrangler.jsonc): el de 15 minutos
# (resultados recientes, provisional de OpenF1, análisis e histórico), el diario (calendario y rondas sin
# resultado) y el semanal (sanciones), los tres también al arrancar. --no-cron los desactiva.
if [[ "${1:-}" != "--no-cron" ]]; then
  (
    tick=0
    while true; do
      curl -s "http://localhost:8788/__scheduled?cron=*/15+*+*+*+*" >/dev/null || true
      if ((tick % 96 == 0)); then curl -s "http://localhost:8788/__scheduled?cron=0+4+*+*+*" >/dev/null || true; fi
      if ((tick % 672 == 0)); then curl -s "http://localhost:8788/__scheduled?cron=0+5+*+*+1" >/dev/null || true; fi
      tick=$((tick + 1))
      sleep 900
    done
  ) &
  echo "Crons de la ingesta activos: cada 15 min, diario y semanal (--no-cron para desactivarlos)"
fi

wait
