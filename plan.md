# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

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
- **Phase 0 — 스키마·오너 설정 기반**: 마이그레이션(위) + `/settings/booking` 탭(토글·slug·규칙·노출 대상). slug 중복 검증. 공개 페이지는 토글 ON일 때만 활성.
- **Phase 1 — 공개 부킹 페이지(셀프 예약 생성)**:
  - `/book/[slug]`: 서비스 선택 → 담당자 선택(+무관) → 날짜 선택(영업시간/휴무일/최대일수 반영) → 가능 슬롯 선택 → 이름+연락처 → 예약 확정.
  - 공개 API: `GET /api/book/[slug]`(매장 공개정보), `GET /api/book/[slug]/availability`(날짜·담당자·서비스 → 가능 슬롯), `POST /api/book/[slug]/reserve`(예약 생성, `publicToken` 반환).
  - 슬롯 계산 유틸: 영업시간 − 기존 예약 − 담당자 스케줄 − 서비스 소요 − 최소 사전시간. 생성 시 트랜잭션 재검증(동시성).
  - 예약 생성: channel=`online`, status=`active`, assigneeId 또는 null, legacyId 부여, customer upsert(이름+정규화 tel).
- **Phase 2 — 고객 확인·변경·취소 (오너 승인형 요청)**:
  - `/book/[slug]/r/[token]`: 예약 상태 표시 + **취소 요청** + **변경 요청**(다른 슬롯 재선택). 고객은 "요청"만 하고 즉시 반영되지 않음.
  - 요청 저장: 예약에 대기 요청 표현(신설 `ReservationRequest` 모델 또는 Reservation 필드 `pendingAction`(none/cancel/change)+`pendingPayload`(JSON: 요청 날짜/시간/담당자)+`pendingRequestedAt`). 구현 시 확정.
  - 오너 승인 UI: 오너 앱에서 대기 요청을 보고 수락/거절. 네이버 알림 벨 패턴 또는 예약 상세/캘린더 배지로 노출. 수락 시 예약 반영(취소=cancelled, 변경=슬롯 갱신), 거절 시 요청 폐기.
  - 공개 API: `GET /api/book/reservation/[token]`, `POST .../request-cancel`, `POST .../request-change`. 오너 승인 API는 로그인/역할 검증(기존 패턴).
- **Phase 3 — 알림**:
  - 매장(오너) 측: 신규 온라인예약·변경/취소 **요청** 발생 시 Slack(`notifySlackForStore`) 재사용 + 오너 앱 내 알림/대기 목록(네이버 알림 벨 패턴 참고).
  - 고객 측: **문자/이메일 발송 없음(확정)**. 앱에 SMS/이메일 인프라 부재. 고객은 예약 후 받은 **확인 링크**(`/book/[slug]/r/[token]`)를 다시 열어 상태·승인 결과를 확인. 실제 문자/알림톡은 향후 공급사 연동 시 별도 추가.

### 확정된 결정
1. 공개 URL: **`/book/[매장slug]`** (매장별 slug, 오너 설정에서 지정·중복검증).
2. 변경/취소: **오너 승인형 요청** (고객은 요청만, 오너가 앱에서 수락/거절).
3. 고객 알림: **확인 링크만** (문자/이메일 없음).

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
