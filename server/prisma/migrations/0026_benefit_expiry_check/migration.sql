-- 알림 목록 '확인할 일'(쿠폰·회원권 만료 임박)의 확인 체크를 매장 단위로 저장.
-- 새 테이블 추가만 — 기존 데이터 무변경. IF NOT EXISTS 로 멱등.
-- Supabase 운영에 **코드 배포 전에** 수동 선적용한다(알림 목록 API 가 읽고 쓴다).

CREATE TABLE IF NOT EXISTS "BenefitExpiryCheck" (
    "storeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenefitExpiryCheck_pkey" PRIMARY KEY ("kind", "benefitId"),
    CONSTRAINT "BenefitExpiryCheck_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BenefitExpiryCheck_storeId_idx" ON "BenefitExpiryCheck"("storeId");
