# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

## 진행 예정 — 쿠폰(할인) 시스템

> 결정(사용자): 할인 방식 **정액+정률 둘 다**, 발급 **직접발급+코드형 둘 다**, 결제는 **결제수단에 `coupon` 추가해 차감**.
> 위치: 적립금(금액)·회원권(횟수/기간)에 이어 **할인**을 담당. 회원권 시스템 패턴을 그대로 따른다.

### 진행 현황 (2026-06-29 갱신)
- ✅ **DB 모델 선반영**: `CouponProduct`/`CustomerCoupon` + `Store.useCouponSystem` 토글 컬럼 (마이그레이션 `0007_coupon_models`).
- ❌ 나머지 미착수: 토글 배선(`/api/store`·StoreManageSection·calendarStore — 현재 store API는 적립금/회원권 토글만 처리), CRUD API, aside '쿠폰 관리' 메뉴/아이콘, `/settings/coupon` 탭, 발급/코드 클레임, **`PaymentMethod.coupon` enum 추가**, 결제 연동.

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
