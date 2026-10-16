#!/bin/sh
set -eu

DB_NAME="${DB_NAME:-takeaseat_test}"
DB_USER="${DB_USER:-n230418003}"

# prisma.config.ts 는 DIRECT_URL 을 우선 쓰고 dotenv 로 .env(운영 DIRECT_URL)를 읽는다 — 둘 다 덮어야 로컬로 간다.
# (dotenv 는 이미 있는 env 를 덮지 않는다.)
TEST_URL="postgresql://$DB_USER@localhost:5432/$DB_NAME"
HOST=$(echo "$TEST_URL" | sed -E 's#.*://[^@]*@([^:/]+).*#\1#')
echo "🔌 마이그레이션 대상 host: $HOST / DB: $DB_NAME"
case "$HOST" in
    localhost|127.0.0.1) ;;
    *) echo "🛑 localhost 가 아닙니다 ($HOST) — 운영 보호를 위해 중단합니다." >&2; exit 1 ;;
esac

# 이미 있으면 정상 진행, 그 외 실패(미기동·권한·인증)는 그대로 드러낸다.
# 전부 삼키면 "DB already exists" 를 찍고 넘어간 뒤 migrate deploy 가 엉뚱한 에러로 죽는다.
if ! err=$(createdb -U "$DB_USER" "$DB_NAME" 2>&1); then
    case "$err" in
        *"already exists"*) echo "ℹ️  DB '$DB_NAME' 이미 존재 — 생성 생략" ;;
        *) echo "🛑 createdb 실패: $err" >&2; exit 1 ;;
    esac
fi

export DATABASE_URL="$TEST_URL"
export DIRECT_URL="$TEST_URL"
export TEST_DB=1

cd "$(dirname "$0")/.."
pnpm exec prisma migrate deploy
node ../server/prisma/seed.mjs
