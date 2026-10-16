-- 회원권 판매·적립금 충전을 매출로 잡기 위한 가산 변경(데이터 삭제 없음, IF NOT EXISTS 로 멱등).
-- Supabase 운영에 **코드 배포 전에** 수동 선적용한다(회원권·고객 조회가 새 컬럼을 읽는다).

-- 결제수단 '회원권' — 결제완료에서 회원권으로 낸 금액(판매 때 이미 매출이라 매출에서 뺀다).
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'membership';

-- 회원권 판매 금액·결제수단. 둘 다 null 이면 '기존 회원권 등록'(시스템 이전 판매분 — 매출 없음).
ALTER TABLE "CustomerMembership" ADD COLUMN IF NOT EXISTS "salePrice" INTEGER;
ALTER TABLE "CustomerMembership" ADD COLUMN IF NOT EXISTS "salePaymentMethod" "PaymentMethod";

-- 적립금 충전 때 받은 금액·결제수단(보너스가 붙어 적립액 delta 와 다를 수 있다). 예전 충전은 null(매출 없음).
ALTER TABLE "CustomerPointHistory" ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER;
ALTER TABLE "CustomerPointHistory" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
