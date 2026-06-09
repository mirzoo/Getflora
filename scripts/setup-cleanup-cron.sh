#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${GETFLORA_ROOT:-/root/Getflora}"
LOG_FILE="/var/log/getflora-cleanup.log"
NPM_BIN="$(command -v npm)"

if [[ -z "$NPM_BIN" ]]; then
  echo "npm not found in PATH"
  exit 1
fi

CRON_LINE="0 3 * * * cd ${PROJECT_DIR} && ${NPM_BIN} run db:cleanup >> ${LOG_FILE} 2>&1"

if crontab -l 2>/dev/null | grep -Fq "npm run db:cleanup"; then
  echo "Cron entry already exists:"
  crontab -l | grep "db:cleanup"
  exit 0
fi

(
  crontab -l 2>/dev/null || true
  echo "$CRON_LINE"
) | crontab -

echo "Added cron entry:"
crontab -l | grep "db:cleanup"

touch "$LOG_FILE"
echo "Log file: $LOG_FILE"
