-- 매장 연락처(고객 문의·개인정보 열람/삭제 요구 접수용).
-- 고객 예약 설정에서 필수로 입력받아 정책 문서·예약 페이지에 노출한다.
-- 추가형·nullable 이라 기존 행 안전. IF NOT EXISTS 로 멱등(Supabase direct 5432 수동 선적용 안전).
-- 적용 순서는 평소대로 "마이그레이션 먼저, 코드 배포 나중"(추가형이므로).
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "contactTel" TEXT;
