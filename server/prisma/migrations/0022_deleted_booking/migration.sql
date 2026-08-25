-- 삭제된 온라인 예약의 흔적. 고객이 받아 간 관리 링크(publicToken)가 404로 죽지 않게 하는 용도다.
-- 가산 변경만 한다(CREATE only). 기존 데이터·컬럼은 건드리지 않는다.
CREATE TABLE IF NOT EXISTS "DeletedBooking" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "serviceSummary" TEXT NOT NULL,
    "reason" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeletedBooking_publicToken_key"
    ON "DeletedBooking"("publicToken");

CREATE INDEX IF NOT EXISTS "DeletedBooking_storeId_idx"
    ON "DeletedBooking"("storeId");
