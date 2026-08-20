-- 병합 제안 '건너뛰기' 기록을 서버로 옮긴다.
-- 가산 변경만 한다(CREATE only). 기존 데이터는 건드리지 않는다.
CREATE TABLE IF NOT EXISTS "CustomerMergeSkip" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "maskedId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "skippedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMergeSkip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerMergeSkip_storeId_maskedId_candidateId_key"
    ON "CustomerMergeSkip"("storeId", "maskedId", "candidateId");

CREATE INDEX IF NOT EXISTS "CustomerMergeSkip_storeId_idx"
    ON "CustomerMergeSkip"("storeId");
