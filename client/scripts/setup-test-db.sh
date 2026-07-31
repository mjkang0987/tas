#!/bin/sh
set -eu

DB_NAME="takeaseat_test"
DB_USER="${DB_USER:-n230418003}"

# 이미 있으면 정상 진행, 그 외 실패(미기동·권한·인증)는 그대로 드러낸다.
# 전부 삼키면 "DB already exists" 를 찍고 넘어간 뒤 migrate deploy 가 엉뚱한 에러로 죽는다.
if ! err=$(createdb -U "$DB_USER" "$DB_NAME" 2>&1); then
    case "$err" in
        *"already exists"*) echo "ℹ️  DB '$DB_NAME' 이미 존재 — 생성 생략" ;;
        *) echo "🛑 createdb 실패: $err" >&2; exit 1 ;;
    esac
fi

export DATABASE_URL="postgresql://$DB_USER@localhost:5432/$DB_NAME"
export TEST_DB=1

cd "$(dirname "$0")/.."
pnpm exec prisma migrate deploy
node ../server/prisma/seed.mjs
