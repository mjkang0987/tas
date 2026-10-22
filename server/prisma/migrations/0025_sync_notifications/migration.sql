-- 네이버 예약 동기화 알림을 서버에 매장 단위로 저장(예전엔 브라우저 localStorage 에만 있어 기기마다 달랐다).
-- 새 테이블 추가만 — 기존 데이터 무변경. IF NOT EXISTS 로 멱등.
-- Supabase 운영에 **코드 배포 전에** 수동 선적용한다(동기화가 이 테이블에 쓰고, 알림 API 가 읽는다).

CREATE TABLE IF NOT EXISTS "SyncNotification" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reservationLegacyId" INTEGER,
    "customerName" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "appointmentDate" TEXT NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SyncNotification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SyncNotification_storeId_createdAt_idx" ON "SyncNotification"("storeId", "createdAt");

CREATE TABLE IF NOT EXISTS "SyncNotificationRead" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncNotificationRead_pkey" PRIMARY KEY ("notificationId", "userId"),
    CONSTRAINT "SyncNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "SyncNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyncNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SyncNotificationRead_userId_idx" ON "SyncNotificationRead"("userId");
