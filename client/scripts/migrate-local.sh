#!/usr/bin/env sh
# 로컬 DB 전용 Prisma 마이그레이션 래퍼.
#
# 배경: 이 프로젝트의 prisma.config.ts 는 마이그레이션 접속에 DIRECT_URL(운영) 을
#       우선 사용한다. 그래서 `prisma migrate dev` 를 그냥 돌리면 운영 DB로 간다.
#       이 스크립트는 .env.local 의 DATABASE_URL(localhost) 을 DIRECT_URL/DATABASE_URL
#       로 강제하고, 대상이 localhost 가 아니면 실행을 거부한다.
#
# 사용: pnpm prisma:migrate:local dev --name <변경명>
#       pnpm prisma:migrate:local status
set -e

ENV_FILE=".env.local"
[ -f "$ENV_FILE" ] || { echo "🛑 $ENV_FILE 없음 (client/ 에서 실행하세요)"; exit 1; }

LOCAL_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
[ -n "$LOCAL_URL" ] || { echo "🛑 .env.local 에 DATABASE_URL 이 없음"; exit 1; }

HOST=$(echo "$LOCAL_URL" | sed -E 's#.*://[^@]*@([^:/]+).*#\1#')
echo "🔌 마이그레이션 대상 host: $HOST"
case "$HOST" in
  localhost|127.0.0.1) ;;
  *) echo "🛑 localhost 가 아닙니다 ($HOST) — 운영 보호를 위해 중단합니다."; exit 1;;
esac

DIRECT_URL="$LOCAL_URL" DATABASE_URL="$LOCAL_URL" pnpm exec prisma migrate "$@"
