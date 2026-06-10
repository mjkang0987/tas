# Take a Seat (TAS) - 프로젝트 인덱스

> 헤어살롱 예약 관리 시스템. Next.js 16 + React 19 + Prisma + PostgreSQL + Zustand

---

## 디렉토리 구조

```
hair_reservations/
├── client/          # 프론트엔드 (Next.js 앱)
├── server/          # 백엔드 (API + DB + Auth)
├── docs/            # 문서
├── CLAUDE.md        # 커밋 컨벤션 (한글, feat:/fix:/refactor: 등, 커밋 시 푸시 포함)
└── index.md         # 이 파일
```

---

## 프론트엔드 (`client/`)

### 페이지 라우팅 (`client/pages/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `index.tsx` | 메인 캘린더 (SSR, `getServerSideProps`로 예약·고객·이력 초기 로드) |
| `/login` | `login.tsx` | 로그인 (Google, Kakao, Naver OAuth) |
| `/logout` | `logout.tsx` | 로그아웃 후 `/login`으로 리다이렉트 |
| `/mypage` | `mypage.tsx` | 계정 관리 (프로필, 로그아웃, 회원탈퇴) |
| `/settings` | `settings.tsx` | 설정 메인 (탭: revenue/store/service/designer/point/member/sns/naver) |
| `/settings/[tab]` | `settings/[tab].tsx` | 탭별 설정 URL 라우팅 |
| `/address` | `address.tsx` | 고객 주소록 |
| `/onboarding` | `onboarding.tsx` | 신규 매장 초기 설정 (매장명, 영업시간, 디자이너, 서비스) |
| `/inquiry` | `inquiry.tsx` | 고객센터 문의·이력 조회 |

### 컴포넌트 (`client/components/`)

| 폴더 | 역할 | 주요 파일 |
|------|------|----------|
| `calendar/views/` | 캘린더 뷰 (일/주/월/년/타임라인) | `Calendar.tsx`, `Day.tsx`, `Week.tsx`, `Month.tsx`, `Timeline.tsx` |
| `calendar/overlays/` | 예약 생성·상세·수정 모달 | `ReservationCreate.tsx`, `ReservationDetail.tsx`, `ReservationDetailSections.tsx`, `CustomerDetail.tsx` |
| `calendar/service/` | 서비스 범례·필드 | `ServiceLegend.tsx`, `ServiceFields.tsx` |
| `layout/` | 공통 레이아웃 | `Header.tsx`, `Aside.tsx`, `LayoutComponent.tsx`, `NaverSyncNotification.tsx`[^1], `NaverSyncConflictModal.tsx`[^2], `CustomerMergeSuggestionModal.tsx`[^3] |
| `settings/` | 설정 화면 섹션 | `StoreManageSection.tsx`, `ServiceManageSection.tsx`, `DesignerManageSection.tsx`, `PointManageSection.tsx`, `MemberSection.tsx`, `SNSLinkingSection.tsx`[^14], `NaverBookingSection.tsx`[^15], `settings-styles.ts`[^16] |
| `settings/revenue/` | 매출 관리 | `RevenueSection.tsx`, `RevenueChartGrid.tsx`, `RevenueDailyList.tsx`, `RevenueDailyDetailModal.tsx` |
| `address/` | 고객 주소록 | `AddressContent.tsx`, `AddressCustomerRow.tsx`, `AddressCustomerSummary.tsx`, `AddressCustomerRecharge.tsx` |
| `ui/` | 공통 UI | `Buttons.tsx`, `Icons.tsx`, `PageHero.tsx`, `SeoHead.tsx`, `ServiceChip.tsx`, `DesignerLabel.tsx`, `ReservationInfoCard.tsx`, `GuestNotice.tsx`, `FieldError.tsx` |
| `account/` | 계정 관련 모달 | `AccountDeleteModal.tsx` |

[^1]: 네이버 동기화 알림 벨 아이콘 + 알림 목록 패널. 미읽음 카운트는 `!read || (conflict && !confirmed)` 조건으로 계산
[^2]: 네이버 예약 시간 중복(conflict) 해결 모달. pending → deferred/confirmed 상태 전이
[^3]: 동명이인·유사 고객 병합 제안 모달
[^14]: Google/Kakao/Naver 계정 연결·해제. 타 계정 충돌 시 `sessionStorage('tas-link-attempt')` 감지로 에러 안내. 해제 확인 모달 포함
[^15]: `/settings/naver` 탭. Google 연동 여부·역할 체크, 동기화 상태 표시, 수동 동기화 버튼
[^16]: 설정 공통 styled-components — `StyledSettingsCard`, `StyledSettingsCardTitle`, `StyledSettingsHint`, `StyledEditBtn`, `StyledSaveBtn`, `StyledCancelBtn`, `StyledDeleteBtn`

### 도메인 모델 (`client/features/`)

| 파일 | 모델 | 핵심 필드 |
|------|------|----------|
| `reservations/model.ts` | `Reservation` | id, date, startTime/endTime, customerId, designerId?, service, status[^4], price, naverBookingId?, channel[^5] |
| `customers/model.ts` | `Customer` | id, name, tel, points, memoTags, pointHistories, allergyNote, claimNote, preferenceNote |
| `designers/model.ts` | `Designer` | id, name, schedule(7일), status[^6], color, phone |
| `services/model.ts` | `ServiceItem` | name, durationMinutes, category, price |
| `store-settings/model.ts` | `StoreSettings` | businessHours, closedDates, pointSettings(적립률, 충전규칙) |
| `local-db/storage.ts` | - | 테스트/오프라인 모드용 로컬 스냅샷 데이터 |

[^4]: status: `active` · `completed` · `cancelled` · `noshow`
[^5]: channel: `네이버예약` · `현장방문` · `전화예약`
[^6]: Designer status: `재직` · `휴직` · `퇴직`

### 상태관리 (`client/store/`)

| 파일 | 역할 |
|------|------|
| `calendarStore.ts` | 메인 Zustand 스토어[^7]. 캘린더 상태, 예약/고객/디자이너/서비스 데이터, UI 상태, 동기화 알림, 액션 메서드 모두 포함 |
| `calendarStoreHelpers.ts` | 동기화 헬퍼 (데이터 fetch & store 갱신) |
| `calendarStoreDesignerHelpers.ts` | 디자이너 상태 빌더 (add, update, delete) |
| `calendarStoreReservationHelpers.ts` | 예약 상태 빌더 (reservationMap 조작) |
| `calendarStoreOverlayHelpers.ts` | 오버레이(모달) 상태 관리 |
| `calendarStoreServiceHelpers.ts` | 서비스 카탈로그 상태 빌더 |
| `calendarStoreStoreSettingsHelpers.ts` | 매장 설정 상태 빌더 |

[^7]: 주요 상태: `reservationMap`(날짜별 예약 맵), `customerMap`(ID별 고객), `designers[]`, `serviceCatalog[]`, `storeSettings`, `syncNotifications[]`, `reservationHistory[]`

### 커스텀 훅 (`client/hooks/`)

| 파일 | 역할 |
|------|------|
| `useNaverBookingSync.ts` | 네이버 예약 동기화[^8]. 자동 폴링, 중복 감지, 알림 생성, conflict 큐 관리 |
| `useCustomerMergeSuggestion.ts` | 동명이인·유사 고객 병합 제안 감지 |
| `useRouteChangeSync.ts` | 라우트 변경 시 데이터 동기화 |
| `useIsomorphicEffect.tsx` | SSR 안전한 useEffect |

[^8]: 동기화 주기: 자동 폴링. Gmail에서 네이버 예약 메일 조회 → 파싱 → 예약 생성/취소. 알림은 localStorage `sync-notifications` 키에 저장 (최대 50개)

### 유틸리티 (`client/utils/`, `client/lib/`)

| 파일 | 역할 |
|------|------|
| `utils/reservations.ts` | 예약 헬퍼 (groupByDate, findOverlap 등) |
| `utils/customers.ts` | 고객 헬퍼 (toCustomerMap, syncFirstVisit) |
| `utils/designers.ts` | 디자이너 헬퍼 (re-export from features) |
| `utils/services.ts` | 서비스 헬퍼 (getServiceColor, sumPrice, calcEndTime) |
| `utils/revenue.ts` | 매출 계산 |
| `utils/revenue-export.ts` | 매출 Excel 내보내기 (xlsx) |
| `utils/calendarDerived.ts` | 캘린더 파생 상태 |
| `utils/timeRound.ts` | 시간 반올림 |
| `lib/page-data.ts` | SSR 페이지 데이터 로딩 |
| `lib/local-db.ts` | 테스트 모드 로컬 DB |
| `lib/authz.ts` | 권한 관리 |
| `lib/seo.ts` | SEO 상수 (`SITE_URL`, `SITE_TITLE`, OG/Twitter 메타값) |

### 인증 (`client/auth.ts`)

NextAuth 5.0 설정. Google·Kakao·Naver OAuth 지원.
- Google: `openid email profile gmail.readonly` 스코프 (Gmail API용)
- JWT 세션 전략
- 로그인 시 `syncAuthUser()`로 DB 사용자 동기화 + 초대 코드 처리

---

## 백엔드 (`server/`)

### API 엔드포인트 (`server/api/`)

| 파일 | 엔드포인트 | 메서드 | 권한 | 설명 |
|------|-----------|-------|------|------|
| `reservations.ts` | `/api/reservations` | GET/POST/PUT/PATCH | staff | 예약 CRUD + 상태 변경. legacyId↔CUID 변환 |
| `customers.ts` | `/api/customers` | GET/PUT | staff | 고객 조회·수정, 포인트 동기화 |
| `customers-merge.ts` | `/api/customers/merge` | POST | staff | 고객 병합 (예약·포인트·태그 이전) |
| `customers-unmerge.ts` | `/api/customers/unmerge` | POST | staff | 병합 해제 (이력 기반 복원) |
| `customers-merge-history.ts` | `/api/customers/merge-history` | GET | staff | 병합 이력 조회 |
| `designers.ts` | `/api/designers` | GET/PUT | staff/manager | 디자이너 CRUD + 일정(DesignerSchedule) upsert |
| `services.ts` | `/api/services` | GET/PUT | staff/manager | 서비스 카탈로그 관리 |
| `store.ts` | `/api/store` | GET/PUT | staff/manager | 매장 설정 (영업시간, 휴무일, 포인트 설정) |
| `naver-booking-sync.ts` | `/api/naver-booking-sync` | POST | manager | 네이버 예약 동기화[^9] |
| `naver-booking-fix-designer.ts` | `/api/naver-booking-fix-designer` | POST | manager | naverBookingId로 Gmail 검색 → 디자이너 매칭 수정[^10] |
| `members.ts` | `/api/members` | GET/POST/DELETE | owner | 멤버(직원) 관리, 역할 변경 |
| `invites.ts` | `/api/invites` | GET/POST | owner | 초대 코드 생성·조회 |
| `inquiry.ts` | `/api/inquiry` | POST | - | 문의 전송 |
| `backfill-point-relations.ts` | `/api/backfill-point-relations` | POST | - | 포인트 이력-예약 관계 백필 |
| `test-mode.ts` | `/api/test-mode` | POST | - | 테스트 모드 토글 |

[^9]: Gmail에서 `from:naverbooking_noreply@navercorp.com` 메일 조회 → 파싱 → 예약 생성. 디자이너 매칭은 이름 부분매칭(`findByNameContains`). 중복 예약은 naverBookingId unique 제약으로 스킵하되, designerId가 null이면 재매칭 시도
[^10]: 시간 필터 없이 Gmail에서 특정 예약번호 검색. 기존 동기화에서 디자이너 매칭 실패한 건을 사후 수정할 때 사용

### Gmail 연동 (`server/api/gmail/`)

| 파일 | 역할 |
|------|------|
| `gmail-client.ts` | Gmail API 클라이언트[^11]. 이메일 목록 조회(`listNaverBookingEmails`), 본문 조회(`getEmailContent`) |
| `naver-booking-parser.ts` | 네이버 예약 이메일 HTML 파싱[^12]. `NaverBookingData` 추출 (bookingId, customerName, designerName, date/time, services, deposit) |
| `token-manager.ts` | Google OAuth 토큰 관리. 만료 시 refreshToken으로 자동 갱신 |
| `helpers.ts` | 네이버 결제 방법 매핑, 종료시간 계산, 동기화 타임스탬프(매월 1일부터) |

[^11]: Rate limiting: 429 응답 시 15분 쿨다운. 배치 fetch (`EMAIL_FETCH_CONCURRENCY = 10`)
[^12]: `extractLabelValue(html, '예약상품')` → 디자이너명, `extractLabelValue(html, '예약자명')` → 고객명. `parseServices(html)` → 시술 목록·예약금

### 인증·권한 (`server/auth/`)

| 파일 | 역할 |
|------|------|
| `api-session.ts` | API 요청에서 세션 추출 (`getApiSession`), 역할 검증 (`requireRole`) |
| `roles.ts` | 역할 우선순위: owner > manager > staff |
| `sync-auth-user.ts` | OAuth 로그인 후 DB User/AuthAccount 동기화 |
| `invite.ts` | 초대 코드 생성·검증·사용 |
| `resolve-user-membership.ts` | 사용자의 매장 멤버십 해석 (복수 매장 시 우선순위) |

### DB (`server/db/`)

| 파일 | 역할 |
|------|------|
| `prisma.ts` | Prisma 클라이언트 싱글턴 |
| `mappers.ts` | DB ↔ 프론트엔드 변환 함수[^13] |

[^13]: `dbReservationToFrontend()`, `dbCustomerToFrontend()`, `dbDesignerToFrontend()`, `dbServiceToFrontend()`, `dbStoreToFrontend()` 등. legacyId(number) ↔ CUID(string) 변환 포함

---

## DB 스키마 (`client/prisma/schema.prisma`)

### 핵심 모델 관계

```
Store ─┬── Customer ──── Reservation ──── ReservationPaymentEntry
       │       │              │
       │       ├── CustomerMemoTag    ├── ReservationHistory
       │       └── CustomerPointHistory
       │
       ├── Designer ──── DesignerSchedule
       │       └──────── Reservation (optional)
       │
       ├── Service
       ├── Membership ── User ── AuthAccount
       ├── StoreBusinessHour (7일)
       ├── StoreClosedDate
       ├── StorePointSettings
       └── Invite
```

### 주요 Enum

| Enum | 값 |
|------|---|
| `MembershipRole` | owner, manager, staff |
| `ReservationStatus` | active, completed, cancelled, noshow |
| `ReservationChannel` | naver, walk_in, phone |
| `DesignerStatus` | active, on_leave, resigned |
| `PaymentMethod` | cash, cash_receipt, card, naver_pay, local_currency, local_currency_receipt, voucher, points, discount, naver_deposit |
| `PointHistoryType` | manual_add, manual_subtract, recharge, payment_use, payment_earn, payment_adjust |

### ID 체계

- DB 내부: CUID (`cuid()`) - `id` 필드
- 프론트엔드: `legacyId` (Int, auto-increment) - 사용자에게 노출되는 번호
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
    ├─ 신규: 고객 생성 + 디자이너 매칭(이름) + 예약 생성
    ├─ 중복: designerId null이면 재매칭, serviceSummary/URL 업데이트
    └─ 취소: 상태 → cancelled
  → useNaverBookingSync.ts (알림 생성 + 중복 감지)
  → NaverSyncNotification.tsx (UI 표시)
```

### 고객 병합

```
useCustomerMergeSuggestion.ts (동명이인 감지)
  → CustomerMergeSuggestionModal.tsx (제안 UI)
  → /api/customers/merge (병합 실행)
    └─ 트랜잭션: 예약·포인트·태그 이전 + 이력 기록 + 원본 삭제
  → /api/customers/unmerge (병합 해제 가능)
```

### 적립금

```
StorePointSettings (적립률, 충전규칙)
  → 결제 완료 시 자동 적립 (serviceRate%)
  → 충전 시 보너스 적용 (rechargeRules)
  → CustomerPointHistory로 이력 기록
  → points로 결제 가능 (PaymentMethod.points)
```

---

## 환경 설정

| 파일 | 설명 |
|------|------|
| `.env.local` | 환경변수 (DATABASE_URL, AUTH_SECRET, OAuth 키) |
| `next.config.mjs` | URL 리라이트(/day/\*/week/\* → /), styled-components, Turbopack |
| `tsconfig.json` | ES2017, strict, path aliases |
| `package.json` | dev/build 스크립트, 의존성 |
