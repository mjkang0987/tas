# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

## 진행 중 — 예약/고객 추가 시 legacyId 충돌 방지 (네이버 동기화와 번호 경쟁)

> 증상(사용자): "네이버예약이 계속 중복", "고객 예약추가하는 쪽 수정에서 오류 발생".

### 근본 원인 (코드로 확정)
- 클라이언트는 예약·고객 번호(`legacyId`)를 **화면에 로드된 목록 기준**(`getNextNumericId`, `useReservationCreateForm.ts`)으로 매긴다.
- 그런데 서버의 **네이버 백그라운드 동기화**가 legacyId를 **독립적으로**(DB max+1) 올린다. 특히 공개예약마다 `reserve.ts:199`에서 `void syncNaverBookingsForStore(...)`로 fire-and-forget 실행되고, 시간별 폴링·타 세션도 있음. 클라가 그 사이 새로고침을 안 하면 번호가 겹친다.
- 충돌 결과:
  - **예약 POST**(`reservations.ts`) — `prisma.reservation.create`에 try/catch가 없어 `@@unique([storeId, legacyId])` 위반 시 **P2002 → 500**. 예약이 저장 안 되고 화면에만 떠 있다 새로고침하면 사라짐.
  - **고객 POST**(`customers.ts`) — `upsert`라 같은 번호의 **다른 고객(네이버가 만든 고객)을 조용히 덮어씀** → 데이터 섞임/중복처럼 보임.
- 네이버가 예약번호(`naverBookingId`)로 dedup + `@@unique([storeId, naverBookingId])`(0001부터 존재)라, **같은 예약번호의 진짜 중복은 불가**. 위 번호 경쟁이 "중복/오류"의 실제 경로.

### 수정
- `server/api/reservations.ts`: POST가 client legacyId로 create하다 P2002면 서버가 빈 번호(`allocateReservationLegacyId`, null-safe max+1)를 다시 매겨 재시도 → 500 없이 반드시 저장.
- `server/api/customers.ts`: 단건 POST가 그 번호를 **다른 고객**(이름 불일치)이 쓰고 있으면 덮어쓰지 않고 빈 번호를 새로 매겨 생성, **실제 부여 번호를 응답**. 같은 이름이면 멱등 저장(중복 클릭 방어). null-safe `allocateCustomerLegacyId`.
- 클라 배선: `persistNewCustomer`→`addCustomer`가 **서버가 부여한 실제 id를 반환**, 충돌 시 로컬 맵도 그 번호로 이동. `useReservationCreateForm.handleSave`가 반환된 id로 예약을 걸어 'Customer not found' 방지.

### 검증
- 타입체크 통과. 프로덕션 빌드로 확인. (런타임 DB 검증은 별도 — 로컬 DB 필요)

### 남음(후속 검토)
- 네이버 동기화 자체가 예약마다 고객을 **무조건 새로 생성**(`naver-booking-sync.ts`, 이름/연락처 dedup 없음)하는 점 → 같은 손님 반복 예약 시 고객 누적. 별도 이슈로.
- #101 회귀(추천 클릭 안 하고 이름 직접 입력 시 신규 고객으로 처리)로 인한 고객 중복 → 동명이인 처리 방침 확정 후 별도 수정.

---

## 진행 중 — 서비스 소요시간 분→시간+분 표기 (#126)

> book/[slug], r/[token]의 시술 소요시간 `N분`을 기존 `formatDuration`으로 `1시간30분` 형식 노출(칩·요약·합계).

---

## 완료 — 예약 조회/변경/취소 버튼 디자인 가이드 정렬 (#124)

> 관리 페이지 버튼을 가이드/StyledActionButton에 맞춤: radius 8(--radius-lg), weight 600/500, 1px 토큰 보더, shadow-sm, 취소는 danger-outline. 공용 페이지라 높이 48px 유지.

---

## 완료 — 확정 대기 예약도 취소 요청 가능 (#122)

> 버그: requested(확정 전) 예약은 취소 요청을 못 보내 매장에 취소요청이 안 옴.

### 수정
- `request-cancel`: active뿐 아니라 requested도 허용.
- `[token]` GET에 `canCancel = active||requested` 추가(변경 canRequest는 active 유지).
- 관리 페이지: requested면 안내 + 취소 요청 버튼. active면 변경·취소 둘 다.

---

## 완료 — 온라인 예약 알림(헤더 벨) 상시 노출 (#120)

> 요청: 헤더 온라인 예약 알림 아이콘(예약 신청 벨)이 대기 0건이면 숨겨져 사라진 것처럼 보임 → 온라인 예약 쓰는 매장은 상시 노출(원복).

### 수정
- `BookingRequestNotification` 노출 조건 `requests.length===0 → null`을 `!useOnlineBooking → null`로 변경. 온라인 쓰는 매장은 0건이어도 아이콘 유지(뱃지는 count>0). 클릭→상세는 #119.

---

## 완료 — 온라인 예약 상세 진입·확정대기 배지·채널 표시 (#118)

> 3건: (1) 예약 요청 벨 항목 클릭→상세 레이어(미래 날짜는 캘린더 미노출→벨로 접근), (2) 확정대기 배지, (3) 온라인예약이 전화예약으로 뜨는 버그.

### 수정
- `ReservationViewSection`: 예약경로 하드코딩(현장방문?:전화예약) → 실제 `reservation.channel`. requested면 "확정대기" 배지(스타일 기존 존재).
- `BookingRequestNotification`: 항목 본문 클릭 → legacyId로 reservationMap에서 찾아 `openReservationDetail` + 패널 닫기.
- `TimelineReservationCard`: "(신청)"→"(확정대기)".

---

## 완료 — 요청사항 textarea 세로 정렬 (#116)

> 버그: 메모 textarea 세로 정렬 틀어짐. 원인: formControlStyle의 height:32px(input용)가 textarea에 먹음.

### 수정
- `StyledTextArea`에 display:block, height:auto, min-height:76px, vertical-align:top로 고정 높이 덮음.

---

## 완료 — 관리자 예약 상세 '예약확정' (#114)

> 배치 6: 온라인 예약(requested)을 예약 상세 레이어에서 확정/거절.

### 구현
- `POST /api/book-requests`가 `legacyId`로도 대상 지정(기존 cuid `id` 유지). update where를 `reservation.id`로 고정.
- `ReservationDetailFooterActions` view 모드: `isRequested`면 예약확정/거절만 노출.
- `ReservationDetail`: `status==='requested'` 판정 + decideBooking(approve/reject by legacyId) → 성공 시 reload(벨과 동일). 거절은 confirm.

### 검증
- 타입체크·빌드.

### 배치 완료
- 1·3·4·5(#110/#111 ✅), 2·3(#112/#113 ✅), 6(#114 진행).

---

## 완료 — 예약 변경 UI 픽커화 + 조회/변경/취소 디자인 정렬 (#112)

> 배치 2·3: `/r/[token]` 변경 폼을 예약 화면과 동일한 픽커 UI로, 디자인 가이드(토큰) 정렬.

### 구현
- 변경 폼: 세로 서비스카드·담당자 셀렉트·네이티브 date·슬롯그리드 → `BookingPickers`(PillChip 담당자 가로줄·DateCell 날짜 스트립·ServiceChoiceChip·SlotGrid/SlotCell). 담당자 offDays로 날짜 비활성 + 휴무 badge, 담당자 선택 시 근무 첫 날짜 이동. openChange에서 현재 예약 날짜 기본 선택.
- 디자인: 하드코딩(#f4f6f8·`--accent-soft`(미정의)·16px·100vh) → 토큰. 페이지 화이트, 카드 box-sizing:border-box·--radius-lg·100dvh. 구식 styled 8개 제거.
- BookStoreInfo에 businessHours·closedDates·담당자 offDays 타입 추가(엔드포인트 기존 반환).

### 검증
- 타입체크·빌드.

### 남은 배치
- C: 관리자 예약 상세 '예약확정'(6).

---

## 완료 — 신규예약 개선: 전화번호 안내·메모·라우팅·스크롤 (#110)

> 배치 요청 1·3·4·5 중 book 신규예약/랜딩 파트.

### 구현
- 1) 연락처 placeholder `01012345678` + "하이픈 없이" 안내(StyledFieldHint), 자동 하이픈 포맷 제거(신규·조회). formatTel import 제거.
- 4) 신규 예약 메모(textarea, 200자). reserve API memo 저장 + Slack 알림 '요청사항' 포함.
- 5) 뷰(home/new/lookup)를 URL 쿼리 `?m=`와 동기화(shallow) → 새로고침 유지. goView 헬퍼.
- 3-a) 랜딩 세로 스크롤: 모바일 `100vh`→`100dvh`(주소창 높이).

### 검증
- 타입체크·빌드.

### 남은 배치(별도)
- B: `/r/[token]` 변경 UI 픽커화 + 디자인 가이드 정렬(2·3). C: 관리자 예약 상세 '예약확정'(6).

---

## 완료 — 디자이너 휴무 요일 날짜 비활성 (#108)

> 버그: 특정 디자이너 선택해도 그 디자이너 휴무 요일 날짜가 활성. 원인: info가 담당자 주간 스케줄 미노출 + 반대로 '휴무면 상관없음으로 되돌리기' effect 존재.

### 수정
- info 응답 담당자에 `offDays:number[]`(disabled 요일) 추가(server `[slug].ts`).
- 날짜 스트립: 선택 담당자 `offDays` 요일 비활성(매장 휴무와 함께).
- 담당자 선택 시 현재 날짜가 휴무면 근무 첫 날짜로 이동. '상관없음 되돌리기' effect 제거.

### 검증
- 타입체크·빌드.

---

## 완료 — 예약 랜딩 + 이름·연락처 예약 조회 (#106)

> 요청: 첫 진입을 예약 폼이 아니라 "예약 서비스" 랜딩으로 → [신규 예약] / [예약 조회·변경·취소]. (#104 답변서 확인된 셀프 조회 갭 해소)

### 구현
- `/book/[slug]` 뷰 상태(`home|new|lookup`, 기본 home). 랜딩 = 매장명+"예약 서비스"+두 갈래 버튼. new=기존 폼(뒤로 버튼 추가), lookup=이름·연락처 조회.
- 조회 API `POST /api/book/[slug]/lookup {name,tel}` → 이름+연락처 일치 고객의 오늘 이후 requested/active 예약을 token 포함해 반환 → 기존 `/r/[token]` 관리 페이지로 연결.
- 개인정보: 이름+연락처 둘 다 요구(번호 단독 열람 차단), 미존재/불일치는 빈 목록.
- 스키마 변경 없음(기존 Customer/Reservation 사용) → 배포 코드-온리.

### 검증
- 타입체크·빌드 통과, `/api/book/[slug]/lookup` 라우트 등록 확인.

---

## 완료 — 공개 예약 하단 sticky 예약 내용 요약 (#104)

> 요청: (1) 최하단 여백 부족, (2) 담당자·날짜 선택이 스크롤 시 안 보임→sticky, (3) '합계'→'예약 내용'으로 바꾸고 예약 내역 상세히.

### 구현
- 하단 **sticky '예약 내용' 요약 바**(`StyledStickyFooter`, `position:sticky;bottom:0`, 카드 폭 풀블리드 negative margin, 상단 경계+그림자)로 2·3 통합. 담당자·날짜·시간(시작~종료)·시술(항목별 분·가격)·합계 표시, 선택 진행에 따라 채움.
- `env(safe-area-inset-bottom)` + 하단 여백으로 1 해결. '합계' 라벨은 요약 카드 내부 합계 행으로.
- `addMinutes`로 종료시각 계산. 예약자 정보(이름·연락처)는 플로우 유지, 예약하기 버튼은 sticky 바에.

### 검증
- 타입체크·빌드. 모바일에서 sticky·여백·상세 확인.

---

## 완료 — 공개 예약 페이지 모바일/디자인 수정 (#102)

> 요청(스크린샷): (1) 모바일 가로 스크롤, (2) 뒤 회색 배경 잘림, (3) 요일 스트립 scroll-snap, (4) 온보딩 스텝 디자인 톤 정렬(페이지 배경 화이트 포함).

### 원인·구현
- 1·2번 원인: `StyledCard`가 `width:100%`+좌우 `padding` + `box-sizing` 없음 → 모바일(`max-width:none`)서 카드 폭=뷰포트+48px. → `box-sizing:border-box` 추가로 해결(회색 잘림도 같이).
- 3번: `PickerScrollRow` `scroll-snap-type:x proximity`, `DateCell`/`PillChip` `scroll-snap-align:start`.
- 4번: 페이지 배경 `#f4f6f8`→화이트, 카드 라운드 16px→`--radius-lg`, 여백 32/28·모바일 24/18, gap 16, 섹션 타이틀 12px→14px/700 black. 내부 회색 fill은 `--gray-color2` 토큰화.

### 검증
- 타입체크·빌드. 모바일 폭 가로 스크롤 없음.

---

## 완료 — 예약 추가 고객 입력 UX (#100)

> 요청: (1) 고객 추천 목록에 전화번호가 안 보임(색이 너무 옅음) → 동명이인 구분 불가. (2) 기존/신규 탭 없이 연락처 란 상시 노출 — 기존 선택 시 이름·연락처 자동 채움, 새 이름 입력 시 연락처 수동.

### 구현
- `CustomerAutocomplete.tsx`: 추천 번호 색 `--gray-color`→`--dark-gray-color2`, 12px·tabular-nums로 또렷하게. 이름 weight 500.
- `useReservationCreateForm.ts`: `customerMode`/`newCustomerName`/`newCustomerTel` 제거, 단일 `customerTel`. 이름=`customerQuery`. 기존선택=`customerId≠0`(연락처 자동 채움), 새이름=`customerId=0`(이름 재입력 시 선택 해제+연락처 비움). validate/handleSave 단일 경로(신규만 번호 형식 검사).
- `ReservationCreateCustomerFields.tsx`: 탭 제거, 고객명(자동완성)+연락처(상시) 2필드.
- `ReservationCreate.tsx`: props 배선 갱신.

### 검증
- 타입체크·lint 통과. 프로덕션 빌드로 확인.

---

## 완료 — 고객 전화번호 중복 경고 + 병합 유도 (#98)

> 배경: 고객 정보 레이어에서 이름·전화번호 수정 시, 같은 매장 내 다른 고객이 이미 그 번호를 써도 무검증 저장 → 동일 번호 고객이 조용히 중복. 서버 PUT은 legacyId 단건 저장뿐이고 `(storeId, tel)`은 인덱스(비-unique). 기존 병합 제안은 마스킹 이름만 감지.

### 방침
- **하드 차단(unique 제약) 안 함** — 가족 공유번호 정상 케이스 보호.
- 저장 시점 **경고 + 병합 유도**. 이름 중복은 무검증(동명이인).

### 구현
- `CustomerDetail.tsx`: `handleSaveEdit`에서 `customerMap` 스캔(`normalizeTel` 비교, 자기 자신 제외). 겹치면 `dupWarning` 상태 세팅 → 인라인 경고(같은 분=병합 / 다른 분=그대로 저장 / 취소). `commitEdit`로 실제 저장 분리.
- 병합: 기존 `POST /api/customers/merge` 재사용. target=기존 번호 보유 고객, source=편집 고객. 성공 시 `/api/customers`·`/api/reservations` 리로드 후 레이어 닫기. 실패는 toast로 표면화(조용히 삼키지 않음).
- `CustomerDetail.styles.ts`: 경고 배너·버튼 styled 추가(디자인 토큰 사용, 태그 셀렉터 금지).

### 검증
- 타입체크·빌드. 동일 번호 수정 시 경고 노출 + 3동작 확인.

---

## 완료 — 예약 페이지 UI 영화관(CGV)식 개편 + 시술↔시간 양방향 필터

> 배경: 기존 공개 예약 페이지가 "예약 가능한 시간만" 듬성듬성 버튼으로 떠 불편. CGV 예매 UI처럼 재구성 요청.

### 레이아웃 (위→아래)
- **디자이너(담당자) 선택**: 가로 스크롤 칩. `allowAssigneeChoice` 꺼지면 숨김. 그날 휴무 담당자는 **노출하되 비활성**.
- **날짜 선택**: 가로 스크롤 스트립(오늘~maxAdvanceDays). 휴무일·영업요일 아님 → 비활성.
- **시술 선택**: inline 칩(wrap).
- **예약 가능한 시간**: 하단 그리드. 하루 전체 슬롯을 좌석처럼 깔고 마감/불가는 비활성(취소선).

### 양방향 필터 (핵심)
- 서버가 슬롯별 **최대 연속 가용분(maxDurationMin)** 만 내려줌(예약 상세·고객정보 비노출) → 클라가 즉시 계산.
- 시술 선택 시 → 총소요 ≤ maxDuration 인 시간만 활성 / 시간 선택 시 → 그 시각에 담기는 시술만 활성. 나머지 비활성.

### 구현 파일
- `client/features/booking/availability.ts`: `isBlockAvailable` 추출, `computeSlotCapacities`(경계 스캔·단조성 이용), `assigneeWorksOnDay` 추가. (브루트포스 대조 검증 완료)
- `server/api/book/[slug]/day.ts` (+ `client/pages/api/book/[slug]/day.ts` 래퍼): 날짜(+담당자) 용량표·담당자 근무여부 반환.
- `server/api/book/[slug].ts`: 공개 info에 `businessHours`·`closedDates` 이미 포함(클라 날짜 비활성 판정에 사용).
- `client/pages/book/[slug].tsx`: 전면 재구성.

---

## 완료 — 배포순서 장애 재발방지 (예약 조회 select 하드닝)

> 배경: PR #80(온라인예약 1b·1c) 머지 후 마이그레이션 0009(`Reservation.publicToken`) 미적용 상태로 자동 배포 → 메인 캘린더/예약 API가 500(앱 전체 다운). 원인: 예약 조회가 Prisma `include`(모델 전체 컬럼 SELECT)라, DB에 없는 새 컬럼(`publicToken`)까지 SELECT하다 "column does not exist"로 실패.

### 구현
- `server/db/prisma-includes.ts`: `reservationInclude`/`reservationIncludeWithNames`(include) → **명시적 `select`** `reservationSelect`/`reservationSelectWithNames`로 교체. 프런트 매퍼가 실제 쓰는 컬럼만 나열(신규 컬럼은 이 목록에 넣기 전까지 미조회 → 배포가 마이그레이션 순서에 독립).
- 호출부 전부 `include:` → `select:` 전환: `reservations.ts`(6곳), `naver-booking-sync.ts`(2곳), **`page-data/index.ts`(메인 캘린더 SSR — 실제 장애 쿼리)**.
- 검증: 타입체크가 select 완전성 보증(매퍼/호출부가 쓰는 필드 누락 시 컴파일 에러), build 통과. 배포는 컬럼을 늘리지 않고 줄이기만 하므로 마이그레이션 상태와 무관하게 안전.

### 남은 권장(후속)
- 네이버 동기화·백필·마이그레이션 경로의 `create`/`update`(암묵적 전체 컬럼 RETURNING)는 앱 전체 다운은 아니나 동일 위험 존재 → 필요 시 select 명시. 신규 마이그레이션(예: 0010)은 여전히 "**적용 먼저, 배포 나중**" 원칙 유지.

---

## 계획 중 — 고객 공개 예약 시스템 (Online Booking)

> 결정(사용자): **셀프 예약 생성 + 고객 변경/취소 요청**, **인증 없이 이름+연락처**, **담당자 선택(+무관)**, **알림·취소까지** 풀 범위.
> 배경: 현재 예약은 네이버예약(Gmail 동기화)·수기 입력만. 고객 접근 화면 전무. 자체 공개 부킹 페이지를 신설(네이버와 별개 채널 `online`).

### 핵심 설계 원칙
- **공개(비로그인) 엔드포인트 신설**: 기존 API는 전부 로그인/역할 검증. 공개 API(`/api/book/*`)는 매장 스코프 + 최소 노출 + 레이트리밋 + 슬롯 재검증(트랜잭션 overlap 체크)로 방어.
- **데이터 최소 노출**: 공개 API는 매장명·업종라벨·예약가능 서비스(이름/소요/가격)·담당자(이름/색상)·영업시간·휴무일만. 다른 고객 정보·예약 내역 절대 비노출.
- **고객 예약 관리는 per-예약 토큰**: 인증이 없으므로 예약 생성 시 `publicToken`(추측 불가 랜덤) 발급 → 확인/변경/취소 링크 `/(book)/r/[token]`로만 접근.

### URL / 진입 — 서브도메인 (확정)
- **고객 공개 도메인: `book.takeaseat.co.kr/[slug]`** (매장별 `bookingSlug`가 서브도메인 루트 바로 아래). 예약 확인: `book.takeaseat.co.kr/[slug]/r/[token]`.
- 운영자 도메인 `takeaseat.co.kr`는 그대로. 하나의 Next.js 앱이 두 호스트를 서빙(hostname 분기).
- **내부 라우트는 `pages/book/[slug].tsx`·`pages/book/[slug]/r/[token].tsx`**로 두고, 미들웨어가 `book.` 호스트의 루트 경로(`/[slug]`)를 내부 `/book/[slug]`로 rewrite. (내부 구조 깔끔 유지 + 공개 URL엔 `/book` 안 보임.)
- 오너 설정: `/settings/booking` 탭 (온라인예약 토글 + slug + 예약규칙 + 노출 서비스/담당자). 쿠폰/회원권 토글 패턴 미러링.

### 서브도메인 라우팅·격리 (Phase 1에서 배선)
- `proxy.ts` **최상단**(auth() 밖, 점검모드 게이트처럼)에서 hostname 판정:
  - `host === book 서브도메인` → **공개 구역**: 인증/약관/온보딩 게이트 전부 우회. `/[slug]*` → `/book/[slug]*`로 rewrite. 운영자 전용 경로 접근은 404/차단.
  - `host === 메인` → 기존대로. `/book/*` 직접 접근은 차단(또는 서브도메인으로 안내).
- `_app.tsx` 게스트 라우팅·`LayoutComponent` 앱 셸: 부킹 페이지는 `isBarePage`처럼 셸 없이 렌더 + 게스트 리다이렉트 예외.
- **쿠키 격리 확인**: NextAuth 세션 쿠키가 host-only(도메인 `.takeaseat.co.kr` 와일드카드 아님)여야 `book.` 서브도메인에 세션이 안 샌다. 배선 시 검증.
- **인프라(사용자 직접, GCP/DNS)**: `book` CNAME → Cloud Run, Cloud Run 도메인 매핑(+관리형 SSL). 앱은 부킹 호스트를 `NEXT_PUBLIC_BOOKING_HOST` 등 env로 인지. (코드는 내가, 인프라 세팅은 사용자.)

### DB 변경 (Prisma 마이그레이션)
1. `ReservationChannel` enum에 `online` 추가.
2. `Store`: `useOnlineBooking Boolean @default(false)`, `bookingSlug String? @unique`.
3. 예약 규칙: `StoreBookingSettings`(신규) 또는 Store 컬럼 — `slotIntervalMin`(예: 30), `minLeadMinutes`(최소 사전예약 시간), `maxAdvanceDays`(최대 며칠 후까지), `bookableServiceIds?`/`bookableAssigneeIds?`(미지정=전체 노출). → 신규 모델로 분리 예정.
4. `Reservation`: `publicToken String? @unique`(고객 관리 링크), 고객 변경/취소 요청 표현 필드(아래 "변경/취소" 결정에 따름).

### 단계(Phase) — 각 단계별로 빌드·검증·PR·머지
- **Phase 0 — 스키마·오너 설정 기반 ✅ 완료**:
  - (0a) 마이그레이션 `0008_online_booking`(online 채널·`useOnlineBooking`·`bookingSlug`·`StoreBookingSettings`), 채널 매퍼(`online`↔`온라인예약`), `/api/store` GET/PATCH 확장(토글·슬러그 검증+중복409·규칙).
  - (0b) 매장 관리 '고객 예약 서비스 사용' 토글 + 전역 스토어 `useOnlineBooking` 배선 + aside '고객 예약 설정'(토글 ON시) + `/settings/booking` 탭(`BookingManageSection`: 슬러그·URL 미리보기·예약 규칙 저장).
  - 남은 것: 온라인예약 매출 채널 색/순서(Phase 1에서), 실제 공개 페이지(Phase 1).
- **인프라 ✅ 완료**: `book.takeaseat.co.kr` 서브도메인 연결. Cloudflare에 `book` CNAME(→`tas-ses3gted5a-du.a.run.app`, 🟠주황/프록시, apex 복제) 추가 → 기존 `*.takeaseat.co.kr` Cloudflare Worker Route 경유 → Cloud Run 앱까지 200 확인. (도메인 매핑/회색 CNAME 불필요.)
- **Phase 1 — 공개 부킹 페이지(셀프 예약 생성)** — 세부 단계로 분할:
  - **1a ✅ 완료(마이그레이션 없음)**: 공개 구역 카빙 + 매장 공개정보 API + 페이지 스캐폴드.
    - `proxy.ts`(`/book/` isExempt), `_app.tsx`(게스트 리다이렉트·부팅 오버레이 예외), `LayoutComponent`(`/book/`=isBarePage) — 비로그인 공개.
    - `GET /api/book/[slug]`(server/api/book/[slug].ts + pages 재export): 온라인예약 ON 매장만, 매장명·서비스·담당자(허용 시)·영업시간·휴무일·규칙·안내문 **최소 노출**(고객/예약정보 절대 미노출).
    - `pages/book/[slug].tsx`: 매장명·안내문·서비스 다중선택·담당자(+상관없음) 선택. 슬롯/예약은 1b에서.
  - **1b ✅ 완료(마이그레이션 0009 필요)**: 슬롯 계산 + 예약 생성.
    - **마이그레이션 0009**: `Reservation.publicToken String? @unique`(고객 관리 링크) + `StoreBookingSettings.bookableServiceIdsJson Json?`(1c에서 배선할 노출 서비스 화이트리스트 컬럼 — 0009에 미리 포함, 배선은 1c). 둘 다 `IF NOT EXISTS` 멱등.
    - **슬롯 계산 유틸**(`client/features/booking/availability.ts`, 순수·서버 재사용): 영업시간 − 기존 active 예약(네이버 포함) − 담당자 스케줄 − 서비스 총소요 − 최소 사전시간(now+minLead), slotInterval 간격. 담당자 용량 모델(근무·미배정 담당자 수 > 미배정 예약 부하일 때 가용). 담당자 0명 매장은 단일 자원(1)으로 취급.
    - **`GET /api/book/[slug]/availability`**(`?date&services&assignee`): 날짜 유효성(과거·maxAdvanceDays·휴무일·영업요일) 검증 후 가용 슬롯 배열 반환. KST 기준 today/now 계산.
    - **`POST /api/book/[slug]/reserve`**(`{date,startTime,services[],assigneeId?,name,tel}`): 서버 권위 재검증(트랜잭션 Serializable + 슬롯 재계산 겹침 체크) → customer upsert(정규화 tel로 findFirst, 없으면 legacyId 부여 생성) → 예약 생성(channel=`online`, status=`active`, legacyId 부여, `publicToken` 랜덤). legacyId/token 충돌(P2002) 재시도. Slack 알림. 응답에 `publicToken`.
    - **공개 페이지**(`pages/book/[slug].tsx`): 서비스·담당자 선택 아래에 날짜(native date, min=오늘/max=+maxAdvanceDays)·슬롯 버튼·고객 이름/연락처 폼·예약 확정 → 완료 시 확인 링크(`/book/[slug]/r/[token]`) 안내(페이지 본체는 1d).
  - **1c ✅ 완료(마이그레이션 없음 — 컬럼은 0009에 포함)**: 노출 서비스 선택(오너).
    - `BookingSettings.bookableServiceNames`(서비스명 화이트리스트, null/[]=전체 노출) + 순수 헬퍼 `parseBookableServiceNames`/`areServicesBookable`(model.ts).
    - `/api/store` GET/PATCH: `bookableServiceNames` 왕복(DB 컬럼 `bookableServiceIdsJson` 매핑). `BookingManageSection`에 '노출 서비스' 체크박스(전체 선택=null 저장, 미선택 시 전체 노출 안내).
    - 공개 API: `GET /api/book/[slug]`가 화이트리스트로 서비스 목록 필터(고객 응답엔 화이트리스트 미노출), `availability`·`reserve`가 화이트리스트 밖 서비스 요청은 400 `not_bookable`로 거부.
  - **1d**: 고객 확인·변경·취소(오너 승인형) — Phase 2 내용.
  - **1e**: host 분기 — `book.takeaseat.co.kr/[slug]`(루트) → 내부 `/book/[slug]` rewrite. **단 Cloudflare Worker가 Host를 유지하는지 확인 필요**(현재 앱이 `book.` 호스트를 보는지). Worker 코드 확인 후 설계.
  - **1f**: 알림(Slack) — Phase 3 내용.
  - 슬롯 계산 유틸: 영업시간 − 기존 예약(네이버 포함) − 담당자 스케줄 − 서비스 소요 − 최소 사전시간, slotInterval 간격, maxAdvanceDays 범위.
- **Phase 2 — 고객 확인·변경·취소 (오너 승인형 요청)**:
  - `/book/[slug]/r/[token]`: 예약 상태 표시 + **취소 요청** + **변경 요청**(다른 슬롯 재선택). 고객은 "요청"만 하고 즉시 반영되지 않음.
  - 요청 저장: 예약에 대기 요청 표현(신설 `ReservationRequest` 모델 또는 Reservation 필드 `pendingAction`(none/cancel/change)+`pendingPayload`(JSON: 요청 날짜/시간/담당자)+`pendingRequestedAt`). 구현 시 확정.
  - 오너 승인 UI: 오너 앱에서 대기 요청을 보고 수락/거절. 네이버 알림 벨 패턴 또는 예약 상세/캘린더 배지로 노출. 수락 시 예약 반영(취소=cancelled, 변경=슬롯 갱신), 거절 시 요청 폐기.
  - 공개 API: `GET /api/book/reservation/[token]`, `POST .../request-cancel`, `POST .../request-change`. 오너 승인 API는 로그인/역할 검증(기존 패턴).
- **Phase 3 — 알림**:
  - 매장(오너) 측: 신규 온라인예약·변경/취소 **요청** 발생 시 Slack(`notifySlackForStore`) 재사용 + 오너 앱 내 알림/대기 목록(네이버 알림 벨 패턴 참고).
  - 고객 측: **문자/이메일 발송 없음(확정)**. 앱에 SMS/이메일 인프라 부재. 고객은 예약 후 받은 **확인 링크**(`/book/[slug]/r/[token]`)를 다시 열어 상태·승인 결과를 확인. 실제 문자/알림톡은 향후 공급사 연동 시 별도 추가.

### 확정된 결정
1. 공개 URL: **`book.takeaseat.co.kr/[영문매장명]`** (서브도메인 + slug=영문 매장명). 내부 라우트는 `/book/[slug]`, 1e에서 서브도메인 루트를 rewrite.
2. 영문 매장명(slug): **필수**(온라인예약 ON 시), 오너 설정에서 지정 + **중복 확인 버튼**(실시간 아님) + 저장 시 unique 409.
3. 서비스: **노출할 서비스만 선택**해서 공개(1c).
4. 담당자: 고객 선택(+상관없음), `allowAssigneeChoice` OFF면 매장 배정.
5. 변경/취소: **오너 승인형 요청** (고객은 요청만, 오너가 앱에서 수락/거절).
6. 고객 알림: **확인 링크만** (문자/이메일 없음).

### 리스크/주의
- **보안**: 공개 엔드포인트 abuse(스팸 예약). 레이트리밋(IP+매장), 슬롯 재검증, 하루 예약 상한 등 필요.
- **동시성**: 같은 슬롯 동시 예약 → 트랜잭션 + `[storeId, assigneeId, date, startTime]` 겹침 검증으로 방지.
- **고객 알림 한계**: SMS/이메일 없음(위). 사용자에게 명확히 고지하고 진행.
- **네이버예약과 병존**: 같은 시간대 겹침은 매장이 최종 관리. 온라인 슬롯 계산 시 네이버 예약도 점유로 반영.

---

## 완료 — 온보딩 업종 선택 화면 레이아웃 틀어짐 수정

> 증상(사용자): 온보딩 업종 선택 부분이 틀어짐. `body{height:100%}` 관련 의심.

### 원인
- 온보딩은 `isBarePage`라 `LayoutComponent`가 `<>{children}</>`로 렌더 → `StyledPage`가 `#__next`(`display:flex; flex-direction:column; height:100%`)의 직접 flex 자식.
- 내용(업종 그리드)이 뷰포트보다 길면 기본 `flex-shrink:1`이 `StyledPage`를 뷰포트 높이로 압축 → `StyledCard`(`min-height:480px`)까지 눌려 내부 요소가 겹치고, `justify-content:center`가 위쪽을 잘라 "틀어짐".

### 구현
- `client/pages/onboarding/index.tsx`의 `StyledPage`에 `flex-shrink: 0` 추가. 전역 `body/#__next` 높이는 달력 앱(고정 높이+내부 스크롤)이 의존하므로 건드리지 않음.

### 검증
- Playwright 실측(뷰포트 460px): 수정 전 카드 633→480px 압축(FAIL) → 수정 후 633px 유지·스크롤 정상(PASS). `next build` 통과.

---

## 진행 중 — `h3` 태그를 `strong`으로 교체

> 배경(사용자 요청): `h3`가 사용된 곳의 태그를 `strong`으로 바꾼다. 범위는 전부(일반 태그 + styled.h3 + CSS 선택자).

### 구현 항목
- 일반 `<h3>` → `<strong>`
  - `client/components/modals/CustomerMergeSuggestionModal.tsx` (모달 제목)
  - `client/components/modals/NaverSyncConflictModal.tsx` (모달 제목)
- `styled.h3` → `styled.strong` (인라인→블록 방지 위해 `display: block;` 추가)
  - `client/components/calendar/overlays/ModalStyles.ts` (`StyledHeaderTitle`)
  - `client/components/calendar/overlays/ReservationDetailHeader.tsx` (`StyledReservationTitle`, ellipsis 유지 위해 block 필수)
  - `client/components/settings/MemberSection.styles.ts` (`StyledGuestTitle`)
  - `client/components/settings/settings-styles.ts` (`StyledSettingsCardTitle`)
- 정책 문서(`client/content/policies/privacy.ts` 소제목 4곳): 본문이 `<strong>`을 인라인 강조로 광범위하게 사용 → 소제목엔 `.policy-subhead` 클래스를 붙이고 `policyCss.ts`의 `h3 {}` 선택자를 `.policy-subhead {}`로 교체(`display:block` 추가). 인라인 `<strong>` 오염 방지 + "태그 선택자 대신 클래스" 원칙 준수.

### 리스크/주의
- 접근성: 소제목/모달 제목이 heading 아웃라인에서 빠짐(사용자 명시 요청으로 수용). 모달은 `role="dialog"`+`aria-label`이 있어 이름 지정은 유지됨.

---

## 진행 중 — 북마크(직접 URL 진입) 크래시 수정

> 배경: 사용자가 `/month` 같은 캘린더 URL을 즐겨찾기했다가 다시 진입하면 화면이 에러남.

### 원인
- 앱 내부 네비게이션은 항상 `/month/2026/7`처럼 날짜 세그먼트를 포함한 전체 경로를 만든다.
- 하지만 **뷰 이름만 있는 경로**(`/month`·`/week`·`/year`·`/three`·`/day`)로 직접 진입하면 `LayoutComponent`가 `new Date(Number(array[2]), …)`에서 연도 세그먼트(`array[2]`)가 `undefined` → `new Date(NaN,…)` = **Invalid Date**를 만든다.
- `setTargetFromDate(Invalid Date)` → `target.full`이 truthy(Invalid Date 객체)라 `computeTargetDerived`가 early-return하지 않고 `fullYear/month/date`가 전부 `NaN` → 주 계산 `new Array(NaN)` → `RangeError: Invalid array length` 크래시.

### 구현 항목
- `client/components/layout/LayoutComponent.tsx`: `currDate` 산출과 `popstate` 핸들러에서 연도 세그먼트가 유효한 양수가 아니면 오늘(`initDate`)로 폴백. → `/month`는 이번 달 월별 뷰로 열리고, 기존 URL 동기화 effect가 `/month/2026/7`로 자동 정정.
- `client/utils/calendarDerived.ts`: `fullYear`가 `NaN`이면 방어적으로 early-return(재발 방지 안전망).

### 기대 결과
- `/month`·`/week`·`/year`·`/three`·`/day` 직접 진입 시 크래시 없이 오늘 기준 해당 뷰 표시 + URL 정규화.

### 추가 — 날짜 박제 북마크 문제 (최초 진입 시 오늘로)
- 배경: 사용자가 특정 시점에 북마크하면 브라우저가 `/month/2026/6`처럼 **날짜가 박힌** 전체 URL을 저장 → 시간이 지나면 그 북마크로 들어올 때 계속 "지난 달"이 보인다.
- 결정(사용자): **최초 진입(북마크·새로고침·직접 URL)은 URL 날짜를 무시하고 항상 오늘로.** 뷰 종류(월/주/일)는 북마크 값 유지. 앱 안에서의 이전/다음·뒤로가기는 URL 날짜 존중.
- 구현: `LayoutComponent`의 초기화 effect에서 `initializedPath === null`(최초 진입)이면 `setCurr(initDate)`(오늘), 이후엔 `setCurr(currDate)`(URL 날짜). URL 동기화 effect가 `/month/2026/7`로 정규화.
- 트레이드오프(수용): 다른 달을 보던 중 새로고침하면 오늘로 돌아옴.

### 추가 — 기본 보기 월별로 변경 (PC·모바일 공통)
- 결정(사용자): 기본 보기를 **월별**로. 모바일 전용 뷰 분기는 없어 한 번에 적용.
- 구현: `calendarStore` 초기 `view.type` `'week'→'month'`, `LayoutComponent` 루트/비캘린더 진입 기본값 `ViewType.Week→ViewType.Month`.

---

## 진행 중 — 쿠폰(할인) 시스템

> 결정(사용자): 할인 방식 **정액+정률 둘 다**, 발급 **직접발급+코드형 둘 다**, 결제는 **결제수단에 `coupon` 추가해 차감**.
> 위치: 적립금(금액)·회원권(횟수/기간)에 이어 **할인**을 담당. 회원권 시스템 패턴을 그대로 따른다.

### 진행 현황 (2026-06-30 갱신)
- ✅ **DB 모델 선반영**: `CouponProduct`/`CustomerCoupon` + `Store.useCouponSystem` 토글 컬럼 (마이그레이션 `0007_coupon_models`).
- 🔶 **Phase 1 착수(이번 작업)**: 토글 배선 + 쿠폰 상품 CRUD API + aside '쿠폰 관리' 메뉴/아이콘 + `/settings/coupon` 상품 관리 탭. (회원권 패턴 미러링)
- ❌ 미착수: Phase 2(발급/코드 클레임·보유목록), Phase 3(**`PaymentMethod.coupon` enum 추가** + 결제 자동 차감 — 머니플로우, 별도 진행).

### Phase 1 구현 항목 (이번 작업)
- **신규**: `client/features/coupons/model.ts`(프론트 타입), `server/api/coupons.ts`(상품 CRUD, owner), `client/pages/api/coupons.ts`(re-export), `client/components/settings/CouponManageSection.tsx`(상품 관리 UI).
- **토글 배선**: `server/api/store.ts`(GET select·PATCH 수신에 `useCouponSystem` 추가), `calendarStore.ts`(상태+`setStoreFeatures`/`updateStoreFeatures` 시그니처), `calendarStoreHelpers.ts`(syncStoreFeatures patch), `_app.tsx`(로컬·원격 로딩), `features/local-db/storage.ts`(스냅샷 필드), `StoreManageSection.tsx`(체크박스).
- **메뉴/탭**: `Aside.tsx`(SETTINGS_SUBMENU '쿠폰 관리' + `useCouponSystem` 게이팅), `AsideMenuIcon.tsx`('coupon' 아이콘), `settings.tsx`(탭 타입·디스패치).
- 상품 필드: 이름, 할인방식(정액 amount/정률 rate), 할인값, 정률 상한(maxDiscount?), 최소 결제금액(minOrderAmount?), 유효기간(validDays?), 코드(code? — 있으면 코드형).

### 리스크
- `@@unique([storeId, code])` 충돌 시 409 처리 필요(코드형 중복). 정률 0~100 검증.
- Phase 3(결제 차감)는 회원권 Phase 3과 함께 신중히 — 이번 범위 밖.

### 현황 조사 결과
- 결제 = `ReservationPaymentEntry`(method `PaymentMethod` + amount Int, 예약당 다건=분할결제). 결제 UI는 `ReservationDetailPaymentLayer`(method 셀렉트 + 금액 + 추가/삭제).
- `PaymentMethod` enum에 이미 `discount`(할인·수동), `points`(적립금) 존재. 프런트 union(`reservations/model.ts`)엔 '할인'·'적립금' 라벨.
- 토글 패턴(`usePointSystem`/`useMembershipSystem`) + aside 게이팅 + `/settings/[tab]` 디스패치 + `CustomerAutocomplete`(발급 고객검색) 재사용 가능.

### 설계 (회원권 미러링)
- **Store.useCouponSystem Boolean @default(false)** — 매장관리 토글. (컬럼 생성 완료)
- **CouponProduct**(쿠폰 정의): id, legacyId, storeId, name, `discountType`(amount|rate), `discountValue Int`(원 또는 %), `maxDiscount Int?`(정률 상한), `minOrderAmount Int?`(최소 결제금액), `validDays Int?`(만료), `code String?`(있으면 코드형 — @@unique[storeId,code]), status(active|archived). @@unique[storeId,legacyId]. (모델 생성 완료)
- **CustomerCoupon**(고객 보유): id, legacyId, storeId, customerId, productId?, name 스냅샷, discountType/discountValue/maxDiscount/minOrderAmount 스냅샷, issuedAt, expiresAt?, usedAt?, reservationId?(사용처), status(active|used|expired|cancelled). (모델 생성 완료)
- **PaymentMethod**에 `coupon` 추가(할인과 구분 — 추적되는 쿠폰 차감). (미반영)

### 구현 단계
1. **Phase 1 — 토글 + 모델 + 상품 관리**: ~~CouponProduct/CustomerCoupon 마이그레이션~~(완료) + Store 토글 배선, CRUD API, 매장관리 체크박스, aside '쿠폰 관리' 메뉴/아이콘, `/settings/coupon` 상품 탭(정액/정률·코드·만료·최소금액).
2. **Phase 2 — 발급**: 직접 발급(`CustomerAutocomplete`로 고객 검색) + 코드형 클레임(코드 입력→해당 고객에 CustomerCoupon 발급), 보유 목록, 고객 상세에 보유 쿠폰 표시.
3. **Phase 3 — 결제 연동(머니플로우, 신중)**: 결제 레이어 method에 '쿠폰' 추가 → 보유 쿠폰 선택 → 할인액 자동계산(정액=value, 정률=round(total×%) capped maxDiscount, minOrderAmount 검증) → `ReservationPaymentEntry(coupon)` 기록 + CustomerCoupon used 처리(트랜잭션). 매출 집계(RevenueFilters/charts)에 쿠폰 할인 반영.
   - ⚠️ 회원권 Phase 3(결제 자동차감)와 같은 핵심 머니플로우 영역 → 함께/테스트 동반 권장.

### 리스크/주의
- 정률 반올림·상한·최소금액 경계, 분할결제와의 합계 정합성.
- 결제 차감은 트랜잭션(예약 결제 ↔ 쿠폰 used). 만료/중복사용/타고객 쿠폰 방어.

---

## 진행 중 — 매장관리: 적립금/회원권 시스템 토글 + 회원권 풀 기능

> 매장 관리에서 "적립금 시스템 사용"·"회원권 시스템 사용"을 켜면 aside 설정에 메뉴가 뜨고 페이지가 열린다.

### 진행 현황 (2026-06-29 갱신)
- ✅ **Phase 1(토글 + 메뉴/페이지)**: Store 토글 2개(`usePointSystem`/`useMembershipSystem`, 마이그레이션 `0005_store_feature_toggles`), `/api/store` GET/PUT·매퍼·calendarStore 연동, StoreManageSection 체크박스, Aside 메뉴 게이팅 + 회원권 메뉴/아이콘, `/settings/membership` 탭.
- ✅ **Phase 2(모델 + 관리 UI)**: 4개 모델(`MembershipProduct`/`MembershipProductService`/`CustomerMembership`/`MembershipUsage`, 마이그레이션 `0006_membership_models`), API(`memberships.ts` 상품 CRUD·`membership-issue.ts` 발급/취소·`membership-use.ts` 수동 차감/복원), `MembershipManageSection` UI.
- ❌ **Phase 3(결제 연동) 남음**: `PaymentMethod.membership` enum 추가, 예약 결제 시 회원권 선택→자동 차감(MembershipUsage 기록), 잔여/만료 검증, 고객 상세에 보유 회원권·이력 표시.

### 확정된 설계 결정 (사용자 확인)
- **적립금 = 금액 / 회원권 = 비금액(횟수·기간)**. 금액권은 기존 적립금 충전(recharge)에 이미 있으므로 **별도로 안 만든다**(중복 방지).
- **회원권**: 한 모델에 `횟수(옵션) + 만료(옵션)` 둘 다 담아 횟수권/기간권/복합 모두 표현. 서비스 **지정·전체 둘 다** 지원. 결제 시 **결제수단으로 차감 연동**. **선택적 만료**.
- 적립금 토글 **기존 매장 기본값 = 꺼짐**(`default(false)`).
- aside: 적립금 관리(기존 `point`)는 적립금 토글 ON일 때만, 회원권 관리(신규)는 회원권 토글 ON일 때만 노출.

### 리스크/주의 (Phase 3)
- 결제 차감은 트랜잭션으로(예약 결제 ↔ 회원권 차감 정합성). 만료/잔여 0 방어.

---

## 진행 중 — 업종별 라벨 시스템 (매장관리 직종 표시·수정 + 담당자/서비스 문구 전환)

> 매장 관리에 직종(shopType) 표시·수정 추가, 직종에 맞게 "담당자"·"서비스" 문구가 화면에 반영되게.

### 진행 현황 (2026-06-29 갱신)
- ✅ **Phase A(핵심)**: `features/store-settings/labels.ts`(category 매핑·`getStoreLabels`·`sanitizeShopType`) + `hooks/useStoreLabels.ts` 구현. aside 메뉴·담당자/서비스 관리·예약 폼·캘린더 적용. 업종 확장(beauty/food/medical/fitness/class/pet/repair/space/counsel/etc) 반영 — 라벨 표는 index.md 참조.
- 🔶 **Phase B(확장)**: 매출·모달·온보딩 등 나머지 라벨 — '단계적 확대' 진행 중.
- 미결(이월): "시술"→"서비스" 명칭 통일 여부 — 현재 라벨 시스템이 beauty service 라벨을 '서비스'로 노출하므로 사실상 흡수. 별도 전수 치환은 불필요로 판단(필요 시 재검토).

### 설계 결정 (요약)
- 라벨은 **category 기준**. 같은 category 내 세부업종 다중 허용, **cross-category 비허용**. 다중 업종(콤마) 시 첫 업종(primary)의 category로 라벨 결정.
- 라벨 주입: `getStoreLabels(shopType) → {assignee, service}` + `useStoreLabels()` 훅(calendarStore의 shopType 구독). 합성문구는 템플릿(`${labels.assignee} 관리`).
- **제외(영구)**: 약관/개인정보/DPA/about/maintenance의 "서비스"(앱 명칭). PageHero 영문 eyebrow(ASSIGNEE/SERVICE)는 유지.

### 리스크
- 약관 등 "서비스" 오치환 → 라벨 대상만 선별 치환(전수 find-replace 금지).
- 음식점은 라벨만으론 부족(인원수·테이블 자원·회전시간은 별도 트랙) — 이번 범위는 **라벨/직종 표시까지만**.

---

## 다가오는 작업 — 읽기 과부하/페이징(③) + 매출 서버화(A)

> 설계 상세: [docs/reading-overload-pagination.md](docs/reading-overload-pagination.md).

### 트리거 (재산정 2026-06-23)
- 6/1~6/23(23일) 예약 ~60건 ≈ **월 ~80~100건+**(월말 전). **네이버 예약 API 연동 추가 예정** → 유입 가속.
- 러프: **3~4개월 → 누적 수백 건**(B 트리거 "미래 예약 수백+" 도달), **~1년 → 수천**. ReservationHistory는 더 빠름.
- → 무기한 보류 아님. **몇 달 내** 현실화.

### 순서
1. ~~**B-1 공통 로직 추출**~~ — **완료**. `calendarStoreServiceHelpers.ts`에 인라인이던 `minutesBetween`·수동판정(`isPriceManual`/`isDurationManual`)을 `features/services/model.ts`로 이동(무동작 변경, `export *`로 자동 재export, 서버 import 가능).
2. **네이버 연동 마일스톤에 결합**:
   - `naver-booking-sync.ts:88` 매 폴링 전체예약 풀스캔 **bound**(연동 시 그 파일 만지므로 같이) — 인덱스+범위/증분.
   - **A(매출 집계 서버화)** 를 이 마일스톤으로 끌어와 착수(연동으로 데이터 곧 늘어 명분 생김). A 스텝은 docs "A" 섹션 참조.
3. **B-3 페이징 / B-2 updateService 서버화 / B-4 고객 페이징**: 누적 수백~수천 신호 시(몇 달 내 예상). A가 선결로 먼저 돼 있게.

### A 주의 (착수 시)
- 원격 전용 + local(`shouldUseLocalDb`)은 클라 계산 유지(모드 분기). 서버는 revenue.ts **순수함수 재사용**(query→`dbReservationToFrontend`→`groupByDate`→동일 함수 호출, 재구현 X).
- 예외: `getRevenueInsights` 신규/재방문은 범위 밖 이력 필요 → stored `Customer.firstVisitDate` 사용.
- 회귀=매출 오표시 → 클라==서버 합계 일치 검증.

## 의존성 보안 패치 스윕 (#85)

### 요구사항
- Dependabot 취약점 9건(high 8, moderate 1) 대응. 알림 목록 조회 불가 → **블라인드 패치 스윕**.

### 구현 방침
- `pnpm update`로 semver 범위 내 최신 패치 반영(transitive 완화 포함), pin된 `next` 등은 패치 범프 검토.
- **제외**: `xlsx@0.18.5`(npm 패치본 없음, export-only 수용 리스크 — `revenue-export.ts` 문서화), `next-auth`(beta)·`react`(pin) major/beta 범프.

### 영향 파일
- `client/package.json`, `pnpm-lock.yaml`

### 검증
- `pnpm build`(prisma generate + next build) + 타입체크 그린 = 회귀 없음.

### 완료 조건
- 빌드 그린, 안전 범위 취약 의존성 패치 갱신. 남은 알림(xlsx)은 수용 리스크로 명시.

## 진행 중 — 1d 고객 확인·변경·취소 (오너 승인형) (#76)

### 결정 (사용자 확정)
- **데이터 모델**: Reservation에 `pendingAction`(none/cancel/change) + `pendingPayloadJson`(Json) + `pendingRequestedAt` 컬럼 추가. (별도 모델 X — 대기 요청 1건/예약)
- **범위**: 한 PR로 통째(스키마·마이그레이션·공개 API 3종·고객 페이지·오너 승인 UI).

### 구현
1. **스키마+마이그레이션 0010**(멱등 `IF NOT EXISTS`, 신규 enum은 `DO $$ EXCEPTION duplicate_object`). `reservationSelect`에는 넣지 않음(배포순서 독립 유지) — 오너 승인 조회는 전용 select로.
2. **공개 API**(`server/api/book/reservation/`): `GET [token]`(예약 상태 최소 노출), `POST [token]/request-cancel`, `POST [token]/request-change`(새 슬롯 검증 후 payload 저장). Slack로 오너 알림.
3. **고객 페이지** `pages/book/[slug]/r/[token].tsx`: 상태 표시 + 취소/변경 요청. 완료화면(`[slug].tsx`)에 확인 링크 노출.
4. **오너 승인**: 인증 API(`book-requests` GET 목록 + POST 수락/거절, `requireRole staff`) + Header 알림 벨(NaverSyncNotification 패턴 참고).

### 배포순서 (⚠️ 중요)
- 마이그레이션 0010을 **Supabase에 수동 선적용** 후 코드 배포. 예약 조회는 `include` 금지·명시적 select 유지 → 미적용 상태에서도 메인 흐름 500 없음.

### 검증
- `pnpm build` + 고객 요청→오너 수락/거절→반영 흐름 구동.

## 진행 중 — 온라인 예약을 "신청→오너 확정형"으로 전환 (+슬롯 차단, 네이버 2중검증)

### 결정 (사용자 확정)
- 온라인 신규 예약 = **`requested`(신청)** 상태로 생성(즉시확정 X). 오너 수락 시 `active`(확정), 거절 시 `cancelled`.
- 슬롯 점유 판정 = **`active` + `requested`** 둘 다. 차단은 오너 확정/거절 때까지(자동만료 없음).
- 오너 확정 위치: **알림 벨 + 캘린더에 '신청' 상태 구별 표시**.
- 겹침 검증: 신청 생성 시 Serializable 트랜잭션에서 active+requested 재검증.
- 네이버 2중검증: **비동기(fire-and-forget)** — 신청 접수 후 백그라운드 네이버 동기화 트리거, 겹침은 기존 충돌감지/벨로 오너 확정 전 노출. Gmail 미연동/실패 시 신청 안 막음.
- 내부(오너) 예약은 종전대로 DB 직접+즉시 확정+즉시 Slack(변경 없음).

### 영향 범위(파급) — 매핑 후 확정
- 스키마: `ReservationStatus`에 `requested` 추가(마이그레이션 0011, ADD VALUE IF NOT EXISTS).
- 공개 API: `reserve.ts`(requested 생성, 슬롯점유 active+requested, 비동기 네이버 동기화, Slack '신규 신청'), `availability.ts`·`request-change.ts` 슬롯점유 확장.
- 오너 API/UI: `book-requests`(신규 신청도 목록/수락·거절), 알림 벨, 캘린더 렌더·상태배지·매퍼·매출집계(requested 미집계)·충돌감지·필터.
- 고객: 완료화면 "신청됨(확정대기)", 관리 페이지 requested 상태 라벨.

### 검증
- `pnpm build` + 신청→차단→오너 확정/거절 흐름 구동(스크린샷). 매출·캘린더 회귀 없음 확인.
