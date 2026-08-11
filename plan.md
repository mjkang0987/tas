# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.
> 완료된 작업 기록은 git 히스토리에서 확인한다 (`git log -p -- plan.md`).

---

## 진행 중 — 네이버예약 연동 노출 제한 + 통합예약관리 문구 제거

> 요구: 네이버예약 연동은 `hairsalonkimeun` 매장에서만 보이게 하고, 나머지 매장/계정에서는 노출하지 않는다.
> **삭제가 아니라 비노출** — 나중에 공개 범위를 넓힐 수 있어야 하므로 코드·기능은 그대로 두고 게이트만 건다.

### 판별 기준
- 허용 목록은 **영문 매장명(`Store.bookingSlug`)** 기준 (`hairsalonkimeun`). 오너가 아는 유일한 매장 식별자다.
- **이미 Gmail 연동을 붙여 쓰는 매장은 유지**(`gmailConnection` 존재). 슬러그가 비어 있거나 바뀌어도
  실제로 동기화를 쓰던 매장이 갑자기 연동을 잃지 않게 하는 안전장치다.
- 이 안전장치가 우회로가 되지 않도록 **신규 연동 시작(`/api/gmail/connect`·`oauth-callback`)은 서버에서 차단**한다.
  (허용 매장 외에는 새 연결을 만들 수 없으므로, "연결하면 노출된다"는 순환이 생기지 않는다.)

### 구현 항목
1. `client/features/store-settings/naver-access.ts` (신규, 순수) — 허용 슬러그 목록 + `isNaverBookingAllowedSlug`. 단위 테스트 동반.
2. `server/naver-access.ts` (신규) — `isNaverBookingEnabledStore(storeId)`: 허용 슬러그 **또는** 기존 Gmail 연동.
3. `server/api/store.ts` GET 응답에 `naverBookingEnabled` 추가 → `_app.tsx` → `calendarStore.naverBookingEnabled`.
   (`setStoreFeatures` 인자를 객체로 바꿔 boolean 5개 나열을 피한다.)
4. UI 비노출: 설정 메뉴(`settingsMenu.ts` + `Aside`·`/menu`), 온보딩 4단계(네이버 안내), 헤더 동기화 훅(`useNaverBookingSync`의 `canUseSync`).
5. `/settings/naver` 직접 진입은 `getServerSideProps`에서 `/settings/revenue`로 리다이렉트(게스트 포함).
6. 서버 차단: `/api/gmail/connect`, `/api/gmail/oauth-callback` — 허용 매장 외 진입 거부.

### 영향 파일
- 신규: `client/features/store-settings/naver-access.ts`(+`.test.ts`), `server/naver-access.ts`
- 수정: `server/api/store.ts`, `server/api/gmail/connect.ts`, `server/api/gmail/oauth-callback.ts`,
  `client/pages/_app.tsx`, `client/pages/settings.tsx`, `client/pages/menu.tsx`, `client/pages/onboarding/index.tsx`,
  `client/store/calendarStore.ts`, `client/components/layout/settingsMenu.ts`, `client/components/layout/Aside.tsx`,
  `client/hooks/useNaverBookingSync.ts`

### 리스크
- **허용 매장이 연동을 잃는 것**이 최악의 회귀다. Gmail 연동 존재를 함께 허용 조건으로 둬서 막는다.
- 플래그는 `/api/store` 응답으로 도착하므로 초기 렌더 한 틱은 `false`(메뉴 미표시 → 표시). 다른 기능 토글과 동일한 동작이라 수용.
- 스키마 변경 없음 → 마이그레이션 불필요.

### 완료 조건
- 허용 외 매장: 설정 메뉴·`/settings/naver`·온보딩 안내·동기화 폴링 모두 비노출, 새 Gmail 연동 시작 불가.
- 허용 매장: 기존과 동일하게 동작.
- 빌드·타입체크·단위 테스트 그린.

### 곁들인 작업 — "네이버·당근 등 통합 예약 관리" 문구 제거
> 외부 플랫폼 통합 예약 관리는 미구축인데 서비스 전면에 광고돼 있었다. 제공 범위(예약·고객·담당자·매출)만 남긴다.
- `client/lib/seo.ts`(제목·description·OG/Twitter·키워드), `client/public/favicon/manifest.json`(PWA 이름),
  `client/pages/about.tsx`(소개 description), `client/pages/index.tsx`(홈 타이틀).
- `client/public/img-share.png` — 공유 카드에 "네이버 예약까지 간편하게 관리 / 네이버 예약 + 자체 예약을 한 화면에서"가
  박혀 있어 같은 톤(그라데이션·Pretendard)으로 재생성해 교체.
- 정책 문서(`terms.ts`·`privacy.ts`)의 카카오·네이버 언급은 **SNS 로그인·제3자 서비스 고지**라 사실이므로 유지.

### 검증 결과 (2026-08-11)
- 단위 테스트 58건 통과(신규 6건) + 변이 검사 3종 모두 실패 확인. `pnpm build`·`tsc --noEmit` 그린, 린트 신규 0건.
- 로컬 Postgres + `next start` 실구동: 허용/비허용 매장 2곳으로 `/api/store` 플래그·설정 메뉴·`/settings/naver`
  리다이렉트·헤더 알림 벨·`/api/gmail/status` 폴링·`/api/gmail/connect` 403까지 확인.

### 남은 것
- 없음. 운영 매장의 `bookingSlug`가 `hairsalonkimeun` 임을 지시자가 확인(2026-08-11) — 허용 목록이 슬러그만으로
  성립하므로 Gmail 연동 예외(폴백)에 기대지 않는다.

---

## 진행 중 — 게스트에게 쿠폰·회원권·온라인예약 노출 금지 (앱 규칙에 맞추기)

> 웹은 게스트(로컬 모드)에게도 세 기능 토글을 열어둔다. 켤 수는 있는데 **쓸 수가 없다** — 서버가
> 있어야 동작하는 기능이라서다. iOS는 이 문제를 알고 "켤 수는 있는데 못 쓰는 토글은 두지 않는다"로
> 정리했고(`tas-ios` plan.md P4), 웹만 남았다. 웹을 앱 규칙에 맞춘다.

### 지금 벌어지는 일 (코드 확인)
- **온라인예약이 최악** — 게스트가 켜면 '고객 예약 설정'이 메뉴에 뜨는데 그 화면엔 로컬 대응이 없다.
  마운트 즉시 `fetch('/api/store')` → 게스트는 401 → `.catch(() => {})`로 **조용히 삼켜** 빈 폼이 뜨고,
  저장하면 "저장 중 오류가 발생했습니다"만 나온다. 왜 안 되는지 알 방법이 없다.
- **쿠폰·회원권** — `shouldUseLocalDb()` 분기가 있어 상품 CRUD는 로컬로 되지만 **발급이 불가**하고,
  `POST /api/migrate-local`이 받는 건 서비스·담당자·고객·예약뿐이라 그 상품은 **로그인해도 안 넘어간다**(막다른 데이터).

### 구현 방침
- **끄지 않고 감춘다.** 이미 켜 둔 게스트의 로컬 스냅샷 값·데이터는 건드리지 않는다(앱과 동일 규칙).
  단, 감추는 판정은 토글 값이 아니라 **게스트 여부**로 한다 — 값으로 판정하면 이미 켠 게스트는 그대로 보인다.
- 판정은 `useSession()`(=`!session`)으로 통일. `shouldUseLocalDb()`는 SSR에서 sessionStorage가 없어
  항상 true를 주므로 렌더 중 호출하면 하이드레이션이 어긋난다.

### 영향 파일
- `client/components/layout/settingsMenu.ts` — `SettingsMenuGate.isGuest` 추가, coupon·membership·booking·notice 게이팅
- `client/components/layout/Aside.tsx`, `client/pages/menu.tsx` — `isGuest` 전달(이미 계산 중)
- `client/components/settings/StoreManageSection.tsx` — 게스트면 세 토글 미노출 + 안내 문구
- `client/pages/settings.tsx` — 게스트가 주소로 직접 들어오면 `/settings/revenue`로 리다이렉트
- 신규: `client/components/layout/settingsMenu.test.ts` — 게이팅 단위 테스트

### 리스크
- 게이트가 과하면 **오너의 기능이 사라진다**. 로그인 상태에선 현행 그대로임을 테스트로 못박는다.
- 세션 로딩 중엔 `isGuest=true`라 잠깐 감춰졌다 나타난다 — 기존 오너 전용 항목(sns·member)과 동일한 동작.

### 완료 조건
- 게스트: 매장관리에 세 토글 없음, 메뉴에 쿠폰·회원권·고객예약설정·공지 없음, 주소 직접 진입 시 리다이렉트.
- 로그인(오너): 현행 그대로.
- 빌드·타입체크·단위 테스트 그린 + 게스트/오너 실제 구동 확인.

---

## 미확인 — 담당자관리 카드 실기기/화면 확인 (PR #186 후속)

> 구현·자동 검증은 PR #186에서 끝났다(빌드·타입·단위 테스트 11건 + 변이 검사). 화면을 직접 띄워본 확인만 남았다.

- **설정 > 담당자관리 실제 구동** — 읽기 모드에 빈 입력칸 0개 / 근무시간 요약 문구가 7행과 일치 / 편집 모드 다국어 3칸 등폭.

## 다가오는 작업 — 고객 예약 페이지 접근성 잔여분 (PR #188 후속)

> PR #188에서 지시로 보류하거나 제 손으로 못 끝낸 것들. 본 작업 기록은 git 히스토리(`git log -p -- plan.md`).

- **단계 제목 `strong` → `h2`** (`book/[slug].tsx`의 `StyledSectionLabel`, 5곳). 페이지에 `h1` 하나뿐이라 스크린리더 heading 탐색이 무용지물이다. `styled.strong` → `styled.h2` **한 글자**이고 양쪽 다 기본 스타일을 덮어써 **시각 변화 0**. "태그 변경건 제외" 지시로 보류됨.
- **`BookingPickers.tsx`의 `i { }` 태그 셀렉터** (`SlotLegend`). CLAUDE.md Front-End Standards의 "태그 셀렉터 금지" 위반. 위 건과 같은 성격이라 함께 보류됨.
- **en/ja/zh 검증 문구 3종 원어민 검수** (`nameRequired`/`telRequired`/`telInvalid`). 내가 작성한 것이라 기존 문구 톤과 맞는지 미확인.
- **iOS Safari 실기기 확인.** 제출 검증 실패 시 `scrollIntoView` + `focus()`가 소프트 키보드를 띄우는데, 스무스 스크롤 진행 중 뷰포트가 바뀌면 최종 위치가 어긋날 수 있다. Chromium으로는 재현 불가. `:empty` 라이브 리전의 Safari/Firefox 동작도 미확인(최악은 16px 여백, 기능 영향 없음).


## 진행 중 — 업종별 라벨 시스템 (매장관리 직종 표시·수정 + 담당자/서비스 문구 전환)

> 매장 관리에 직종(shopType) 표시·수정 추가, 직종에 맞게 "담당자"·"서비스" 문구가 화면에 반영되게.

### 진행 현황 (2026-06-29 갱신)
- ✅ **Phase A(핵심)**: `features/store-settings/labels.ts`(category 매핑·`getStoreLabels`·`sanitizeShopType`) + `hooks/useStoreLabels.ts` 구현. aside 메뉴·담당자/서비스 관리·예약 폼·캘린더 적용. 업종 확장(beauty/food/medical/fitness/class/pet/repair/space/counsel/etc) 반영 — 라벨 표는 index.md 참조.
- 🔶 **Phase B(확장)**: 매출·모달까지 `useStoreLabels` 적용 완료(18개 파일). **온보딩(`OnboardingStep3`)만 '담당자' 하드코딩으로 남음** — 여기만 정리하면 종료.
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

