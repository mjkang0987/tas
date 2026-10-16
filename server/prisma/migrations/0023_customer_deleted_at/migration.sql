-- 고객 삭제를 하드 삭제 → 익명 처리로 바꾼다.
-- 하드 삭제는 cascade로 예약·결제 내역을 함께 지워 과거 매출이 소급해 빠졌다. 이제 고객 행은 남기고
-- 이름("삭제된 고객")·연락처·메모 등 개인정보만 비운다. deletedAt 은 "삭제(익명 처리)된 고객"의 표시다 —
-- 이름만으로 구분하면 진짜로 그 이름인 고객과 섞인다. 고르는 목록에서 이 고객을 숨기는 기준이 된다.
--
-- 가산·nullable 이라 기존 행은 영향 없음(전부 null = 살아 있는 고객). IF NOT EXISTS 로 멱등 —
-- Supabase 에 수동 선적용 후 코드 배포(고객 조회가 include 로 전 컬럼을 읽어, 컬럼 없이 배포하면 500).
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
