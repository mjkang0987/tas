-- 예약 상태별 오너 안내문구(#139): 완료(done)·확정(confirm)·취소(cancel) 각 텍스트 + 다국어.
-- 전부 추가형·nullable. 데이터 파괴 없음. IF NOT EXISTS로 멱등(Supabase direct 5432 수동 선적용 안전).
-- 다국어 저장 형태: {"en": "...", "ja": "...", "zh": "..."} (일부 키만 있어도 됨). 없으면 텍스트(한국어) 폴백.

ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "doneText" TEXT;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "doneI18nJson" JSONB;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "confirmText" TEXT;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "confirmI18nJson" JSONB;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "cancelText" TEXT;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "cancelI18nJson" JSONB;
