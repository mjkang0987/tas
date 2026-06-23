# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

# 읽기 과부하 대응 (집계 서버화 → ③ 페이징)

> 과부하·데이터 손실 감사(2026-06-23)의 마지막 🔴 항목. ①(PATCH 트랜잭션)·②(updateService 일괄 PUT)·
> naver-sync 트랜잭션·Slack biz/ops 분리는 완료·배포됨(git 히스토리).

## 배경 / 문제
- `reservations.ts` GET: 전체 예약 + 결제내역 + **전체 ReservationHistory**를 매 로드마다 통째 조회(날짜·페이징 없음).
- `customers.ts` GET: 전체 고객 + **전체 CustomerPointHistory** 통째 로드(같은 패턴).
- 매출/통계(`client/utils/revenue.ts`, `revenue-export.ts`)는 **전체 예약을 클라로 받아 JS로 합산** → 지금도 비효율, 페이징의 장애물.
- 현재 규모(예약 66/이력 4/고객 63)는 작아 즉각 문제는 아니나 **무한 증가 구조**.

## 결정사항 (합의됨)
- **전파 의미론 = C (반영)**: 카탈로그(시술명/가격) 수정은 미래 예약에 반영한다. 단 현행 코드의 **안전규칙 유지**:
  - 결제완료 예약 → 보존 / 수동조정(가격·시간) 예약 → 보존 / **미래·active·미결제·카탈로그값 일치** 예약만 반영.
  - (이미 `buildServiceCatalogReservationUpdates`에 구현됨 — "안내한 가격이 멋대로 바뀌는" 사고 없음.)
- **C에선 읽기(페이징)와 쓰기(전파)가 결합**: 페이징하면 클라가 전체맵을 잃고, 서비스명 변경은 전체 미래예약에 영향 →
  화면 밖 예약을 클라가 못 고침 → **affected 계산을 서버로 옮겨야 함**. 따라서 1→2→3 결합 구조가 옳다.
- **스키마 변경 없음**: `Reservation @@index([storeId, date])` 기존재(schema:212) → 날짜범위 조회 인덱스 OK.

## A. 지금 할 것 — 집계 서버화 (독립·회귀 적음·즉시 이득)
- `GET /api/revenue?from&to` 등 **SQL `groupBy` 집계 엔드포인트** 신설 → 클라는 합계만 수신.
- `revenue.ts`/`revenue-export.ts`의 "전체 예약 받아 JS 합산"을 이 엔드포인트로 교체.
- 페이징과 무관하게 지금도 이득이며, ③의 **선결조건**(페이징 후 전체-읽기 화면이 빈 값 나는 것 방지).

## B. 나중에 (스케일 신호 시) — ③ 본체
**착수 트리거 (하나라도 해당 시):**
- 미래 예약 **수백 건+** (②의 요청 1MB·단일 트랜잭션 statement 한계 근접)
- 전체 GET 응답/메모리 체감 — 특히 **ReservationHistory 누적**(수정마다 증가, 가장 먼저 부담)
- 달력 첫 로딩 체감 지연 / **멀티스토어 전환**
- 대략의 눈금: 예약·이력 **수천 건** 또는 첫 로딩이 눈에 띄게 느려질 때.

**단계 (각 단계 독립 배포·검증. ⚠️ 검증은 throwaway DB에 합성 대량시드 필수 — 스케일 코드를 스케일 없이 배포 금지):**
1. **공통 로직 추출 (무동작 변경, 선결)**: `parseServiceString`/`calcEndTime`/`sumPrice`·`sumDurationMinutes`/
   수동판정(`priceIsManual`·`durationIsManual`)/`LEGACY_NAME_MAP`을 `client/features/services/model.ts`로 단일화.
   서버 import 가능(이미 `server/db/mappers.ts`·`server/api/customers.ts`가 `client/features/*/model`을 import하는 기존 패턴). **복붙 금지**.
   - 현황: `parseServiceString`·`sumPrice` 등은 이미 `model.ts`에 있으나, **수동판정(`priceIsManual`·`durationIsManual`)은 `calendarStoreServiceHelpers.ts`의 `buildServiceCatalogReservationUpdates`에 인라인** → 이걸 `model.ts`로 빼는 게 1단계 핵심.
2. **updateService 서버화**: 요청은 `{originalName, updatedName}`만(목록 전송 제거). **old 카탈로그는 서버가 DB에서 읽음**(클라 스냅샷 trust 안 함).
   서버: 후보(`storeId·active·미결제·date≥today`) 조회 → 1단계 로직으로 affected 판정·재계산 → **청크 트랜잭션** update + 이력 `createMany`. before는 DB 실값.
   클라: 반영 건수만 받고 보이는 범위 refetch(낙관적 전체 갱신 제거). ②의 `{updates}` 배치 분기를 이걸로 대체.
   - ⚠️ **카탈로그 행 수정(`services.ts`)과 예약 전파의 원자성/순서 정의 필요** — 서버가 old를 DB에서 읽고 한 흐름으로 처리.
3. **GET 페이징 + 이력 lazy**: `reservations` GET에 날짜범위(from/to). 이력은 리스트 동반 금지, 상세 진입 시 on-demand.
   클라 달력: 보이는 주/월만 fetch + 범위이동 시 추가 fetch + 캐시. **전체 `reservationMap` 의존 제거**.
4. **고객 페이징 (별건)**: 고객은 날짜가 없어 날짜범위 불가 → **검색/이름 커서**(`@@index([storeId,name])`·`[storeId,tel]` 활용).
   `CustomerPointHistory`도 lazy.

## 착수 전 전수조사
- 전체 `reservationMap`/전체 고객을 읽는 화면을 grep으로 목록화(누락 시 페이징 후 빈 값).
  알려진 케이스: `revenue.ts`, `revenue-export.ts` → A(집계 엔드포인트)로 대체됨.

## 리스크 / 주의
- **검증 못 할 스케일 코드는 안 한 것보다 나쁠 수 있음** → 합성 대량시드 검증 필수.
- 회귀 위험 큼 → 1→2→3 단계적 배포(1단계는 동작 불변이라 안전).
- 운영 DB 스키마 변경 없음(date 인덱스 기존재).
