-- 고객 공개 온라인 예약(Phase 0): 채널 값·매장 토글/슬러그·예약 규칙 테이블.
-- IF NOT EXISTS: Supabase 등에서 수동 추가했어도 migrate deploy 가 충돌 없이 통과하도록.

-- 예약 채널에 online 추가 (자체 부킹 페이지 경유)
ALTER TYPE "ReservationChannel" ADD VALUE IF NOT EXISTS 'online';

-- 매장 온라인 예약 토글 + 공개 URL 슬러그
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "useOnlineBooking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bookingSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Store_bookingSlug_key" ON "Store"("bookingSlug");

-- 예약 규칙(매장당 1개)
CREATE TABLE IF NOT EXISTS "StoreBookingSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "slotIntervalMin" INTEGER NOT NULL DEFAULT 30,
    "minLeadMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "allowAssigneeChoice" BOOLEAN NOT NULL DEFAULT true,
    "noticeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreBookingSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreBookingSettings_storeId_key" ON "StoreBookingSettings"("storeId");

ALTER TABLE "StoreBookingSettings" DROP CONSTRAINT IF EXISTS "StoreBookingSettings_storeId_fkey";
ALTER TABLE "StoreBookingSettings" ADD CONSTRAINT "StoreBookingSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
