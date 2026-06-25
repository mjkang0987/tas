-- 매장 기능 토글: 적립금 시스템 / 회원권 시스템 사용 여부.
-- 기존 매장 기본값은 꺼짐(false). 적립금은 이미 쓰던 매장도 명시적으로 켜야 메뉴가 보인다.
ALTER TABLE "Store" ADD COLUMN "usePointSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Store" ADD COLUMN "useMembershipSystem" BOOLEAN NOT NULL DEFAULT false;
