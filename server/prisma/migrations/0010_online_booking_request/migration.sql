-- 고객 공개 온라인 예약(Phase 1d): 고객 변경/취소 요청(오너 승인형)의 대기 상태 표현.
-- IF NOT EXISTS / DO EXCEPTION: Supabase 등에서 수동 선반영했어도 migrate deploy 가 충돌 없이 통과하도록.

-- 신규 enum (CREATE TYPE 은 IF NOT EXISTS 미지원 → duplicate_object 예외 무시로 멱등화)
DO $$ BEGIN
  CREATE TYPE "ReservationPendingAction" AS ENUM ('none', 'cancel', 'change');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 대기 요청 필드: 액션 종류 + 변경 페이로드(JSON) + 요청 시각
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "pendingAction" "ReservationPendingAction" NOT NULL DEFAULT 'none';
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "pendingPayloadJson" JSONB;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "pendingRequestedAt" TIMESTAMP(3);
