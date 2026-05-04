#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ -f "$PROJECT_DIR/.env" ]; then
    # shellcheck disable=SC1090
    set -a; . "$PROJECT_DIR/.env"; set +a
fi

if [ -f "$PROJECT_DIR/.env.local" ]; then
    # shellcheck disable=SC1090
    set -a; . "$PROJECT_DIR/.env.local"; set +a
fi

DEV_HOSTNAME="${DEV_HOSTNAME:-dev.takeaseat.co.kr}"
DEV_PORT="${PORT:-3000}"
HTTPS_KEY_PATH="${HTTPS_KEY_PATH:-}"
HTTPS_CERT_PATH="${HTTPS_CERT_PATH:-}"
HTTPS_CA_PATH="${HTTPS_CA_PATH:-}"

if [ -z "$HTTPS_KEY_PATH" ] || [ -z "$HTTPS_CERT_PATH" ]; then
    echo "HTTPS_KEY_PATH and HTTPS_CERT_PATH must be set." >&2
    echo "Example:" >&2
    echo "  HTTPS_KEY_PATH=/path/to/dev.takeaseat.co.kr-key.pem" >&2
    echo "  HTTPS_CERT_PATH=/path/to/dev.takeaseat.co.kr.pem" >&2
    exit 1
fi

set -- pnpm exec next dev --webpack \
    --hostname "$DEV_HOSTNAME" \
    --port "$DEV_PORT" \
    --experimental-https \
    --experimental-https-key "$HTTPS_KEY_PATH" \
    --experimental-https-cert "$HTTPS_CERT_PATH"

if [ -n "$HTTPS_CA_PATH" ]; then
    set -- "$@" --experimental-https-ca "$HTTPS_CA_PATH"
fi

exec "$@"
