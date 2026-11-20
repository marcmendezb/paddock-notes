#!/usr/bin/env bash
# Starts the full local stack with a shared D1 in .wrangler/state:
#   ingestion on :8788, API on :8787 and web (OpenNext build) on :8789.
# Usage: scripts/local-stack.sh [--seed | --backfill | --no-cron]   (--seed runs the daily ingestion job against Jolpica)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.wrangler/state"
LOGS="$ROOT/.wrangler/logs"
mkdir -p "$LOGS"

(cd "$ROOT/workers/api" && pnpm exec wrangler d1 migrations apply paddock-db --local --persist-to "$STATE" >/dev/null)

trap 'kill 0' EXIT INT TERM

# Staggered start and a different inspector port for each Worker: if they start at the same time,
# the three wrangler dev processes fight over the same internal sockets ("Address already in use").
(cd "$ROOT/workers/api" && pnpm exec wrangler dev --persist-to "$STATE" --port 8787 --inspector-port 9230 >"$LOGS/api.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8787/api/v1/health

(cd "$ROOT/workers/ingest" && pnpm exec wrangler dev --test-scheduled --persist-to "$STATE" --port 8788 --inspector-port 9231 --var BACKFILL_LAPS:false --var JOLPICA_IN_WORKER:true --var SITE_URL:http://localhost:8789 >"$LOGS/ingest.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8788/ || true

(cd "$ROOT/apps/web" && pnpm exec wrangler dev --port 8789 --inspector-port 9232 --local-upstream localhost:8789 --var CSP_REPORT_ONLY:false --var SITE_URL:http://localhost:8789 >"$LOGS/web.log" 2>&1) &
curl -s --retry 60 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8789/es
echo "Stack ready: web http://localhost:8789 · API http://localhost:8787/api/v1/docs · logs in .wrangler/logs"

if [[ "${1:-}" == "--seed" ]]; then
  curl -s "http://localhost:8788/__scheduled?cron=0+4+*+*+*" >/dev/null
  echo "Daily ingestion started (see .wrangler/logs/ingest.log)"
fi

# --backfill: runs the 15-minute cron, which creates the next instance of the history Workflow.
# Locally, laps are not loaded (BACKFILL_LAPS=false). Repeat it to move on a season.
if [[ "${1:-}" == "--backfill" ]]; then
  curl -s "http://localhost:8788/__scheduled?cron=*/15+*+*+*+*" >/dev/null
  echo "History backfill step started (see .wrangler/logs/ingest.log)"
fi

# Ingestion crons: wrangler dev does not fire them on its own (--test-scheduled only exposes them). While the
# stack is up they run as in production (workers/ingest/wrangler.jsonc): the 15-minute one (recent results,
# OpenF1's provisional result, analysis and history), the daily one (calendar and rounds without a result)
# and the weekly one (penalties), all three also on start. --no-cron turns them off.
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
  echo "Ingestion crons running: every 15 min, daily and weekly (--no-cron turns them off)"
fi

wait
