-- 온라인 예약 Phase 1b: 고객 관리 링크용 추측불가 토큰.
-- 인증이 없는 공개 예약이므로 예약 확인/변경/취소는 이 토큰(URL)으로만 접근한다.
-- IF NOT EXISTS: Supabase 등에서 수동 선반영했어도 migrate deploy 가 충돌 없이 통과하도록.

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_publicToken_key" ON "Reservation"("publicToken");
