# 읽기 과부하 대응 (집계 서버화 → ③ 페이징) — 설계 문서

> **상태: 보류(deferred). 스케일 신호 시 착수.** 현재 코드는 정상 동작 중 — 이 문서의 🔴/🔵/📜는 전부
> "페이징(B)을 하면 그때 깨진다"는 미래 위험이지, 지금 버그가 아니다.
>
> ⚠️ **라인번호는 2026-06-23 grep+코드검증 스냅샷.** 착수 전 반드시 재확인할 것 —
> 안정 앵커는 **함수명·파일경로**이고 라인번호는 코드 변경으로 어긋난다.
>
> 배경: 과부하·데이터 손실 감사(2026-06-23)의 마지막 🔴 항목. ①(PATCH 트랜잭션)·②(updateService 일괄 PUT)·
> naver-sync 트랜잭션·Slack biz/ops 분리는 완료·배포됨(git 히스토리).

## 배경 / 문제
- `reservations.ts` GET: 전체 예약 + 결제내역 + **전체 ReservationHistory**를 매 로드마다 통째 조회(날짜·페이징 없음).
- `customers.ts` GET: 전체 고객 + **전체 CustomerPointHistory** 통째 로드(같은 패턴).
- 매출/통계(`client/utils/revenue.ts`, `revenue-export.ts`)는 **전체 예약을 클라로 받아 JS로 합산** → 지금도 비효율, 페이징의 장애물.
- **서버측 무제한 로드 3개 더**(GET 2개 외):
  - `conflict-resolution.ts:11`(전체 `ConflictResolution` findMany→클라)·`customers-merge-history.ts:41`(전체 `CustomerMergeHistory`→클라): 무한증가지만 **저볼륨(충돌·병합은 드문 이벤트) → 후순위**.
  - `naver-booking-sync.ts:88`: 매 동기화 폴링마다 `reservation.findMany({naverBookingId:{not:null}})` **서버 풀스캔**(네이버예약 누적 → 무한증가). ⚠️ 클라 충돌탐지를 서버로 옮겨도 이 경로는 그대로 → 아래 🔴 ⓐ에서 함께 bound.
- 현재 규모(예약 66/이력 4/고객 63)는 작아 즉각 문제는 아니나 **무한 증가 구조**.

## 결정사항 (합의됨)
- **전파 의미론 = C (반영)**: 카탈로그(시술명/가격) 수정은 미래 예약에 반영한다. 단 현행 코드의 **안전규칙 유지**:
  - 결제완료 예약 → 보존 / 수동조정(가격·시간) 예약 → 보존 / **미래·active·미결제·카탈로그값 일치** 예약만 반영.
  - (이미 `buildServiceCatalogReservationUpdates`에 구현됨 — "안내한 가격이 멋대로 바뀌는" 사고 없음.)
- **C에선 읽기(페이징)와 쓰기(전파)가 결합**: 페이징하면 클라가 전체맵을 잃고, 서비스명 변경은 전체 미래예약에 영향 →
  화면 밖 예약을 클라가 못 고침 → **affected 계산을 서버로 옮겨야 함**. 따라서 1→2→3 결합 구조가 옳다.
- **스키마 변경 없음**: `Reservation @@index([storeId, date])` 기존재(schema:212) → 날짜범위 조회 인덱스 OK.

## 모드 분기 원칙 (횡단 — A·B 전체에 적용)
- **A·③ 모든 서버화 작업은 원격(remote) 전용**: A(집계 엔드포인트)·서버 발번·stored firstVisitDate·서버 by-id·페이징 자체 모두 **서버 전제**. (A는 ③ 아닌 "지금 할 것"이지만 동일 원칙 — 빠지면 **첫 착수분이라 제일 먼저 깨짐**.)
- **A 특히 주의**: `revenue.ts`/`RevenueSection`은 **fetch 0·순수 클라 계산**이고 settings는 local·remote 둘 다 진입(`settings.tsx:240`, 모드 게이팅 없음) → revenue를 `/api/revenue`로 **무조건 교체하면 local 매출 깨짐** → `if (shouldUseLocalDb()) { revenue.ts 클라 } else { /api/revenue }`.
- **local 모드(`shouldUseLocalDb`)는 bounded**(단일 사용자 전체 데이터가 메모리에) → 페이징/서버화 **미적용, 현행 클라 전체맵 로직 그대로 보존**(local엔 서버가 없어 서버 fix 적용 불가).
- → 각 fix는 `if (shouldUseLocalDb()) { 현행 클라 } else { 서버 }` **모드 분기로 구현**. 클라 로직을 서버로 그냥 "교체"하면 **local 깨짐**(발번·firstVisitDate·by-id·집계 전부).
- ⚠️ 현황: sync 계층(`storage`/`_app`/`mypage`/`calendarStore`/`calendarStoreHelpers`/`useCustomerMergeSuggestion`)은 분기하지만, **③-fix 대상 파일은 분기 0** (`useReservationCreateForm`·`CustomerAddModal`·`revenue.ts`) → 분기 신설 필요.

## A. 우선 착수분 — 집계 서버화 (즉시 이득·③ 선결조건. ⚠️ SQL groupBy 아님 + 매출 오표시 회귀 주의)
- ⚠️ **순수 SQL `groupBy` 불가** — 앱 로직 다층을 서버가 그대로 재현해야 함:
  - **모드(completed/booked) = 행 필터**(`isCompletedReservationTarget:104`/`isBookedReservationTarget:109`, status·결제·디자이너 기준) — *가격 출처가 아니라* "어느 예약을 포함하나".
  - **금액 = 2갈래(모드 무관)**: ① 매출 총액·일별·디자이너별 = `resolvePrice(service, price)` **직접**(= `price ?? sumPrice(parseServiceString(service))`, 문자열 파싱+카탈로그 폴백, `revenue.ts:94`). ② 결제수단별 breakdown = `resolvePaymentEntries:138`(paymentEntries 우선 → 없으면 `paymentMethod`+resolvePrice 폴백).
  - → 행필터 2종 + resolvePrice(문자열 파싱) + resolvePaymentEntries(별도테이블·결제수단)라 `SUM(price)` 불가.
  - ✅ **단순화 (서버 한정)**: `resolvePaymentEntries`의 `paymentMethod` 폴백 가지(`paymentCompleted && paymentMethod`)는 **죽은 코드** — `paymentMethod`는 DB 컬럼 없음(schema)·매퍼 미충전(`mappers.ts`, 서버발은 항상 undefined)인 **localStorage 레거시 필드**. A는 원격 전용이라 **paymentEntries 우선 → 없으면 resolvePrice** 만 재현(가지 무시). ※ 구현자가 DB에서 paymentMethod 찾다 헤매지 말 것.
- 따라서 A = **서버가 날짜범위 행을 읽어 동일 `resolvePrice`/paymentEntries 로직으로 집계**하는 엔드포인트(`GET /api/revenue?from&to&mode&designerId`).
  - ⚠️ **디자이너 차원 필수**: revenue.ts 전 함수가 `designerId`+`matchDesigner`로 필터(104/109/119)하고 디자이너별 합계(designerTotals)도 냄. UI도 디자이너 의존(RevenueFilters 필터 + 리스트/모달이 designerMap, RevenueChartGrid). → 엔드포인트가 `designerId` 필터를 받거나 **디자이너별 그룹 결과**를 반환해야 함. 빠지면 디자이너 필터 깨지거나 클라가 전량 받아 거름(= A 무력화).
  - 즉 A가 다룰 차원 = **날짜범위 × 모드(completed/booked) × 디자이너 × resolvePaymentEntries(행별)** — 단순 swap 아님.
  - `parseServiceString`/`sumPrice`는 이미 `features/services/model.ts`에 있어 **서버 import 가능**(B-1 불필요 — priceIsManual은 매출 미사용).
  - 🔴 **회귀 = 매출 오표시**: 서버 집계가 클라 로직과 어긋나면 숫자 틀림 → **같은 함수 재사용 + 실데이터로 클라 결과와 합계 일치 검증** 필수.
- `revenue.ts` + 소비 UI(`RevenueSection`·`RevenueDailyDetailModal`·`RevenueDailyList`·`RevenueReservationList`·`RevenueMetricModal`)를 집계 엔드포인트 결과로 전환.
- ⚠️ **`revenue-export.ts`는 A(집계) 아님 — 행단위 엑셀**: 기간 예약을 1건당 1행으로 덤프(`:67~`, `resolvePrice`+`formatPayment`+`customerMap[id]`), 합계 아님 → 집계 엔드포인트로 불가. **③-3 날짜범위 행 GET으로 처리**(export 기간이 달력 로드 윈도우보다 넓을 수 있어 페이징 후엔 서버서 그 기간 별도 fetch 필수).
- `PointManageSection`(전체 고객 포인트 합산, `Object.values(customerMap).reduce`)도 집계 엔드포인트 대상(고객 페이징 시 합계 틀림).
- ③의 **선결조건**(페이징 후 전체-읽기 화면이 빈 값 나는 것 방지).

## B. 본체 — ③ 페이징 (스케일 신호 시)
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
     (착수 시 `calcEndTime`/`sumDurationMinutes` 포함 "이미 model에 있는 것 vs 인라인" 인벤토리 먼저 확정.)
2. **updateService 서버화**: 요청은 `{originalName, updatedName}`만(목록 전송 제거, 클라 스냅샷 trust 안 함).
   서버: 후보(`storeId·active·미결제·date≥today`) 조회 → 1단계 로직으로 affected 판정·재계산 → **청크 트랜잭션** update + 이력 `createMany`. before는 DB 실값.
   클라: 반영 건수만 받고 보이는 범위 refetch(낙관적 전체 갱신 제거). ②의 `{updates}` 배치 분기를 이걸로 대체.
   - 🔴 **old 카탈로그 출처 모순 주의**: `priceIsManual`은 "예약 price == **OLD** 카탈로그 합" 비교라 old 값이 필요한데, `services.ts`가
     DB를 **NEW로 덮은 뒤** 전파가 돌면 DB엔 old가 없음 → "DB에서 old 읽기" 불가.
     → **카탈로그 저장 + 전파를 단일 엔드포인트/트랜잭션으로 통합**, NEW로 덮기 **전에** old를 읽어야 성립(별도 엔드포인트론 불가).
3. **GET 페이징 + 이력 lazy**: `reservations` GET에 날짜범위(from/to). 이력은 리스트 동반 금지, 상세 진입 시 on-demand.
   클라 달력: 보이는 주/월만 fetch + 범위이동 시 추가 fetch + 캐시. **전체 `reservationMap` 의존 제거**.
4. **고객 페이징 (별건)**: 고객은 날짜가 없어 날짜범위 불가 → **검색 + 이름+id 복합 커서**.
   - 검색은 서버 `name`/`tel` contains 필터(`@@index([storeId,name])`·`[storeId,tel]` 활용).
   - ⚠️ **커서는 `name` 단독 불가**(name unique 아님 → 동명이인 경계서 누락/중복) → `(name, id)` 복합 커서(id 보조정렬로 안정화). 인덱스도 `[storeId, name, id]`로 검토.
   - `CustomerPointHistory`도 lazy.

## 착수 전 전수조사 (2026-06-23 grep + 코드 검증 완료)
전체 `reservationMap`/`customerMap`을 읽는 지점 분류 — 🔴 깨짐(처리 필요) / 🔵 customerMap(B-4) / 🟡 조건부(윈도우 커버) / 🟢 안전. **보이는-범위 렌더만 안전, 집계·엔티티 전체이력·by-id 조회·전수 스캔은 페이징 시 깨짐.**

**🔴 페이징 시 깨짐 — 처리 필요:**
- **집계(→ A 집계 엔드포인트로 대체):** `utils/revenue.ts:227`, `RevenueSection:227/268`,
  revenue UI(`RevenueDailyDetailModal`/`RevenueDailyList`/`RevenueReservationList`/`RevenueMetricModal`), `PointManageSection:44`(`totalPoints` = 전체 고객 포인트 합산).
- **범위 행 덤프(엑셀, → ③-3 범위 GET):** `utils/revenue-export.ts:63`(`exportRevenueToExcel` = 기간 예약 행 덤프, 집계 아님 — A로 처리 불가).
- **엔티티 전체이력(→ 서버 by-id 조회 필요):**
  - `CustomerDetail.tsx:119/135`: 전체 예약을 `customer.id`로 필터 → 그 고객 **전체** 예약이력·노쇼수·포인트링크. 페이징 시 누락/오집계 → "예약 by customerId" 서버 조회로.
  - `pages/index.tsx:50`·`pages/settings.tsx:71` `resolveReservationsByIds`·`pages/mypage.tsx:75`·`PointManageSection:64→71`(포인트이력의 `relatedReservationId` 해소): `flat().find(id)` 동일 패턴(알림/이력/선택예약/포인트링크) → 윈도우 밖이면 못 찾음 → 서버 단건 조회. (by-id 인스턴스 4곳)
- **연 범위 데이터(→ 연 범위 fetch):** `Year.tsx:41`: 12개월 전부 필요 → 달 윈도우 페이징 시 로드된 달만 표시.
- **id 발번(🔴 확정 결함 — "위험"이 아니라 확정):** 일반 POST가 **클라 생성 id를 그대로 신뢰**(`reservations.ts:78` `legacyId: reservation.id`, `customers.ts:55` `legacyId: customer.id`, 서버 발번 없음). 클라는 전체맵 max+1로 id 생성(`useReservationCreateForm.ts:48`, `CustomerAddModal.tsx:48`) → 페이징(부분맵)이면 **이미 존재하는 id 재발급 → `@@unique([storeId,legacyId])` P2002 충돌 확정**.
  → 수정 저비용: 새로 만들 것 없이 **기존 서버 max+1 발번 재사용**(`migrate-local.ts:156~`, `naver-booking-sync.ts:132~`(max 조회 :80, 증분 :322))을 POST 핸들러(또는 공통 헬퍼)로 + 클라 발번 제거.
- **최초방문일(전체이력 파생 — 부분맵이면 틀린 값. ⚠️ 가장 광범위):** `getFirstVisitDateByCustomer`(reservations/model.ts:77)·`syncCustomerFirstVisitDates`(customers/model.ts:61): 전체 예약 순회로 고객별 최초 비취소 날짜 계산 후 customerMap에 기록. **`calendarStore`의 거의 모든 예약 변이(333/339/350/382/611/642/710/752/783, 9곳)에서 재계산** → 윈도우면 "로드분 중 최이른 날"을 최초방문으로 오인. → **스토어드 `Customer.firstVisitDate`(schema:99) 사용, 클라 재계산 제거**.
  - ⚠️ 현재 서버는 **클라가 보낸 값을 수동 저장만** 함(`customers.ts:46/121/132`, 병합만 `customers-merge.ts:120`에서 이른값 채택). 즉 "서버가 유지"는 **신규 로직**: 예약 생성 시 min 갱신 + **취소/삭제 시 그 고객 예약 재조회로 재계산**(완화는 by-customer 조회 동반). map 페이징과 직접 충돌하는 최대 난점.
- **전수 스캔 — 충돌/중복/병합 (집계 아님, `groupBy` 불가 → 별도 방침):**
  - 병합제안: `useCustomerMergeSuggestion.ts:49/62/102`, `CustomerMergeSuggestionModal.tsx:43`.
  - 네이버 동기화 충돌/중복: `useNaverBookingSync.ts:105/162/545/600`, `NaverSyncNotification.tsx:95/294`, `NaverSyncConflictModal.tsx:69`.
  - → **결정 필요(B 착수 전, 위 전수스캔 전체에 일괄 적용)**: ⓐ 탐지를 서버로 이관 vs ⓑ "로드된 윈도우 한정"으로 축소(기능 약화 감수). **하나만 고치면 나머지 구멍.**
    - ⚠️ ⓐ로 가도 **서버측 스캔 자체를 bound**해야 함: `naver-booking-sync.ts:88`의 매 폴링 `findMany({naverBookingId:{not:null}})` 풀스캔은 클라 이관과 별개로 무한증가 → 인덱스+범위/증분 조회로 제한.

**🔵 고객맵(`customerMap`) 소비처 — B-4(고객 페이징) 시 처리 (reservationMap과 별개로 누락되기 쉬움):**
- 고객 검색(→ 서버 검색): `HeaderSearchLayer.tsx:24`, `Footer.tsx:59` (`Object.values(customerMap).filter(name/tel)` — 로드분만 검색됨).
- 고객 드롭다운(→ 서버 조회/검색): `useReservationCreateForm.ts:45` (예약 생성 폼 고객 선택, 불완전 목록).
- 고객 id 생성(→ 서버 발번): `components/address/CustomerAddModal.tsx:48` (`Object.keys(customerMap)` — 예약 id생성과 같은 충돌 부류).
- 고객 리스트/정렬: `PointManageSection:33` (`Object.values(customerMap).sort` → 검색·totalPoints·상위포인트 목록의 기반).
- (집계/병합의 customerMap은 위 🔴에 이미 포함: `PointManageSection:44`(포인트 총합), `useCustomerMergeSuggestion:102/179`.)

**(제외 — 진짜 순수 헬퍼, 호출부가 결정):**
- `calendarStoreServiceHelpers.ts:143`(`buildServiceCatalogReservationUpdates` = B-2 본체).
- `local-db/storage.ts:221`(`flattenReservationMap` 범용 헬퍼) — 단 호출처 `calendarStoreHelpers.ts:174`가 **전체맵 스냅샷 소비**(로컬 동기/저장 경로) → 그쪽은 "로드 경로"에서 다룸.

**🟢 순수 렌더 — 진짜 안전(전체맵 순회 없음, `reservationMap[dateKey]`/`customerMap[id]` 인덱싱만):** `Month`/`Timeline`/`useTimelineDrag`/`ReservationCreate`(렌더).

(참고: `{...reservationMap}` 후 한 날짜만 수정하는 spread 머지 — `calendarStoreReservationHelpers:13/36/66`, `calendarStore:671/743/782` — 는 전부 "로드분만" 부류라 안전.)

**🟡 조건부 안전 — 전체스캔 있으나 윈도우가 커버(페이징 설계가 윈도우 맞춰주면 OK):**
- `ReservationDetail:113`: by-id 조회 + **전체맵 fallback**. 상세 여는 예약은 그 날짜가 로드 윈도우 안 → fast-path(`[date].find`) 성공 → fallback 미발동. (∴ "렌더만" 아님 — fallback 존재.)
- `ReservationListModal:87`: 한 달치 — 월단위 페이징이면 커버.
- `Header.tsx:124`: 충돌예약 클릭 시 `{...reservationMap, [date]:[...]}` 로드맵 머지로 1건 추가(로드분만) → calendarStore:890과 동류.
- `calendarStore:397`(고객삭제 로컬동기, 로드분만)·`:890`(알림 이름패치 best-effort).

**📜 이력(history) 소비처 — map과 별개 축(전수조사가 map만 봐서 누락됐던 부분). ③-3/4에서 이력 lazy 전환 시 깨짐:**
- reservationHistory(스토어 전체이력 → ③-3 **by-reservation 조회**): `pages/index.tsx:67`·`settings.tsx:93`·`mypage.tsx:73` (`useCalendarStore((s)=>s.reservationHistory)`).
- pointHistory(`customer.pointHistories` 렌더 → ③-4 **by-customer 조회**): `PointHistoryTab.tsx:27`, `CustomerDetail.tsx:134`(+352~386 모달), `CustomerDetailSections.tsx:84`, `AddressCustomerRecharge.tsx:48~50`.
  (※ `ReservationDetail.tsx:408~`은 pointHistory를 *생성*하는 쪽 — 소비처 아님.)

## 로드 경로 (③-3/③-4가 실제로 윈도우화할 지점)
위 전수조사는 맵을 **읽는** 소비처. 여기는 맵을 **적재**하는 근원 — 페이징은 이 사이트들을 윈도우/스코프 적재로 바꿔야 효과가 남.
- **초기 적재**: `_app.tsx:305/306`(로컬)·`364/372`(원격), `pages/index.tsx:89/90`, `pages/settings.tsx:231/232`, `pages/address.tsx:217`(고객).
- **변이 후 전체 refetch (놓치기 쉬움 — 페이징 후에도 그대로면 전량 재적재로 효과 무력화)**: `useNaverBookingSync.ts:669/675`(동기화 후), `useCustomerMergeSuggestion.ts:232/236`(병합 후), `CustomerDetail.tsx:181`(고객 전체 refetch).
- 패턴: `setReservationMap(groupByDate(전체))` / `setCustomerMap(toCustomerMap(전체))` → 날짜범위/검색 스코프 적재로 교체.

## 리스크 / 주의
- **검증 못 할 스케일 코드는 안 한 것보다 나쁠 수 있음** → 합성 대량시드 검증 필수.
- 회귀 위험 큼 → 1→2→3 단계적 배포(1단계는 동작 불변이라 안전).
- 운영 DB 스키마 변경 없음(date 인덱스 기존재).
