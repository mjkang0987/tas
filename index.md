# Take a Seat (TAS) - 프로젝트 인덱스

> 예약 관리 시스템. Next.js 16 + React 19 + Prisma 7 + PostgreSQL + Zustand

---

## 디렉토리 구조

```
hair_reservations/
├── client/          # 프론트엔드 (Next.js 앱, pages/api 라우트 포함)
│   ├── pages/       # 라우팅 (pages 라우터). 실제 화면 전부
│   ├── content/     # 정적 콘텐츠 단일 소스 (policies/ — 약관·개인정보·DPA 본문)
│   └── app/         # app 라우터 — NextAuth route handler + 전역 not-found(404)만
├── server/          # 백엔드 (API 핸들러 + DB + Auth + Prisma 자산)
├── docs/            # 문서
├── plan.md          # 게스트 데이터 마이그레이션(병합 플로우) 계획
├── CLAUDE.md        # Claude 작업 지시사항 (세션 시작 규칙·워크플로·프론트 표준·커밋 컨벤션)
└── index.md         # 이 파일
```

---

## 프론트엔드 (`client/`)

### 페이지 라우팅 (`client/pages/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `index.tsx` | 메인 캘린더 (SSR, `getServerSideProps`로 예약·고객·이력 초기 로드) |
| `/login` | `login.tsx` | 로그인 (Google, Kakao, Naver OAuth) + 게스트 진입. 초대 링크(`?invite=CODE`) 코드 자동입력, 인앱 브라우저(WebView) 감지 시 안내 배너 + 카카오 우선 노출, 로고→루트 링크 |
| `/logout` | `logout.tsx` | 로그아웃 후 `/login`으로 리다이렉트 |
| `/mypage` | `mypage.tsx` | 계정 관리 (프로필, 연결된 SNS, 로그아웃, 회원탈퇴) |
| `/settings/[tab]` | `settings/[tab].tsx` → `settings.tsx` | 설정 (탭: revenue/point/membership/service/assignee/store/member/sns/naver) |
| `/address` | `address.tsx` | 고객 명단 |
| `/onboarding` | `onboarding/index.tsx` | 신규 매장 초기 설정 (로그인 사용자). 온보딩 완료자는 이전 페이지로 리다이렉트 |
| `/onboarding/guest` | `onboarding/guest.tsx` | 게스트 온보딩 (index 컴포넌트 재사용, 경로로 분기) |
| `/inquiry` | `inquiry.tsx` | 고객센터 문의·이력 조회 |
| `/consent` (`/consent/:slug*`) | `consent.tsx` | 이용약관·개인정보·처리위탁 **동의 게이트**[^19]. 동의 후 원래 가려던 경로로 복귀 |
| `/terms` | `terms.tsx` | 이용약관 (앱 인라인, Aside 포함)[^20] |
| `/privacy` | `privacy.tsx` | 개인정보처리방침 (앱 인라인)[^20] |
| `/dpa` | `dpa.tsx` | 개인정보 처리 위탁계약(DPA) (앱 인라인)[^20] |
| `/policies/:slug` | `pages/api/policies/[slug].ts` | 정책 **풀페이지**(앱 셸 없는 독립 HTML, OAuth 검수·외부 링크용). `next.config` rewrite로 연결[^20] |
| (404) | `pages/404.tsx` + `app/not-found.tsx` | 안내 페이지 + 5초 카운트다운 후 홈 자동 리다이렉트[^18] |
| (500) | `pages/500.tsx` | 서버 오류 안내 페이지 |

### 미들웨어 (`client/proxy.ts`)

- **약관 동의 게이트**: 로그인 계정이 `termsVersion !== CURRENT_TERMS_VERSION`이면 `/consent`로 리다이렉트. 단 게스트 동의 쿠키(`tas-guest-terms`) 보유 시 통과시키고 처리위탁(DPA) 동의만 앱 위 레이어로 받음[^19]
- `storeId` 있고 `onboarded=false`인 사용자는 허용 경로 외 접근 시 `/onboarding`으로 리다이렉트
- 온보딩 완료자의 `/onboarding` 진입 차단은 페이지 가드가 담당 (이전 페이지로 `router.back()`)
- **주의**: `/api/*`는 동의 게이트에서 제외(exempt)됨 — 데이터 기록 API는 `requireRole`만 검증(동의는 클라이언트 흐름으로 보장)
- **점검 모드 게이트**: `MAINTENANCE_MODE==='true'`면 `auth()` 밖 최상단에서 모든 요청을 `/maintenance`로 `rewrite`(인증 독립). `/maintenance`·`/_next`만 바이패스. `/login` 포함 전 페이지 차단 — matcher는 `api/auth`·`_next/*`·`favicon.ico`만 제외(인프라/인증 엔드포인트는 점검 중에도 유지). rename 등 마이그레이션 시 500 노출 방지용

### 컴포넌트 (`client/components/`)

| 폴더 | 역할 | 주요 파일 |
|------|------|----------|
| `calendar/views/` | 캘린더 뷰 (일/주/월/년/타임라인) | `Calendar.tsx`, `Day.tsx`, `Week.tsx`, `Month.tsx`, `Timeline.tsx`, `TimelineCluster.tsx`(중복예약 클러스터 — 담당자 배지 표시) |
| `calendar/overlays/` | 예약 생성·상세·수정 모달 | `ReservationCreate.tsx`(+`useReservationCreateForm.ts`/`ReservationCreateCustomerFields.tsx`), `ReservationDetail.tsx`(+`ReservationDetailSections`/`Header`/`FooterActions`/`PaymentLayer`/`ViewSection`, 순수 로직은 `reservationDetailUtils.ts`·타입은 `reservationDetailTypes.ts`), `CustomerDetail.tsx`(+`CustomerDetailSections.tsx`[^3a]), `ModalStyles.ts`(공통 모달 스타일·`OVERLAY_Z_INDEX`·접근성 훅), 컴포넌트별 `*.styles.ts` |
| `calendar/service/` | 서비스 범례·필드 | `ServiceLegend.tsx`(시술 배지 디자인), `ServiceFields.tsx` |
| `customers/` | 고객 공용 컴포넌트 | `CustomerAutocomplete.tsx`(고객명/연락처 검색 자동완성 — 예약 생성·회원권 발급 공용) |
| `layout/` | 공통 레이아웃 | `Header.tsx`(담당자 필터 base-select)+`HeaderSearchLayer.tsx`(고객 검색)+`Header.styles.ts`, `Aside.tsx`(역할별 설정 메뉴 + 하단 이용약관/개인정보처리방침 링크)+`AsideMenuIcon.tsx`(메뉴 아이콘)+`AsideGuestLogout.tsx`(게스트 로그아웃 확인, 동의 플래그 초기화 포함)+`Aside.styles.ts`, `StoreSwitcher.tsx`[^17], `LayoutComponent.tsx`, `Footer.tsx`, `NaverSyncNotification.tsx`[^1](+`.styles.ts`) |
| `modals/` | 전역 오버레이 (layout과 분리) | `NaverSyncConflictModal.tsx`[^2](+`.styles.ts`), `CustomerMergeSuggestionModal.tsx`[^3], `GuestMigrationLayer.tsx`(게스트→계정 병합 레이어), `ConsentDpaLayer.tsx`(처리위탁 DPA 동의 레이어 — "보기"는 `PolicyViewLayer`) |
| `policy/` | 정책 문서 표시 | `PolicyPage.tsx`(앱 인라인 페이지 레이아웃, mypage `StyledContainer` 사용), `PolicyViewLayer.tsx`(약관 "보기" — 공통 `ModalStyles` 레이어), `policyCss.ts`(인라인·풀페이지 공유 CSS + 독립 HTML 생성 `renderPolicyHtml`)[^20] |
| `onboarding/` | 온보딩 스텝 분리 | `OnboardingStep1~5.tsx`, `onboarding-types.ts`, `onboarding-step-styles.tsx` |
| `settings/` | 설정 화면 섹션 | `StoreManageSection.tsx`(매장정보+업종+적립금/회원권 시스템 토글), `ServiceManageSection.tsx`, `AssigneeManageSection.tsx`, `PointManageSection.tsx`(+`PointSettingsTab`/`PointAdjustTab`/`PointHistoryTab`), `MembershipManageSection.tsx`(회원권 상품 CRUD + 고객 발급·잔여 조회)[^21], `MemberSection.tsx`, `SNSLinkingSection.tsx`[^14], `NaverBookingSection.tsx`[^15], `settings-styles.ts`[^16]. 큰 섹션은 본체와 `*.styles.ts` 분리 |
| `settings/revenue/` | 매출 관리 | `RevenueSection.tsx`(+`.styles.ts`, 순수 차트 로직은 `revenueChartUtils.ts`), `RevenueChartGrid.tsx`, `RevenueKpiGrid.tsx`, `RevenueFilters.tsx`, `RevenueMetricModal.tsx`, `RevenueReservationList.tsx`, `RevenueDailyList.tsx`, `RevenueDailyDetailModal.tsx`, `revenue-styles.ts`/`revenue-chart-styles.ts` |
| `address/` | 고객 명단 | `AddressContent.tsx`, `AddressCustomerRow.tsx`, `AddressCustomerSummary.tsx`, `AddressCustomerRecharge.tsx` |
| `ui/` | 공통 UI | `Buttons.tsx`, `Icons.tsx`, `PageHero.tsx`, `SeoHead.tsx`, `ServiceChip.tsx`, `AssigneeLabel.tsx`/`ColorTag.tsx`(담당자 색상 배지), `LabelBadge.tsx`(tone×shape 배지), `ReservationStatusBadge.ts`(예약 상태 배지), `ReservationInfoCard.tsx`, `CsFooter.tsx`(고객센터 푸터 공통), `GuestNotice.tsx`, `FieldError.tsx`, `FormControls.ts` |
| `account/` | 계정 관련 모달 | `AccountDeleteModal.tsx` |

[^1]: 네이버 동기화 알림 벨 아이콘 + 알림 목록 패널. 미읽음 카운트는 `!read || (conflict && !confirmed)` 조건으로 계산. 알림에 박제된 고객명·담당자명은 `patchNotificationNames`(calendarStore)가 데이터 로드/변경 시 현재 이름과 다르면 자동 동기화(이름 변경 반영, 미배정은 '미지정')
[^2]: 네이버 예약 시간 중복(conflict) 해결 모달. pending → deferred/confirmed 상태 전이
[^3]: 동명이인·유사 고객 병합 제안 모달 (게스트 모드에서는 비활성)
[^3a]: 고객 상세의 하위 UI 분리 — 적립금 이력 아이템(`PointHistoryItem` 공용), 메모 태그 섹션, 이력 더보기 모달, 병합 분리 확인 모달
[^14]: Google/Kakao/Naver 계정 연결·해제. 타 계정 충돌 시 계정 병합(merge-preview→merge) 플로우 제공. 해제 확인 모달 포함
[^15]: `/settings/naver` 탭. Gmail 연동 상태(연동/해제/다른 계정으로 연동)·오너 권한 체크, 동기화 상태 표시, 수동 동기화 버튼, 연동 실패 안내 레이어
[^16]: 설정 공통 styled-components — `StyledSettingsCard`, `StyledSettingsCardTitle`, `StyledSettingsHint`, `StyledEditBtn`, `StyledSaveBtn`, `StyledCancelBtn`, `StyledDeleteBtn`, `StyledSelect`
[^17]: 멀티매장 전환 드롭다운. `/api/user/stores`로 멤버십 매장 목록 조회 → 선택 시 세션 `preferredStoreId` 갱신
[^18]: app 라우터에 `app/` 디렉터리(NextAuth route handler)가 있으면 잘못된 경로의 404를 app 라우터가 처리하므로, `app/not-found.tsx`(+최소 `app/layout.tsx`)에 디자인 가이드 동일 스타일 + 자동 리다이렉트를 구현. `pages/404.tsx`는 pages 라우터 폴백용으로 동일 UI 유지
[^19]: 약관 버전은 `utils/terms.ts`의 `CURRENT_TERMS_VERSION`(날짜 기반 `YYYY-MM-DD`)으로 관리. 동의 여부 판정 — 게스트: `getGuestTermsVersion()===CURRENT_TERMS_VERSION`(localStorage), 로그인: 세션 `termsVersion===CURRENT_TERMS_VERSION`. 미동의 시 게이트 노출, 동의 시 게스트는 localStorage(`setGuestTermsAgreed`)·로그인은 `POST /api/consent`(→ `User.agreedTermsVersion`/`agreedTermsAt` 갱신) 후 세션 갱신. `/consent/<경로>` 형태로 복귀 경로를 슬래시로 전달(`next.config.mjs` rewrite). Aside 하단에 이용약관/개인정보처리방침 링크 제공, 게스트 로그아웃 시 동의 플래그도 초기화. **동의 항목 구성** — 게스트: 이용약관 + 개인정보 수집·이용(서버 위탁 없음). 로그인(SNS 연동, 서버 보관): 위 2개 + **개인정보 처리위탁(DPA)** 별도 항목. 게스트가 SNS 연동한 경우는 이미 받은 동의는 건너뛰고 DPA만 `_app.tsx`의 앱 레벨 `ConsentDpaLayer`로 추가 수령. 각 항목 "보기"는 `PolicyViewLayer`로 표시
[^20]: **정책 문서 단일 소스 구조** — 법률 본문은 문서당 파일 하나(`content/policies/{terms,privacy,dpa}.ts`)에만 두고, 제목 메타는 `content/policies/index.ts` 레지스트리(`navTitle`/`docTitle`/`body`)로 관리. 이 본문을 **인라인 페이지**(`/terms`·`/privacy`·`/dpa` → `PolicyPage`)·**보기 레이어**(`PolicyViewLayer`)·**풀페이지**(`/policies/:slug` → `api/policies/[slug].ts`가 `renderPolicyHtml`로 독립 HTML 응답)가 모두 공유 → 한 곳만 고치면 전체 반영. 공통 CSS도 `components/policy/policyCss.ts`(`POLICY_VARS_*`·`POLICY_ELEMENT_CSS`)에서 styled-components(인라인)·`<style>`(풀페이지) 양쪽이 같은 문자열 사용. DPA는 서버 보관(수탁) 개시 시점에 필요하므로 SNS 연동(인증) 이후에만 노출
[^21]: 회원권 관리는 `Store.useMembershipSystem` 토글 ON일 때만 aside 메뉴·`/settings/membership` 탭 노출. 상품(횟수/기간권) CRUD + 고객 발급·수동 차감까지 구현(Phase 1·2). **결제 연동(예약 결제수단으로 자동 차감, `PaymentMethod.membership`)은 미구현(Phase 3 예정)**

### 도메인 모델 (`client/features/`)

| 파일 | 모델 | 핵심 필드 |
|------|------|----------|
| `reservations/model.ts` | `Reservation` | id, date, startTime/endTime, customerId, assigneeId?, service, status[^4], price, naverBookingId?, channel[^5] |
| `customers/model.ts` | `Customer` | id, name, tel, points, memoTags, pointHistories, allergyNote, claimNote, preferenceNote. 헬퍼: `formatTel`(표시 000-0000-0000)·`normalizeTel`(저장용 숫자만, 단일 출처) |
| `memberships/model.ts` | `MembershipProduct`/`CustomerMembership` | 회원권(횟수·기간권, 적립금과 별개). product: totalCount?/validDays?/price/status, 발급분: remainingCount/expiresAt?/status |
| `assignees/model.ts` | `Assignee` | id, name, schedule(7일), status[^6], color, phone |
| `services/model.ts` | `ServiceItem` | name, durationMinutes, category, price |
| `services/default-services.ts` | - | 업종(ShopType) union + 업종별 기본 서비스·카테고리 색상(Partial, 온보딩용) |
| `store-settings/model.ts` | `StoreSettings` | businessHours, closedDates, pointSettings(적립률, 충전규칙) |
| `store-settings/labels.ts` | - | 업종 마스터 목록·category별 표시어(담당자/서비스)·`getStoreLabels`/`sanitizeShopType` ([업종별 라벨](#업종별-라벨-담당자서비스-표시어)) |
| `local-db/storage.ts` | - | 게스트 모드 로컬 스냅샷 (`takeaseat.local-db.v1`). `shouldUseLocalDb()`로 모드 판정, 게스트 약관 동의 버전 헬퍼(`getGuestTermsVersion`/`setGuestTermsAgreed`) — `lib/local-db`로 re-export |

[^4]: status: `active` · `completed` · `cancelled` · `noshow`
[^5]: channel: `네이버예약` · `현장방문` · `전화예약`
[^6]: Assignee status: `재직` · `휴직` · `퇴직`

### 상태관리 (`client/store/`)

| 파일 | 역할 |
|------|------|
| `calendarStore.ts` | 메인 Zustand 스토어[^7]. 캘린더 상태, 예약/고객/담당자/서비스 데이터, UI 상태, 동기화 알림, 액션 메서드 모두 포함. `serviceCatalog`/`assignees` 초기값은 빈 배열(부팅 게이트와 연동) |
| `calendarStoreHelpers.ts` | 동기화 헬퍼 (데이터 fetch & store 갱신) |
| `calendarStoreAssigneeHelpers.ts` | 담당자 상태 빌더 (add, update, delete) |
| `calendarStoreReservationHelpers.ts` | 예약 상태 빌더 (reservationMap 조작) |
| `calendarStoreOverlayHelpers.ts` | 오버레이(모달) 상태 관리 |
| `calendarStoreServiceHelpers.ts` | 서비스 카탈로그 상태 빌더 + 서비스 변경(소요시간·가격·이름) 시 앞으로의 미결제 예약 일괄 반영(`buildServiceCatalogReservationUpdates`, 수동조정 건 보존) |
| `calendarStoreStoreSettingsHelpers.ts` | 매장 설정 상태 빌더 |
| `toastStore.ts` | 토스트 알림 |

[^7]: 주요 상태: `reservationMap`(날짜별 예약 맵), `customerMap`(ID별 고객), `assignees[]`, `serviceCatalog[]`, `storeSettings`, `syncNotifications[]`, `reservationHistory[]`

### 커스텀 훅 (`client/hooks/`)

| 파일 | 역할 |
|------|------|
| `useStoreLabels.ts` | 매장 업종(shopType)에 맞는 `{assignee, service}` 표시어 반환 (업종별 라벨) |
| `useNaverBookingSync.ts` | 네이버 예약 동기화[^8]. 자동 폴링, 중복 감지, 알림 생성, conflict 큐 관리 |
| `naverSyncConflictStorage.ts` | conflict 상태 localStorage 영속화 |
| `useCustomerMergeSuggestion.ts` | 동명이인·유사 고객 병합 제안 감지 (게스트 모드 제외) |
| `useRouteChangeSync.ts` | 라우트 변경 시 데이터 동기화 |
| `useIsomorphicEffect.tsx` | SSR 안전한 useEffect |

[^8]: 동기화 주기: 자동 폴링. Gmail에서 네이버 예약 메일 조회 → 파싱 → 예약 생성/취소. 알림은 localStorage `sync-notifications` 키에 저장 (최대 50개)

### 유틸리티 (`client/utils/`, `client/lib/`)

| 파일 | 역할 |
|------|------|
| `utils/reservations.ts` | 예약 헬퍼 (groupByDate, findOverlap 등) |
| `utils/customers.ts` | 고객 헬퍼 (toCustomerMap, syncFirstVisit) |
| `utils/assignees.ts` | 담당자 헬퍼 (re-export from features) |
| `utils/services.ts` | 서비스 헬퍼 (getServiceColor, sumPrice, calcEndTime) |
| `utils/revenue.ts` | 매출 계산 |
| `utils/revenue-export.ts` | 매출 Excel 내보내기 (xlsx) |
| `utils/calendarDerived.ts` | 캘린더 파생 상태 |
| `utils/timeRound.ts` | 시간 반올림 |
| `utils/timelineRange.ts` | 캘린더 시간축 범위 파생 (`getTimelineRange(viewType, businessHours)`: 영업시간 기준 floor/ceil, 0~24 클램프. 뷰별 패딩 `VIEW_PADDING_HOURS`는 현재 전부 0=영업시간 그대로). Timeline·TimelineTitle이 구독 |
| `utils/labels.ts` | 표시 라벨 공통 (`ROLE_LABELS` 오너/멤버, `PROVIDER_LABELS` Google/Kakao/Naver) |
| `utils/terms.ts` | 약관 동의 버전 상수 `CURRENT_TERMS_VERSION`(현재 `2026-06-16`) 정의 (게스트 동의 헬퍼는 `features/local-db/storage.ts`) |
| `lib/page-data.ts` | SSR 페이지 데이터 로딩 |
| `lib/local-db.ts` | 게스트 모드 로컬 DB (re-export from features) |
| `lib/authz.ts` | 권한 관리 |
| `lib/seo.ts` | SEO 상수 (`SITE_URL`, `SITE_TITLE`, OG/Twitter 메타값) |
| `lib/gmail-status.ts` | Gmail 연동 상태 조회 (`/api/gmail/status`, 페이지 로드당 1회 캐시) |
| `scripts/backfill-assignee-legacyid.mjs` | 담당자 null legacyId 백필 스크립트 (`--dry-run` 지원) |
| `scripts/recalc-reservation-endtimes.mjs` | 서비스 duration 변경 후 기존 예약 endTime 재계산 (매장별 카탈로그 기준, 기본 dry-run / `--apply`로 반영, 대상: active·미결제) |

### 인증 (`client/auth.ts`)

NextAuth 5.0 설정. Google·Kakao·Naver OAuth 지원.
- Google: 기본 스코프(openid email profile)만 사용 — **로그인 전용**. Gmail 권한은 별도 연동 플로우(`/api/gmail/connect`)에서 요청
- JWT 세션 전략
- 로그인 시 `syncAuthUser()`로 DB 사용자 동기화 + 초대 코드 처리
- 초대코드 없이 신규가입 시 새 매장(owner) 자동 생성 (`onboarded: false` — 이후 온보딩 진행)
- **계정 연동/병합**: 기존 로그인 상태에서 타 프로바이더 연결(`/api/account/link`). 해당 계정이 다른 유저 소유면 `pendingMerge`를 세션에 실어 병합 플로우(merge-preview → merge) 유도
- **멀티매장**: `preferredStoreId`(세션 update로 갱신) 기반으로 `resolveUserMembership()`이 활성 매장 결정. jwt 콜백이 매 요청 `role`/`storeId`/`onboarded`를 DB에서 재조회
- `authorized` 콜백: `loginError='no-account'` 시 `/login`으로 리다이렉트
- **약관 동의 게이트**: jwt 콜백이 매 요청 `User.agreedTermsVersion`을 `token.termsVersion`으로 노출. `CURRENT_TERMS_VERSION`(`utils/terms.ts`)과 불일치 시 `/consent`에서 재동의 유도 (게스트는 localStorage 기반)

### 부팅/마이그레이션 (`client/pages/_app.tsx`)

- **부팅 게이트**: 서비스·담당자·예약 3종 데이터가 준비될 때까지 전체 오버레이로 가림 (새로고침 시 기본값 플래시 방지). 로그인/온보딩 페이지는 제외
- **게스트 → 서버 마이그레이션**: 인증 후 로컬 스냅샷에 데이터가 있으면 `/api/migrate-local` POST (owner만). **단, `termsVersion===CURRENT_TERMS_VERSION`(DPA 등 동의 기록 완료) 이후에만 실행** — 수탁자(서버) 저장 전에 위탁계약 동의가 선행되도록 보장. 성공 또는 409(이미 설정된 매장) 시 재시도 중단. 전체 데이터 병합 플로우는 `plan.md` 참고
- **앱 레벨 DPA 동의 레이어**: 게스트 동의 보유자가 SNS 연동했고 DB 동의 기록만 없으면(`/consent` 우회 케이스) 앱 위에 `ConsentDpaLayer` 노출 → `POST /api/consent` 후 마이그레이션 진행

---

## 백엔드 API

### 데이터 API (`server/api/` — `client/pages/api/*`에서 re-export)

| 파일 | 엔드포인트 | 메서드 | 권한 | 설명 |
|------|-----------|-------|------|------|
| `reservations.ts` | `/api/reservations` | GET/POST/PUT/PATCH(staff) / DELETE(manager) | - | 예약 CRUD + 상태 변경. legacyId↔CUID 변환. 신규/취소/노쇼/삭제/변경 시 Slack 알림(`notifySlackForStore`). DELETE=영구삭제(매니저 이상) |
| `customers.ts` | `/api/customers` | GET/PUT/POST(staff) / DELETE(owner) | - | GET 조회, PUT 다건 upsert, **POST 단건 저장(신규 고객→예약 레이스 방지)**, DELETE 고객 영구삭제(예약·적립금 cascade, 오너 전용) |
| `customers-merge.ts` | `/api/customers/merge` | POST | staff | 고객 병합 (예약·포인트·태그 이전) |
| `customers-unmerge.ts` | `/api/customers/unmerge` | POST | staff | 병합 해제 (이력 기반 복원) |
| `customers-merge-history.ts` | `/api/customers/merge-history` | GET | staff | 병합 이력 조회 |
| `assignees.ts` | `/api/assignees` | GET(staff) / PUT(owner) / DELETE(owner) | - | 담당자 CRUD + 일정(AssigneeSchedule) upsert. DELETE는 영구 삭제(분리): 예약은 assigneeId=null로 보존, 스케줄은 cascade 삭제 |
| `assignees-merge.ts` | `/api/assignees/merge` | POST | owner | 담당자 병합 (source→target 예약 재배정 후 source 삭제) |
| `services.ts` | `/api/services` | GET(staff) / PUT(owner) | - | 서비스 카탈로그 관리 |
| `store.ts` | `/api/store` | GET(staff) / PUT(owner) | - | 매장 설정 (영업시간, 휴무일, 포인트 설정, 업종, **적립금/회원권 시스템 토글** `usePointSystem`/`useMembershipSystem`) |
| `memberships.ts` | `/api/memberships` | GET(staff) / POST·PUT·DELETE(owner) | - | 회원권 상품(횟수/기간권) CRUD + 보유 목록 조회 |
| `membership-issue.ts` | `/api/membership-issue` | POST(staff) | - | 고객에게 회원권 발급/취소 (상품 스냅샷 → CustomerMembership) |
| `membership-use.ts` | `/api/membership-use` | POST(staff) | - | 회원권 횟수 수동 차감/복원 (결제 흐름과 독립, MembershipUsage 기록) |
| `onboarding.ts` | `/api/onboarding` | POST | owner | 매장 초기 설정 (legacyId 부여). **이미 담당자/서비스가 있으면 409 `ALREADY_SETUP` 거부** |
| `migrate-local.ts` | `/api/migrate-local` | POST | owner | 게스트 로컬 데이터 전체 이전 (services/assignees/customers/reservations). 기존 데이터 있으면 409 + `confirm` 플래그로 병합 진행 |
| `naver-booking-sync.ts` | `/api/naver-booking-sync` | POST | owner | 네이버 예약 동기화[^9] |
| `naver-booking-fix-assignee.ts` | `/api/naver-booking-fix-assignee` | POST | owner | naverBookingId로 Gmail 검색 → 담당자 매칭 수정[^10] |
| `inquiry.ts` | `/api/inquiry` | POST | - | 문의 전송 (`server/api/mail/send-inquiry.ts`) |
| `consent.ts` | `/api/consent` | POST | 로그인 | 약관 동의 기록 (`agreedTermsVersion`=`CURRENT_TERMS_VERSION`, `agreedTermsAt`) |
| `backfill-point-relations.ts` | `/api/backfill-point-relations` | POST | - | 포인트 이력-예약 관계 백필 |
| `backfill-reservation-prices.ts` | `/api/backfill-reservation-prices` | POST | - | 예약 가격 백필 |
| `test-mode.ts` | `/api/test-mode` | POST | - | 테스트 모드 토글 |

### 계정·멤버 API (`server/api/account/`, `server/api/user/`, `server/api/{members,invites}.ts`)

| 엔드포인트 | 메서드 | 권한 | 설명 |
|-----------|-------|------|------|
| `/api/members` | GET/PATCH/DELETE | owner | 멤버 조회·역할 변경·제거 |
| `/api/invites` | GET/POST/DELETE | owner | 초대 코드 생성·조회·취소 (역할: owner/manager/staff) |
| `/api/account/link` | POST | 로그인 | 타 프로바이더 계정 연결 |
| `/api/account/linked` | GET | 로그인 | 연결된 프로바이더 목록 |
| `/api/account/unlink` | DELETE | 로그인 | 프로바이더 연결 해제 (마지막 계정 해제 시 로그아웃) |
| `/api/account/merge-preview` | GET | 로그인 | 계정 병합 미리보기 (충돌 유저의 멤버십 목록) |
| `/api/account/merge` | POST | 로그인 | 계정 병합 (AuthAccount·Membership 이전, 동일 매장은 상위 역할 유지) |
| `/api/account/delete` | DELETE | 로그인 | 회원탈퇴 |
| `/api/user/stores` | GET | 로그인 | 멤버십 매장 목록 (StoreSwitcher용) |
| `/api/user/nickname` | - | 로그인 | 닉네임 변경 (중복체크) |

[^9]: Gmail에서 `from:naverbooking_noreply@navercorp.com` 메일 조회 → 파싱 → 예약 생성. 담당자 매칭은 이름 부분매칭(`findByNameContains`), 미매칭 시 고유 컬러로 자동 생성. 중복 예약은 naverBookingId unique 제약으로 스킵하되, assigneeId가 null이면 재매칭 시도
[^10]: 시간 필터 없이 Gmail에서 특정 예약번호 검색. 기존 동기화에서 담당자 매칭 실패한 건을 사후 수정할 때 사용

### Gmail 연동 (`server/api/gmail/`)

| 파일 | 역할 |
|------|------|
| `gmail-client.ts` | Gmail API 클라이언트[^11]. 이메일 목록 조회(`listNaverBookingEmails`), 본문 조회(`getEmailContent`) |
| `naver-booking-parser.ts` | 네이버 예약 이메일 HTML 파싱[^12]. `NaverBookingData` 추출 (bookingId, customerName, assigneeName, date/time, services, deposit) |
| `token-manager.ts` | Gmail 연동 토큰 관리 (**GmailConnection** 테이블, **매장(storeId) 단위** — 한 오너가 연결하면 그 매장 모든 오너가 공유, `connectedByUserId`로 연결자 기록). 만료 시 refreshToken으로 자동 갱신 |
| `connect.ts` | `/api/gmail/connect` (GET, owner) — Google OAuth 시작. 계정 선택 화면 강제(로그인 계정과 다른 Gmail 사용 가능) |
| `oauth-callback.ts` | `/api/gmail/oauth-callback` (GET) — 코드 교환 → GmailConnection upsert. 실패 시 `/settings/naver?gmail=error&reason=…`로 리다이렉트 |
| `status.ts` | `/api/gmail/status` (GET, owner) — 매장 연동 여부·연동 이메일 |
| `disconnect.ts` | `/api/gmail/disconnect` (POST, owner) — 연동 해제 |
| `helpers.ts` | 네이버 결제 방법 매핑, 종료시간 계산, 동기화 타임스탬프(매월 1일부터) |

[^11]: Rate limiting: 429 응답 시 15분 쿨다운. 배치 fetch (`EMAIL_FETCH_CONCURRENCY = 10`)
[^12]: `extractLabelValue(html, '예약상품')` → 담당자명, `extractLabelValue(html, '예약자명')` → 고객명. `parseServices(html)` → 시술 목록·예약금

### 인증·권한 (`server/auth/`)

| 파일 | 역할 |
|------|------|
| `api-session.ts` | API 요청에서 세션 추출 (`getApiSession`), 역할 검증 (`requireRole`) |
| `roles.ts` | 역할 3단계: **owner(오너) > manager(매니저) > staff(멤버)**. ROLE_PRIORITY로 비교. manager=운영+예약삭제, 초대·네이버·멤버·설정·고객삭제는 owner 전용 |
| `sync-auth-user.ts` | OAuth 로그인 후 DB User/AuthAccount 동기화. 계정 연결(linkUserId)·병합 충돌(pendingMerge) 처리. 초대코드 없이 신규가입 시 매장+owner 자동 생성 |
| `invite.ts` | 초대 코드 생성·검증·사용 |
| `resolve-user-membership.ts` | 사용자의 매장 멤버십 해석 (preferredStoreId 우선, 복수 매장 시 우선순위) |

### DB (`server/db/`)

| 파일 | 역할 |
|------|------|
| `prisma.ts` | Prisma 클라이언트 싱글턴 (PrismaPg driver adapter 사용) |
| `mappers.ts` | DB ↔ 프론트엔드 변환 함수[^13] |

[^13]: `dbReservationToFrontend()`, `dbCustomerToFrontend()`, `dbAssigneeToFrontend()`, `dbServiceToFrontend()`, `dbStoreToFrontend()` 등. legacyId(number) ↔ CUID(string) 변환 포함. `legacyId`가 null이면 프론트 id가 깨지므로 생성 시 반드시 부여할 것

---

## DB 스키마 (`server/prisma/schema.prisma`) + Prisma 설정

- **Prisma 7**: `prisma-client` generator, output은 `client/prisma/generated/prisma` (빌드 산출물이라 패키지 루트인 client 내부에 유지), `importFileExtension = "ts"`(생성 파일이 `.ts` 확장자), driver adapter 필수
- **`client/prisma.config.ts`**: datasource URL, migration 경로, seed 명령 설정 (dotenv로 환경변수 로드). schema/migrations/seed/seed-data는 `server/prisma/`를 가리킴 (Prisma CLI는 client에서 실행)
- **`@prisma/adapter-pg`**: PostgreSQL driver adapter (`server/db/prisma.ts`·seed 스크립트에서 `PrismaPg` 사용)
- import 경로: `../../client/prisma/generated/prisma/client` (generated 클라이언트)
- **마이그레이션**: `server/prisma/migrations/`. 빈 DB에서도 `prisma migrate deploy`로 전체 재생 가능(히스토리/`db push` 드리프트는 `202606120002_replay_drift_repair`가 멱등 구문으로 보정). 배포는 `pnpm prisma:deploy`, 시드는 `pnpm prisma:seed`(→`server/prisma/seed.mjs`)
- **PostgreSQL 12+ 필요**: 일부 마이그레이션이 트랜잭션 내 `ALTER TYPE ... ADD VALUE IF NOT EXISTS` 사용

### 핵심 모델 관계

```
Store ─┬── Customer ──── Reservation ──── ReservationPaymentEntry
       │       │              │
       │       ├── CustomerMemoTag    ├── ReservationHistory
       │       └── CustomerPointHistory
       │
       ├── Assignee ──── AssigneeSchedule
       │       └──────── Reservation (optional)
       │
       ├── Service
       ├── MembershipProduct ─┬─ MembershipProductService (N:N Service)
       │       └── CustomerMembership ── MembershipUsage
       ├── CouponProduct ──── CustomerCoupon
       ├── Membership ── User ──┬─ AuthAccount (1유저 N프로바이더)
       │                          └─ GmailConnection (1유저 1연동, 로그인 계정과 분리)
       ├── StoreBusinessHour (7일)
       ├── StoreClosedDate
       ├── StorePointSettings
       └── Invite
```

> **Store 기능 토글**: `usePointSystem`/`useMembershipSystem`/`useCouponSystem`(모두 `@default(false)`). 적립금·회원권은 토글 → aside 메뉴/페이지까지 연동 완료. **쿠폰은 DB 모델(`CouponProduct`/`CustomerCoupon`, 마이그레이션 `0007`)과 토글 컬럼만 존재 — API·UI·토글 배선·`PaymentMethod.coupon`은 미구현(예정).**
> **결제 연동 현황**: `PaymentMethod` enum엔 아직 `membership`·`coupon` 없음 → 회원권·쿠폰 모두 **예약 결제수단 차감(각 Phase 3) 미구현**. 회원권 차감은 현재 `membership-use`(수동)만.

### 주요 Enum

| Enum | 값 |
|------|---|
| `MembershipRole` | owner, manager, staff (`0003_membership_role_manager`에서 manager 재추가 — 운영 등급) |
| `ReservationStatus` | active, completed, cancelled, noshow |
| `ReservationChannel` | naver, walk_in, phone |
| `AssigneeStatus` | active, on_leave, resigned |
| `PaymentMethod` | cash, cash_receipt, card, naver_pay, local_currency, local_currency_receipt, voucher, points, discount, naver_deposit |
| `PointHistoryType` | manual_add, manual_subtract, recharge, payment_use, payment_earn, payment_adjust |

### ID 체계

- DB 내부: CUID (`cuid()`) - `id` 필드
- 프론트엔드: `legacyId` (Int) - 사용자에게 노출되는 번호. **생성 시 반드시 부여** (null이면 프론트에서 선택·수정 불가)
- 네이버: `naverBookingId` (String) - 네이버 예약 고유번호
- Unique 제약: `[storeId, legacyId]`, `[storeId, naverBookingId]`

---

## 주요 기능 흐름 요약

### 네이버 예약 동기화

```
Gmail (네이버 예약 메일)
  → gmail-client.ts (조회)
  → naver-booking-parser.ts (파싱)
  → naver-booking-sync.ts (DB 저장)
    ├─ 신규: 고객 생성 + 담당자 매칭(이름) + 예약 생성
    ├─ 중복: assigneeId null이면 재매칭, serviceSummary/URL 업데이트
    └─ 취소: 상태 → cancelled
  → useNaverBookingSync.ts (알림 생성 + 중복 감지)
  → NaverSyncNotification.tsx (UI 표시)
```

### 고객 병합

```
useCustomerMergeSuggestion.ts (동명이인 감지, 게스트 모드 제외)
  → CustomerMergeSuggestionModal.tsx (제안 UI)
  → /api/customers/merge (병합 실행)
    └─ 트랜잭션: 예약·포인트·태그 이전 + 이력 기록 + 원본 삭제
  → /api/customers/unmerge (병합 해제 가능)
```

### 계정 병합 (SNS 연결 충돌)

```
로그인 상태에서 타 프로바이더 연결 시도 (/settings/sns)
  → 해당 계정이 다른 유저 소유 → 세션에 pendingMerge
  → /api/account/merge-preview (충돌 유저의 멤버십 미리보기)
  → /api/account/merge (AuthAccount·Membership 이전, 동일 매장은 상위 역할 유지)
```

### 게스트 → SNS 연동 (데이터 마이그레이션)

```
게스트 사용 (localStorage 'takeaseat.local-db.v1'에 데이터 저장)
  → SNS 로그인 → syncAuthUser(): 새 User + Store(onboarded: true) + owner 생성
  → DPA 동의 선행: 앱 레벨 ConsentDpaLayer → POST /api/consent → termsVersion 기록 (이 전엔 마이그레이션 보류)
  → _app.tsx에서 로컬 데이터 감지 → POST /api/onboarding (owner만)
    ├─ 빈 매장(200): 서비스·담당자·매장명 이전 → onboarded 플래그 해제
    └─ 기존 데이터 매장(409): 자동 이전 중단
  → 전체 데이터(고객·예약 포함) 병합: /api/migrate-local + 담당자 병합(/api/assignees/merge)
    (확인 레이어 → append(ID remap) → 담당자/고객 병합 → 로컬 정리. 상세는 plan.md)
```

### 약관 동의 게이트

```
CURRENT_TERMS_VERSION (utils/terms.ts, 날짜 버전)
  → 로그인: 세션 termsVersion vs CURRENT  /  게스트: localStorage 동의 버전 vs CURRENT
  → 불일치 → /consent (동의 화면)
    ├─ 게스트: 이용약관 + 개인정보 수집·이용 → setGuestTermsAgreed(localStorage) → 복귀
    └─ 로그인: 위 2개 + 개인정보 처리위탁(DPA, 서버 보관) → POST /api/consent → 세션 갱신 → 복귀
  → 게스트가 SNS 연동(쿠키 보유 → /consent 우회): _app.tsx 앱 레벨 ConsentDpaLayer로 DPA만 추가 수령
  → 각 항목 "보기"는 PolicyViewLayer(공통 레이어). 본문은 content/policies 단일 소스
  → 약관 개정 시 상수 값만 올리면 전체 사용자 재동의
```

### 적립금

```
StorePointSettings (적립률, 충전규칙)
  → 결제 완료 시 자동 적립 (serviceRate%)
  → 충전 시 보너스 적용 (rechargeRules)
  → CustomerPointHistory로 이력 기록
  → points로 결제 가능 (PaymentMethod.points)
```

### 업종별 라벨 (담당자/서비스 표시어)

매장의 업종(`Store.shopType`)에 따라 "담당자"·"서비스" 표시어가 화면에서 자동으로 바뀐다.

- **출처**: `client/features/store-settings/labels.ts` — 업종 마스터 목록(`SHOP_INDUSTRIES`), category별 표시어(`CATEGORY_LABELS`), `getStoreLabels(shopType)`, 저장 정규화 `sanitizeShopType()`(콤마조인·유효값 필터, 서버 onboarding·migrate-local·store PATCH 공용).
- **소비**: `client/hooks/useStoreLabels.ts` 의 `useStoreLabels()` → `{assignee, service}`. 컴포넌트는 하드코딩 "담당자/서비스" 대신 이 값을 쓴다.
- **변경 위치**: 설정 → 매장 관리 → "매장 정보" 수정 → **업종** 셀렉트(category별 optgroup). 다중 업종(콤마)인 경우 첫 업종의 category로 라벨 결정.
- **참고**: 약관·개인정보·소개 등의 "서비스"는 *앱 자체* 를 뜻하므로 라벨 치환 대상이 아니다.

| category | 업종(예) | 담당자 라벨 | 서비스 라벨 |
|----------|---------|------------|------------|
| beauty | 헤어/네일/왁싱/속눈썹/피부/메이크업/반영구 | 담당자 | 서비스 |
| food | 음식점/카페/주점·바 | 테이블 | 메뉴 |
| medical | 병원·의원/치과/한의원/동물병원 | 담당의 | 진료 |
| fitness | 헬스·PT/요가·필라테스/골프/댄스 | 강사 | 수업 |
| class | 학원/공방·클래스/과외 | 선생님 | 수업 |
| pet | 애견미용 | 담당자 | 서비스 |
| repair | 세차/정비·수리 | 기사 | 작업 |
| space | 공간대여/연습실 | 룸 | 이용 |
| counsel | 상담 | 상담사 | 상담 |
| etc | 기타 | 담당자 | 서비스 |

> 적용 범위: aside 메뉴·담당자 관리·서비스 관리 등 운영 화면(예약 폼·캘린더·매출 포함, 단계적 확대). 기존 뷰티 매장은 표시어 변화 없음(담당자/서비스 유지).

---

## 권한 모델 요약

| 역할 | UI 라벨 | 데이터 조회 | 예약 추가·수정·취소 | 예약 삭제 | 고객 추가·수정 | 고객 삭제 | 매장·서비스·담당자 설정 | 멤버·초대·네이버연동 |
|------|--------|-----------|-----------|---------|------------|---------|------------------------|-------------------|
| owner | 오너 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | 매니저 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (403) | ❌ |
| staff | 멤버 | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ (403) | ❌ |
| 게스트 | - | 로컬 전용 | 로컬 전용 | 로컬 전용 | 로컬 전용 | 로컬 전용 | 로컬 전용 | ❌ |

- Aside 설정 메뉴: 오너=전체, 매니저·멤버(비오너)=고객 명단·계정 관리만(동일 아코디언), 게스트=멤버 관리 제외
- manager = staff + 예약 영구삭제. owner = manager + 고객삭제·매장설정·멤버·초대·네이버연동

---

## 환경 설정

| 파일 | 설명 |
|------|------|
| `.env.local` | 환경변수 (DATABASE_URL, DIRECT_URL, AUTH_SECRET, OAuth 키, `SLACK_WEBHOOK_URL`(+`_DEV`)[biz 채널: 예약·문의], `SLACK_STORE_ID`[지정 매장만 biz 알림], `SLACK_WEBHOOK_URL_OPS`(+`_DEV`)[ops 채널: 서버 에러·동기화 실패 등 운영 알림]) |
| 마이그레이션 | 운영: `prisma migrate deploy`는 DIRECT_URL(운영) 사용. **로컬은 `pnpm prisma:migrate:local`**(localhost 강제, `client/scripts/migrate-local.sh`) — 운영 실수 방지 |
| `next.config.mjs` | URL 리라이트(/day/\*/week/\* → /, /consent/\*, /policies/:slug → /api/policies/:slug), styled-components, Turbopack |
| `client/proxy.ts` | NextAuth 미들웨어 (온보딩 리다이렉트) |
| `client/prisma.config.ts` | Prisma 7 설정 (datasource URL, migration, seed) |
| `tsconfig.json` | ES2017, strict, path aliases |
| `package.json` | dev/build 스크립트, 의존성 |
