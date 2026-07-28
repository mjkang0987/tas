#!/usr/bin/env sh
# 운영 DB → 로컬 DB 데이터 동기화 (public 스키마).
#
# 안전장치:
#   - source(운영): .env 의 DIRECT_URL. pg_dump 로 읽기만 한다.
#   - target(로컬): .env.local 의 DATABASE_URL. localhost 가 아니면 실행을 거부한다.
#   - --clean --if-exists 로 객체별 DROP 후 재생성(스키마 통째 DROP 안 함).
#     로컬의 기존 데이터는 운영 데이터로 교체된다(운영은 무손상).
#
# 사용: pnpm db:sync:local
set -e

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

[ -f .env ]       || { echo "🛑 .env 없음 (client/ 에서 실행)"; exit 1; }
[ -f .env.local ] || { echo "🛑 .env.local 없음 (client/ 에서 실행)"; exit 1; }

read_var() { grep "^$1=" "$2" | head -1 | sed "s/^$1=//; s/^\"//; s/\"$//"; }
host_of()  { echo "$1" | sed -E 's#.*://[^@]*@([^:/?]+).*#\1#'; }

SRC_URL=$(read_var DIRECT_URL .env)
DST_URL=$(read_var DATABASE_URL .env.local)

[ -n "$SRC_URL" ] || { echo "🛑 .env 에 DIRECT_URL 없음"; exit 1; }
[ -n "$DST_URL" ] || { echo "🛑 .env.local 에 DATABASE_URL 없음"; exit 1; }

SRC_HOST=$(host_of "$SRC_URL")
DST_HOST=$(host_of "$DST_URL")

echo "📤 source(운영, 읽기 전용): $SRC_HOST"
echo "📥 target(로컬, 교체 대상): $DST_HOST"

# target 은 반드시 localhost
case "$DST_HOST" in
  localhost|127.0.0.1) ;;
  *) echo "🛑 target 이 localhost 아님 ($DST_HOST) — 운영 보호 위해 중단"; exit 1;;
esac

# source 는 localhost 이면 안 됨(운영이어야 함)
case "$SRC_HOST" in
  localhost|127.0.0.1) echo "🛑 source 가 localhost — 운영 DB 아님, 중단"; exit 1;;
esac

if [ "$SYNC_YES" != "1" ]; then
  echo "⚠️  운영($SRC_HOST) → 로컬($DST_HOST) 데이터 교체."
  echo "    확인했으면 SYNC_YES=1 로 재실행: SYNC_YES=1 pnpm db:sync:local"
  exit 1
fi

echo "⏬ pg_dump 운영(public, 읽기) → 로컬 복원..."
pg_dump "$SRC_URL" \
  --schema=public \
  --clean --if-exists \
  --no-owner --no-privileges \
  | psql "$DST_URL" -v ON_ERROR_STOP=1

echo "✅ 동기화 완료"
