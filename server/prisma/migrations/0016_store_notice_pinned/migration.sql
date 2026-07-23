-- 공지사항 상단 고정(pinned). 고정 공지는 고객 페이지에서 항상 맨 위에 노출.
-- 추가형·nullable 아님이지만 DEFAULT false라 기존 행 안전. IF NOT EXISTS로 멱등(Supabase direct 5432 수동 선적용 안전).
ALTER TABLE "StoreNotice" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
