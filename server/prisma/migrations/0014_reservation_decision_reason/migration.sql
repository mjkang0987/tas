-- 온라인 예약 승인/거절/취소 사유(선택). 고객 조회 페이지 노출용.
-- 추가형·nullable. 데이터 파괴 없음. IF NOT EXISTS로 멱등(Supabase direct 5432 수동 선적용 안전).
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "decisionReason" TEXT;
