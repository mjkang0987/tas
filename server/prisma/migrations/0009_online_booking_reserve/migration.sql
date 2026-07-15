-- 고객 공개 온라인 예약(Phase 1b): 예약 관리 토큰 + (1c) 노출 서비스 화이트리스트 컬럼.
-- IF NOT EXISTS: Supabase 등에서 수동 선반영했어도 migrate deploy 가 충돌 없이 통과하도록.

-- 고객 예약 관리 링크용 추측 불가 토큰 (per-예약)
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_publicToken_key" ON "Reservation"("publicToken");

-- (1c) 공개 노출 서비스 화이트리스트(서비스명 배열). null=전체 노출. 1b에선 컬럼만, 배선은 1c.
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "bookableServiceIdsJson" JSONB;
