-- 네이버 메일 동기화 워터마크. "마지막으로 성공적으로 완주한 동기화의 시작 시각"을 담는다.
-- 이전엔 항상 이번 달 1일부터 재스캔해서, 월말이면 폴링 1회당 4주치 메일을 다시 fetch했다
-- (2026-07 Gmail burst 스로틀로 동기화 실패 발생). 이 컬럼으로 스캔 범위를 1일치로 줄인다.
--
-- 날짜가 아니라 '순간(instant)'이다 — UTC 로 저장하고 epoch 초로 변환해 Gmail after: 에 쓴다.
-- 저장소의 "날짜 전용 컬럼은 toDateKey 로 읽어라" 규칙(Reservation.date 등)의 대상이 아니다.
--
-- 추가형·nullable 이라 기존 행 안전(NULL = 미동기화 → 이번 달 1일 폴백, 백필 불필요).
-- IF NOT EXISTS 로 멱등(Supabase direct 5432 수동 선적용 안전).
ALTER TABLE "GmailConnection" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);
