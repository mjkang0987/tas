-- 공개 예약 페이지 오너 콘텐츠 다국어(Phase A): 시술명·담당자명·매장명·안내문 번역 저장.
-- 전부 추가형·nullable JSONB. 데이터 파괴 없음. IF NOT EXISTS로 멱등(수동 선적용 안전).
-- 저장 형태: {"en": "...", "ja": "...", "zh": "..."} (일부 키만 있어도 됨). 없으면 원문(한국어) 폴백.

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "nameI18nJson" JSONB;
ALTER TABLE "Assignee" ADD COLUMN IF NOT EXISTS "nameI18nJson" JSONB;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "nameI18nJson" JSONB;
ALTER TABLE "StoreBookingSettings" ADD COLUMN IF NOT EXISTS "noticeI18nJson" JSONB;
