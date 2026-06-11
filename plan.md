# 게스트 → 계정 데이터 마이그레이션 (병합 플로우) 계획

## 배경 / 문제
- 게스트 모드는 모든 데이터를 `localStorage`(`takeaseat.local-db.v1`)에 저장.
- 현재 게스트→SNS 연동 시 마이그레이션(`_app.tsx`)은 **온보딩 API(`/api/onboarding`)를 재사용** → `shopName/shopType/services/designers`만 전송. **고객·예약은 전송 안 됨.**
- 마이그레이션 후 `snapshot.onboarded = false`만 세팅하고 **로컬 데이터는 정리하지 않음** → 나중에 로그아웃→게스트가 되면 잔여 데이터(매장명·고객)가 되살아남.
- 증상: 게스트에서 "고객확인(병합) 모달"·"매장명"이 뜸 = localStorage에 잔여 데이터가 있다는 신호.

## 진입 분기 (게스트가 SNS 연동 → 인증, 로컬 데이터 있음)
서버 응답으로 자동 구분 (이미 서버 가드가 구분해줌):
- **빈 매장 (신규, `200`)** → 게스트 데이터 **전체 자동 이전** → 로컬 정리
- **기존 데이터 있는 매장 (`409` ALREADY_SETUP)** → **확인 레이어** 표시:
  > "기존 **[매장명]** 데이터가 있습니다. 병합하시겠습니까?  **[병합]** / **[삭제]**"
  - **삭제** → 로컬 데이터 정리(폐기)
  - **병합** → 아래 병합 스텝 진행

## 병합 스텝 (케이스 2 - 병합 선택 시)
1. **게스트 데이터 append** — 서버 트랜잭션에서 **ID remap**(기존 max legacyId 뒤로 재배치, 예약의 고객/디자이너 참조도 매핑) 후 추가. *기존 매장 데이터는 절대 덮어쓰지 않음(append/upsert만).*
2. **디자이너 병합 레이어** (신규) — 중복/대응 디자이너를 사용자가 병합 (예약 재배정 + 게스트 디자이너 정리)
3. **고객 병합** — 기존 `useCustomerMergeSuggestion`(고객확인 모달)이 append된 고객 중복 자동 감지 (재사용)
4. **중복예약 확인** — 기존 기능 (재사용)
5. **로컬 정리**

## 구현 항목
### 서버
- (A) 마이그레이션 엔드포인트 — 전체 데이터(services/designers/customers/reservations) 수신. 빈 매장=생성 / 기존=remap 후 append. 트랜잭션.
- (B) 디자이너 병합 엔드포인트 — `POST /api/designers/merge` (source→target, 예약 재배정 후 source 삭제)

### 클라이언트
- (C) 진입 감지·분기 — 현 `_app.tsx` 마이그레이션 로직을 이걸로 확장
- (D) "기존 매장 데이터 병합/삭제" 확인 레이어
- (E) 디자이너 병합 레이어 (고객 병합 모달과 동일 톤)
- (F) 병합 완료 후 로컬 정리

## 재사용 / 신규
- 재사용: 고객 병합(`useCustomerMergeSuggestion`), 중복예약 확인
- 신규: 디자이너 병합(엔드포인트 + 레이어), 확인 레이어, 마이그레이션 엔드포인트

## 리스크 / 주의
- **ID 충돌**: 고객 PUT은 `storeId_legacyId` upsert. 게스트 로컬 ID(1,2,3…)가 기존 매장 ID와 충돌하면 덮어씀 → **서버 트랜잭션에서 remap 필수**.
- 부분 실패 → 트랜잭션 롤백.
- 기존 매장 데이터 보존 → append/upsert만, replace 금지.

## 권장 진행 순서 (단계별 검증)
1. 서버 마이그레이션 엔드포인트 (빈매장 전체이전 + 기존매장 append remap)
2. 확인 레이어 + `_app` 분기 연결
3. 디자이너 병합 (엔드포인트 + 레이어)
4. 로컬 정리 + 전체 흐름 검증

## 사전 확인
- 기존에 디자이너 병합 기능이 정말 없는지 확인 후 시작.

## 관련 코드 위치
- 마이그레이션: `client/pages/_app.tsx` (게스트→SNS 마이그레이션 effect)
- 온보딩 API: `server/api/onboarding.ts` (현재 setup 데이터만 수신, 409 가드)
- 고객 API: `server/api/customers.ts` (PUT = legacyId upsert)
- 예약 API: `server/api/reservations.ts` (POST = 단건 생성)
- 고객 병합: `client/hooks/useCustomerMergeSuggestion.ts`
- 로컬 DB: `client/features/local-db/storage.ts`
