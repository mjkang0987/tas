-- 매장 공지사항(StoreNotice): 공개 예약 페이지 노출용 오너 공지 목록.
-- 신규 테이블 추가형. 데이터 파괴 없음. IF NOT EXISTS로 멱등(Supabase direct 5432 수동 선적용 안전).
-- title/body 다국어: {"en":"...","ja":"...","zh":"..."} (일부 키만 있어도 됨). 없으면 한국어(title/body) 폴백.
-- category: notice(공지) | event(이벤트) | info(안내). visible=false면 비공개(고객 미노출).

CREATE TABLE IF NOT EXISTS "StoreNotice" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'notice',
    "title" TEXT NOT NULL,
    "titleI18nJson" JSONB,
    "body" TEXT NOT NULL,
    "bodyI18nJson" JSONB,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StoreNotice_storeId_idx" ON "StoreNotice"("storeId");

-- FK: 매장 삭제 시 공지도 함께 삭제. 재실행해도 중복 제약 오류 없이 통과.
DO $$ BEGIN
  ALTER TABLE "StoreNotice" ADD CONSTRAINT "StoreNotice_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
