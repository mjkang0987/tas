-- 삭제된 온라인 예약의 흔적. 고객이 받아 간 관리 링크(publicToken)가 404로 죽지 않게 하는 용도다.
-- 가산 변경만 한다(CREATE/ADD only). 기존 데이터·컬럼은 건드리지 않는다.
--
-- 전부 멱등이라 여러 번 적용해도 안전하다(customerId 없이 만들어진 초기본 위에 다시 돌려도 된다).
CREATE TABLE IF NOT EXISTS "DeletedBooking" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "publicToken" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "serviceSummary" TEXT NOT NULL,
    "reason" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedBooking_pkey" PRIMARY KEY ("id")
);

-- 테이블이 이미 있던 경우(초기본)를 위한 보정. NULL 허용이라 기존 행이 있어도 실패하지 않는다.
ALTER TABLE "DeletedBooking" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "DeletedBooking_publicToken_key"
    ON "DeletedBooking"("publicToken");

CREATE INDEX IF NOT EXISTS "DeletedBooking_storeId_idx"
    ON "DeletedBooking"("storeId");

CREATE INDEX IF NOT EXISTS "DeletedBooking_customerId_idx"
    ON "DeletedBooking"("customerId");
