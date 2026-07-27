-- 고객 메모 3종(allergyNote·claimNote·preferenceNote) 컬럼 제거.
--
-- 배경: 초기 임포트 시절의 레거시 컬럼으로, 입력 UI가 없어 값을 넣을 방법이 없었다.
-- 운영 데이터 0건 확인 후 앱 배선(모델·매퍼·API·병합 모달)을 전부 제거했다(#167).
-- allergyNote 는 건강정보(민감정보)라 되살릴 경우 개인정보보호법 제23조 별도 동의가 필요하다.
--
-- ⚠️ 적용 순서가 평소와 반대다 — "코드 배포 먼저, 이 마이그레이션 나중".
--   server/api/customers.ts 의 고객 조회가 include(=전체 컬럼 SELECT)를 쓴다.
--   컬럼을 먼저 지우면 구버전 Prisma 클라이언트가 없는 컬럼을 SELECT 해 전체 고객 조회가 500난다
--   (2026-07 publicToken 배포순서 사고와 같은 구조, 방향만 반대).
--   반대로 코드를 먼저 배포하면 컬럼이 남아 있어도 아무도 읽지 않으므로 무해하다.
--
-- IF EXISTS 로 멱등. 데이터 0건 확인 후 실행할 것:
--   SELECT COUNT(*) FILTER (WHERE "allergyNote"    IS NOT NULL AND "allergyNote"    <> '') AS allergy,
--          COUNT(*) FILTER (WHERE "claimNote"      IS NOT NULL AND "claimNote"      <> '') AS claim,
--          COUNT(*) FILTER (WHERE "preferenceNote" IS NOT NULL AND "preferenceNote" <> '') AS pref
--   FROM "Customer";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "allergyNote";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "claimNote";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "preferenceNote";
