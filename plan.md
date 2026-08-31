# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.
> 완료된 작업 기록은 git 히스토리에서 확인한다 (`git log -p -- plan.md`).

---

## 검증 완료(머지 대기) — 삭제된 온라인 예약도 고객 링크에서는 조회되게 (`claude/deleted-reservation-visibility-ec70wk`)

> ⚠️ **머지 전에 마이그레이션 `0022_deleted_booking` 을 Supabase(direct 5432)에 먼저 적용할 것.**
> 테이블 없이 코드가 배포되면 **예약 삭제가 500** 난다(횡단 규칙 4).

### 배경 (코드 기준)
오너 화면의 파괴 동작은 둘이고, 고객 가시성이 서로 다르다.

| 동작 | 서버 | 고객 관리 링크(`book.takeaseat.co.kr/{slug}/r/{token}`) |
|---|---|---|
| 취소 | `status='cancelled'` (`server/api/reservations.ts` PATCH) | "취소됨" 배지 + 오너 사유 + 매장 취소 안내문구 |
| **영구 삭제** | `prisma.reservation.delete` (`reservations.ts:326`) | **404 → "예약을 찾을 수 없습니다"만** |

예약페이지로 들어온 예약(= `publicToken` 보유)을 오너가 삭제하면 **고객 링크가 조용히 깨진다.**
고객은 취소된 건지 링크가 잘못된 건지 알 수 없고, 삭제 알림은 매장 슬랙으로만 간다.
행이 사라지면서 `publicToken` 도 함께 사라지는 것이 원인이다.

### 결정 — 흔적(tombstone) 테이블
사용자 요구: **"매장에서는 안 보여도 되지만, 온라인예약으로 들어온 건은 고객에게 보여야 한다."**

- **채택 — 삭제 시 흔적만 남긴다.** 예약 행은 지금처럼 실제로 삭제하고(오너 화면·매출·슬롯 계산 전부 무변경),
  고객 조회에 필요한 최소 정보만 별도 테이블에 남겨 토큰 조회가 "취소됨"으로 응답하게 한다.
  손대는 곳이 **DELETE 핸들러 1곳 + 공개 토큰 조회 1곳**뿐이다.
- **반려 — 소프트 삭제(`deletedAt`)**: 정석이지만 예약을 읽는 모든 경로(예약 목록·타임라인·매출·
  공개 슬롯 가용성·네이버 동기화·고객 이력)에 `deletedAt: null` 필터를 넣어야 하고,
  **한 곳만 빠뜨리면 삭제한 예약이 슬롯을 막거나 매출에 되살아난다.** 위험 대비 이득이 없다.
- **반려 — 온라인 예약 삭제 금지**: 오기입·스팸 예약을 오너가 정리할 방법이 사라진다.

### 구현
- `server/prisma/schema.prisma` — `DeletedBooking` 모델 추가(가산). `publicToken` unique,
  `storeId`·`date`·`startTime`·`endTime`·`serviceSummary`·`reason`·`deletedAt`.
  **고객 이름·전화번호·customerId 는 담지 않는다** — 삭제 요청의 취지를 거스르지 않으려는 것이고,
  토큰은 무작위 문자열이라 그 자체로 신원과 연결되지 않는다.
- `server/prisma/migrations/0022_deleted_booking/migration.sql` — `CREATE TABLE IF NOT EXISTS` 만(가산·멱등).
- `server/api/reservations.ts` DELETE — `publicToken` 이 있으면 트랜잭션으로 흔적 생성 + 예약 삭제.
  **공유 `reservationSelect` 는 넓히지 않는다**(횡단 규칙 2) — `publicToken`·`decisionReason` 은 이 호출부에서만 스프레드로 더한다.
- `server/api/book/reservation/[token].ts` — 예약이 없으면 흔적을 찾아 `status:'cancelled'` 로 응답.
  `canRequest`/`canCancel` 은 false, 매장 취소 안내문구는 그대로 태운다.
- `server/api/book/booking-helpers.ts` — `findDeletedBookingByPublicToken` 추가.

### 리스크
- **마이그레이션 선적용 필수**(횡단 규칙 4). `DeletedBooking` 테이블 없이 코드가 배포되면 **예약 삭제가 500**난다.
  → 머지 전에 사용자가 Supabase(direct 5432)에서 `0022` SQL 을 먼저 적용한다.
- 이미 삭제된 예약은 토큰이 남아 있지 않아 되살릴 수 없다(이번 변경은 앞으로 삭제되는 건에만 적용).

### 검증 결과
로컬 PostgreSQL 16 를 새로 띄워(`takeaseat_verify`, 127.0.0.1:55432 — datasource 줄로 로컬 확인) `prisma migrate deploy`
전체 재생이 통과했고, **실제 핸들러를 구동**해 흐름 전체를 확인했다(next-auth 만 vitest 에서 해석되지 않아 세션 모듈만 대체).
1. 삭제 전 토큰 조회 → `active`
2. `/api/reservations` DELETE → 예약 행 사라짐
3. 삭제 후 토큰 조회 → **200 `cancelled`** + 날짜·시간·시술·매장명·슬러그·오너 사유·매장 취소 안내문구, `canRequest`/`canCancel` 둘 다 false, `customerName` null
4. 알 수 없는 토큰 → 여전히 404
5. 전화예약(토큰 없음) 삭제 → 흔적을 남기지 않음(`DeletedBooking` 0건 유지)

빌드/타입체크·단위 테스트 152개·순수모듈 테스트 게이트 모두 통과. lint 는 변경 전과 동일(80건, 신규 0건).

### 같은 패턴 전수 점검 — 남은 인스턴스 1건(판단 필요)
"온라인 예약이 사라지면 고객 링크가 죽는다"는 클래스로 저장소를 훑었다.

| 경로 | 예약이 사라지는가 | 상태 |
|---|---|---|
| `reservations.ts` DELETE | 사라짐 | **이번에 해결** |
| `customers.ts` DELETE (고객 영구 삭제, 오너) | 그 고객의 예약이 **cascade 삭제** | **해결 — 링크도 같이 없앤다**(흔적까지 삭제) |
| `customers-merge.ts` | 예약을 target 으로 **옮긴 뒤** source 고객만 삭제(`tx.reservation.updateMany`) | 흔적도 같이 이관하도록 보강 |
| `Store` cascade | 매장 자체가 사라지는 경우 | 대상 아님(매장이 없으면 링크도 의미 없음) |

**고객 영구 삭제 — 결정: 링크도 같이 없앤다**(사용자 판단, "지운 이유가 있겠지").
살아 있는 예약은 cascade 로 사라져 링크가 이미 함께 죽지만, **예전에 개별 삭제한 예약의 흔적**은
FK 가 없어 남아 그 링크만 계속 조회되는 구멍이 있었다. 이를 막으려면 흔적이 누구 것인지 알아야 하므로
`DeletedBooking.customerId`(무작위 cuid)를 담고, 고객 삭제 시 함께 지운다.
"customerId 는 담지 않는다"던 초기 판단을 뒤집은 것인데, **이 경우엔 저장하는 쪽이 삭제를 더 완전하게
이행한다**(이름·연락처는 여전히 담지 않는다). 병합 시에는 예약과 같이 target 으로 이관한다.

---

## 검증 완료(머지 대기) — 웹 오너 캘린더에 휴무(임시 휴업일·정기 휴무) 배경 표시 (같은 브랜치)

### 배경
iOS 앱에는 있고 **웹에는 없다.**

| | 임시 휴업일 | 정기 휴무 | 위치 |
|---|---|---|---|
| iOS | 적색 틴트 + 테두리 | 회색 틴트 + 테두리 | `TAS/Core/UI/StoreClosedStyle.swift`, 월 셀·일 헤더·주 헤더 |
| 웹 오너 캘린더 | **없음** | **없음** | `components/calendar/**` 는 `businessHours` 만 읽는다 |
| 웹 공개 예약 페이지 | 날짜 선택 비활성 | 날짜 선택 비활성 | `pages/book/[slug].tsx:124` |

앱 주석이 웹 `getStoreClosedKind`(`client/features/store-settings/model.ts`) 이식이라고 적고 있으나
**웹에 그 함수는 없다** — 앱에서 먼저 만든 것이다. 이번에 같은 이름·같은 규칙으로 웹에 만들어 주석을 사실로 만든다.

> 참고: "임시공휴일"(법정 공휴일) 개념은 두 저장소 어디에도 없다. 지금 있는 것은
> **임시 휴업일**(오너가 찍은 특정 날짜)과 **정기 휴무**(요일)뿐이다. 공휴일 자동 표시는 별건.

### 구현
- `client/features/store-settings/model.ts` — `getStoreClosedKind(settings, dateKey)` + `STORE_CLOSED_LABEL`.
  순수 모듈이므로 **단위 테스트 필수**(`model.test.ts`).
  규칙은 앱과 동일: 둘 다 해당하면 **임시 휴업일이 이긴다**, dayIndex 는 0=월…6=일.
- `client/components/calendar/views/storeClosedCss.ts` **(신규, 컴포넌트 아님)** — 틴트 CSS 조각 1개.
  **신규 사유(Front-End Standards)**: 붙는 대상이 월 셀 `<li>` 와 타임라인 `<div>` 로 태그·레이아웃이 달라
  공용 컴포넌트로 감싸면 기존 그리드·여백이 틀어진다. 감싸지 않고 **배경만 입히는 css 헬퍼**로 둔다.
  색은 기존 토큰만 쓴다 — 임시 휴업일 `--danger-bg`, 정기 휴무 `--gray-color2`.
- `views/Month.tsx` — 월 셀에 틴트 + 전역 `.a11y` 클래스로 "휴업일/정기휴무" 텍스트(색만으로 전달 금지).
- `views/Timeline.tsx` — 일·주·3일 뷰가 공유하는 `StyledTimelineWrap` 에 틴트 + `.a11y` 텍스트.
- 표시 전용이다 — 앱과 마찬가지로 휴무일에도 예약 생성은 막지 않는다.

> **남겨 둔 중복(의도적)**: 휴무 판정이 이제 두 곳에 있다 — 오너 캘린더의 `getStoreClosedKind`
> (`closedDates` + `closedWeekdays`)와 공개 예약 페이지의 `isDateClosed`
> (`closedDates` + `businessHours[].enabled`, `pages/book/[slug].tsx:123`). 같은 DB 사실
> (`StoreClosedDate` + `StoreBusinessHour.enabled`)에서 나오지만 **API 가 내려주는 모양이 다르다**
> (공개 API 는 7행 배열, 오너 스토어는 요일 배열). 하나로 합치려면 공개 API 응답 모양을 바꿔야 해서
> 이번 범위 밖으로 뒀다. 규칙이 갈라지면 두 곳을 함께 고칠 것.

### 리스크
- 타임라인은 카드·드래그 레이어가 겹치는 곳이라 배경만 넣고 `z-index` 는 건드리지 않는다.

### 검증 결과 — 함정 하나를 실제로 밟았다
게스트 모드로 앱을 띄워 월/주/일 뷰를 실제로 렌더해 확인했다(8/26=임시 휴업일, 매주 월=정기 휴무).

**처음엔 불투명 토큰(`--danger-bg`·`--gray-color2`)을 썼는데, 휴무 열에서만 시간축 눈금선이 사라졌다.**
눈금선은 좌측 시간축(`TimelineTitle`)의 가로 `100vw` 가상요소가 **뒤에서** 그리는 것이라 불투명 배경이 덮어 버린다.
→ 반투명 토큰(`--closed-date-bg`·`--closed-weekday-bg`)을 새로 만들어 해결. 재렌더로 눈금선 복귀 확인.

- 월 뷰: 임시 휴업일 셀 분홍, 매주 월요일 셀 회색. 예약 카드·"전체 (n)" 버튼 가독성 유지.
- 주 뷰: 해당 열 전체 틴트, 눈금선 비침, 예약 카드 가독성 유지.
- 일 뷰: 화면 전체 틴트, 동일.

---

## 완료 — 루트(`/`)를 색인 가능한 소개 페이지로 (PR #215, v0.53.0)

> Google Search Console 이 **"발견됨 – 현재 색인이 생성되지 않음"** 을 띄운다.
> 색인 대상 URL 이 `/about`·`/terms`·`/privacy` 3개뿐이고, **정작 외부 링크가 붙는 루트(`/`)가
> 색인 대상에서 빠져 있다.**

### 진단 (코드 기준)
익명 방문자가 `/` 에 오면 지금은 이렇게 흐른다.

| 단계 | 위치 | 결과 |
|---|---|---|
| 미들웨어 | `proxy.ts` | 익명은 게이트 통과 — 리다이렉트 없음 |
| SSR | `pages/index.tsx` `getServerSideProps` | 세션 없으면 `storageMode:'local'` 로 **200**, 빈 캘린더 앱 셸 |
| CSR | `pages/_app.tsx:196` | 그제서야 JS 로 `router.replace('/about')` |

크롤러가 받는 것은 **내용 없는 앱 셸 200** 이고, 리다이렉트는 렌더링 이후에야 드러난다.
루트는 사이트에서 가장 링크가 많이 붙는 URL 인데 크롤 가치가 0 이다.

**"발견됨 – 색인 생성 안 됨" 자체는 크롤링 우선순위 문제라 코드만으로는 안 풀린다**(사이트가 새롭고
외부 링크·색인 URL 이 적다). 이 작업은 "크롤이 왔을 때 색인할 것이 있게" 만드는 쪽이다.

### 선택 — 리다이렉트(A) 가 아니라 루트 렌더(B)
- **A. 루트 → `/about` 서버 리다이렉트**: 변경 1곳으로 끝나지만 **루트를 "색인할 것이 없는 URL"로
  확정**시킨다. 사이트맵에 `/` 를 넣는 것도 그때는 오히려 해가 된다(GSC "페이지에 리디렉션이 있음"으로 제외).
- **B. 루트가 소개 내용을 200 으로 응답**(채택): 발견된 루트 URL 에 색인할 내용이 생기고,
  사이트맵에 `/` 를 넣는 것이 그제야 정합적이 된다. 대신 변경 지점이 6곳이다.

### 구현
- `client/components/landing/LandingContent.tsx` **(신규 컴포넌트)** — `about.tsx` 본문·스타일 이동.
  - **신규 사유(Front-End Standards)**: 같은 소개 마크업이 `/` 와 `/about` 두 라우트에서 렌더돼야 한다.
    재사용 가능한 기존 컴포넌트가 없고, 복붙은 규칙 위반이다.
- `client/pages/about.tsx` — `SeoHead` + `LandingContent` 만 남긴다. canonical 을 **`/`** 로 지정해
  루트로 통합한다(중복 색인 방지).
- `client/pages/index.tsx`
  - `getServerSideProps`: 세션 없음 **AND** `tas-guest-terms` 쿠키 없음 → `landing: true` 로 200 응답.
    게스트 판별은 서버가 쓸 수 있는 유일한 신호가 이 쿠키다(`features/local-db/storage.ts:76`,
    `proxy.ts:44` 가 이미 같은 쿠키를 본다).
  - 렌더 분기는 **별도 컴포넌트**로 한다(`Home` 안에서 early return 하면 훅 순서가 깨진다).
  - 루트 `SeoHead` 에 `path="/"` canonical + 소개 전용 description.
- `client/lib/seo.ts` — `LANDING_DESCRIPTION` 상수 추가(`/` 와 `/about` 이 공유).
- `client/pages/_app.tsx`
  - 미인증 가드: 루트는 서버가 랜딩을 주므로 `/about` 으로 보내지 않는다.
  - `isAuthFlowPage` 에 루트 랜딩 포함 — 아니면 부팅 오버레이가 소개 화면을 덮고 데이터 로딩이 돈다.
  - `LayoutComponent` 에 랜딩 여부 전달.
- `client/components/layout/LayoutComponent.tsx` — `isBarePage` 에 랜딩 포함(앱 셸·Aside 없이).
- `client/pages/sitemap.xml.tsx` — `/about` → `/` 로 교체. 주석의 "루트는 리다이렉트되므로 제외" 갱신.

### 영향 파일
`components/landing/LandingContent.tsx`(신규), `pages/index.tsx`, `pages/about.tsx`, `pages/_app.tsx`,
`components/layout/LayoutComponent.tsx`, `pages/sitemap.xml.tsx`, `lib/seo.ts`, `index.md`.
`proxy.ts`·`robots.txt` 는 변경 없음(익명 루트는 이미 통과, `Allow: /`).

### 구동 검증에서 잡은 것 (계획대로 두면 깨졌던 것)
- **랜딩인데 URL 이 `/month/2026/8` 로 바뀌었다.** `LayoutComponent` 의 캘린더 URL 동기화 효과가
  루트 경로를 캘린더 경로로 정규화한다. 색인 대상 URL 이 주소창에서 사라지므로 이 작업의 목적이 통째로
  무너진다. 랜딩이면 효과를 건너뛴다.
- **쿠키만 지워진 게스트가 막다른 길에 갇혔다.** 처음엔 "소개 화면을 보게 되지만 로그인으로 복귀 가능"
  이라고 감수하려 했는데, **실제로 눌러 보니 복귀가 안 됐다.** `_app` 이 "이전 데이터 불러오기 → 예"를
  띄워 주긴 하는데, 앱 셸이 서버에서 오지 않았으므로 눌러도 소개 화면에 그대로 머문다.
  → `Landing` 이 게스트 데이터를 발견하면 **동의 쿠키를 되살리고 한 번만 새로고침**한다
  (`takeaseat.guest-cookie-repaired` 세션 플래그로 쿠키가 안 붙는 환경의 무한 새로고침 차단).

### 코드리뷰에서 고친 것
- **랜딩 응답에 `Cache-Control: public, s-maxage=3600` 을 붙였다가 뺐다.** 모든 트래픽이 Cloudflare
  `tas-proxy` Worker 를 지나는데(횡단 규칙 6), 거기 HTML 캐시 규칙이 있으면 익명 소개 화면이 `/` 에
  캐시돼 **로그인 사용자에게까지 돌아간다.** Cloudflare 는 `Vary: Cookie` 를 캐시 키에 넣지 않아
  쿠키로 구분되지도 않는다. 여기서 CF 설정을 확인할 방법이 없고, 15KB 페이지를 캐시해 얻는 것보다
  오너 화면이 소개 페이지로 바뀌는 쪽이 훨씬 비싸다. 지금은 Next 기본값(`private, no-store`)을 쓴다.
- **익명이 `/month/2026/8` 같은 캘린더 URL 로 직접 들어오면 소개 화면이 뜬다.** `next.config.mjs` 가
  그 경로들을 `/` 로 rewrite 하므로 `landing` 판정이 그대로 적용된다. `robots.txt` 가 이 경로들을
  Disallow 하고 canonical 이 `/` 라 색인 문제는 없다. 기존엔 앱 셸 → `/about` 이었으니 동작 변화이지만,
  내용이 같고 리다이렉트가 사라진 것이라 그대로 둔다.
- **`/about` 을 삭제했다.** 루트가 같은 내용을 응답하게 된 순간 존재 이유가 사라졌다 — UI 어디서도
  링크되지 않고, 같은 내용을 두 URL 에 두면 크롤 예산이 갈린다(이 사이트의 문제가 바로 크롤 우선순위다).
  exempt 목록 4곳(`proxy.ts`, `_app.tsx` ×2, `LayoutComponent`)의 특례도 함께 사라졌다.
  - ⚠️ **그냥 지우면 무한 리다이렉트가 난다.** `_app` 가드가 B-3(동의 쿠키 O · 로컬 데이터 X)을 루트에서
    `/about` 으로 보내고 있어서, `/about` → `/` → 앱 셸 → 가드 → `/about` 으로 돈다. 404 로 지워도
    404 페이지가 5초 뒤 홈으로 가므로 느린 루프가 된다. **가드 목적지를 `/login` 으로 먼저 바꾼 뒤** 지웠다.
  - 기존 링크는 `next.config.mjs` 의 **307**(영구 아님 — 되돌릴 여지) 리다이렉트로 살린다.

### 리다이렉트 위험 점검 (전수)
새로 넣은 것이 **서버 307 하나**(`/about` → `/`)와 **클라이언트 새로고침 하나**(B-2 쿠키 복구)라
루프·체인을 실제로 돌려 확인했다.

| 점검 | 결과 |
|---|---|
| 크롤러(쿠키 없음)가 `/` 진입 | **리다이렉트 0회** · 200 — 색인 경로에 리다이렉트가 없다 |
| `/about` 체인 | 1홉 → `/` 200. `?ref=x` 쿼리 보존, `/about/sub` 는 404(기존과 동일) |
| `Location` 헤더 | **`/` 상대경로** — `x-forwarded-host` 를 위조해도 그대로. Cloudflare Worker 뒤에서 `run.app` 호스트가 새지 않는다 |
| 307 캐시 | 307 은 기본 캐시되지 않는다 — 되돌릴 때 브라우저에 박히지 않는다 |
| B-3 (쿠키O·데이터X) | `/login` 에서 정지 (16초 관찰, 이동 4회 후 증가 없음) |
| `/about` 직접 + 쿠키O·데이터X | `/login` 정지 (13초 관찰) |
| `/month/…` + 쿠키O·데이터X | `/login` 정지 |
| **쿠키가 차단된 환경 + 게스트 데이터 O** | 복구 새로고침 **1회 후 정지** — `takeaseat.guest-cookie-repaired` 세션 플래그가 재시도를 막는다 |

### robots.txt 점검에서 고친 것
루트 색인을 손본 김에 `robots.txt` 를 실제 라우팅과 대조했다.

- **`/menu` 가 Disallow 목록에서 빠져 있었다.** 모바일 설정 허브(로그인 전용)라 `/settings` 와 같은
  성격인데 크롤이 열려 있었다. 추가.
- **`/policies/:slug` 풀페이지가 `/terms`·`/privacy` 와 본문이 같은데 색인이 열려 있었다.**
  `robots.txt` 의 `Disallow: /api/` 는 rewrite 이전 경로라 이 URL 을 덮지 않는다.
  → `renderPolicyHtml` 에 **`<meta name="robots" content="noindex">`** 를 넣었다.
  **`robots.txt` 로 막지 않은 이유** — 이 URL 은 OAuth 검수에 제출되는 주소다. 크롤을 막으면
  검수 쪽 조회까지 영향을 줄 수 있어, 크롤은 열어 두고 색인만 뺀다(noindex 가 더 정확한 도구이기도 하다 —
  Disallow 는 URL 만 남긴 색인을 막지 못한다).
  앱 안의 `/terms`·`/privacy` 는 다른 렌더 경로라 영향이 없다(`renderPolicyHtml` 의 유일한 사용처는
  `pages/api/policies/[slug].ts`). 확인함 — `/terms` 는 canonical 그대로, `robots` 메타 0건.

### 예약 서브도메인 robots (`claude/booking-host-robots` → 이 브랜치에 머지)
> 위 robots 점검에서 "범위 밖"으로 뒀던 것. 지시로 별도 브랜치에서 작업해 합쳤다(PR 은 하나).

**문제** — `public/robots.txt` 로 두면 **예약 서브도메인도 같은 파일을 받는다.** `proxy.ts` 의
`handleBookingHost` 가 확장자 있는 경로를 그대로 통과시키기 때문이다(실제로 확인함).

| # | 어긋남 | 처리 |
|---|---|---|
| 1 | `Allow: /` 라 **예약 확인 링크(`/{slug}/r/{token}`)까지 색인 대상**. 토큰이 공개되면 고객 예약 내용이 색인될 수 있다 | 페이지에 `noindex` |
| 2 | `Disallow: /month`·`/login`·`/settings` 가 **매장 슬러그를 막는다**(예약 호스트는 루트 바로 아래가 슬러그) | 호스트별 robots |
| 3 | `Sitemap:` 이 다른 호스트를 가리키고, 예약 호스트의 `/sitemap.xml` 도 메인 URL 목록을 200 으로 준다 | 예약 호스트에서 404 |

**구현**
- `client/pages/robots.txt.tsx` **(신규)** — `public/robots.txt` 를 지우고 라우트로 옮겼다
  (정적 파일이 라우트보다 먼저 서비스되므로 둘을 같이 둘 수 없다). `isBookingHost` 로 갈라
  메인/예약용 본문을 준다. 호스트 판정은 기존 단일 소스(`features/booking/routing.ts`)를 그대로 쓴다.
- `client/pages/sitemap.xml.tsx` — 예약 호스트면 `notFound`.
- `client/components/ui/SeoHead.tsx` — `noindex` prop 추가. `maintenance.tsx` 가 따로 들고 있던
  raw `<Head><meta robots></Head>` 도 이걸로 흡수했다(중복 제거).
- `client/pages/book/[slug]/r/[token].tsx` — 세 분기 전부 `noindex`.

**설계 판단 두 가지**
- **토큰 페이지를 `robots.txt` 로 막지 않는다.** 크롤을 막으면 크롤러가 `noindex` 를 읽지 못해
  오히려 URL 만 남은 색인이 생긴다. 크롤은 열고 색인만 뺀다.
- **`noindex` 는 로딩 분기에도 넣었다.** 예약을 클라이언트에서 받아오므로 **로딩 상태가 곧 서버 HTML**
  이다. 거기 빠지면 JS 를 실행하지 않는 크롤러는 태그를 못 본다. (처음엔 빠뜨렸고, 서버 HTML 을
  직접 받아 보고 발견했다.)
- 매장 예약 페이지(`/{slug}`) 자체는 **색인을 열어 뒀다** — 오너가 공개 예약을 켜서 만든 URL 이고
  매장 노출에 도움이 된다. 닫으려면 `BOOKING_ROBOTS` 한 줄이다.

**검증** (`NEXT_PUBLIC_BOOKING_HOST` 로 예약 호스트를 로컬 재현)

| 요청 | 결과 |
|---|---|
| 메인 `/robots.txt` | 기존 규칙 그대로 + `/menu` · `Sitemap:` 메인 |
| 예약 `/robots.txt` | `Allow: /` + `Disallow: /api/` 만 — 슬러그를 막는 규칙 없음 |
| 메인 `/sitemap.xml` | 200 |
| 예약 `/sitemap.xml` | **404** |
| 예약 `/{slug}/r/{token}` **서버 HTML** | `<meta name="robots" content="noindex">` |
| 예약 `/{slug}` 서버 HTML | robots 메타 0건(색인 허용, 의도) |
| `/maintenance` | `noindex` 유지(리팩토링 회귀 없음) |

### 5-1 리팩토링 (`/simplify`) — 뒤늦게 채움
> 업무 절차 5-1 을 두 번 다 건너뛰었다가 지적받고 돌렸다. CI 가 검사하지 않는 단계라 아무것도 못 잡았다.

- **재사용** — `resolveRequestHost(req.headers['x-forwarded-host'] as string | undefined, …)` 가
  SSR **4곳**에 복제돼 있었고 매번 같은 캐스팅을 했다. `resolveHostFromHeaders` 로 묶었다.
  캐스팅으로 덮고 있던 `string[]` 케이스도 실제로 처리한다.
- **단순화** — `pages/index.tsx` 미인증 분기가 `landing` 한 필드만 다른 반환 블록 둘이었다 → `landing: !isGuest`.
- **구현 깊이** — `LayoutComponent` 의 "랜딩이면 탈출" 특례를 `isCalPath` 판정에 녹였다.
  실제 규칙은 "루트 소개 화면은 캘린더 경로가 아니다" 이지 "여기서만 빠져나간다" 가 아니다.
- **군더더기** — `_app.tsx` 의 `(pageProps as {landing?: boolean})` 캐스팅 제거(`pageProps` 는 `any`).

**테스트 부채도 함께 갚았다** — `features/booking/routing.ts` 는 순수 모듈인데 **테스트가 0건**이었다.
이번 변경으로 호스트 판정이 robots·sitemap 분기의 핵심이 됐으므로 24건을 채웠다(총 147건).
변이 3종(우선순위 뒤집기 · 콤마 처리 제거 · 배열 처리 되돌리기)을 주입해 **4건이 실패**하는 것을 확인했다.

### 6-1 `develop` 통합 테스트
`origin/develop` 에 `origin/main` 을 먼저 받아 최신화한 뒤 이 브랜치를 머지했다. **충돌 없음**,
타입체크·테스트 147건·빌드 통과.

⚠️ 다만 **지금 `develop` 은 미출시분을 하나도 갖고 있지 않다** — `git diff origin/main origin/develop`
가 보여주는 차이는 develop 이 main 보다 **뒤처진** 것뿐이고, 머지 결과 트리는 이 브랜치와
**바이트 단위로 동일**했다(`git diff <feature> develop` 이 빈 출력). 즉 이번엔 통합으로 새로 검증된
조합이 없다. 부딪힐 다른 진행 건이 없다는 뜻이므로 통과로 본다. `develop` 브랜치는 **푸시하지 않았다**
(지정 브랜치 외 푸시 금지 — 필요하면 말해 달라).

### 같은 클래스 (이번 범위 밖 · 기존 결함)
- **스토리지 접근이 예외를 던지는 브라우저에서는 페이지가 죽는다.** `localStorage`/`sessionStorage`
  getter 가 `SecurityError` 를 던지면(차단 설정·일부 임베드 환경) `hasGuestData()`·
  `getGuestTermsVersion()` 이 그대로 터져 Next 클라이언트 예외 화면(본문 127자)이 뜬다.
  **`origin/main` 에서 동일하게 재현된다** — `/` 도 `/about` 도 똑같이 죽었다. 이번 변경으로
  나빠지지 않았고(루프도 아니다), 고치려면 `features/local-db/storage.ts` 의 접근자를 전부
  방어적으로 바꿔야 해 범위가 커진다. 별건으로 둔다.

### 리스크 / 감수한 것
- 쿠키 복구 경로는 **게스트 동의 버전이 localStorage 에 남아 있을 때만** 돈다. 동의 기록까지 지운
  경우는 소개 화면에 머물고 `/login` → `/consent` 로 다시 밟아야 한다(없는 동의를 만들어 낼 수는 없다).
- **`/about` 은 계속 200** 이다(기존 링크 보존). canonical 로 `/` 에 통합한다. 되돌리기 쉬운 선택이며,
  영구 리다이렉트(301)는 캐시가 남아 되돌리기 어려워 쓰지 않는다(`/book` 307 유지와 같은 판단).
- 색인 자체는 이 변경만으로 보장되지 않는다. **비코드 작업이 따로 필요**하다 — GSC 사이트맵 제출 확인,
  URL 검사 → 색인 생성 요청, 외부 링크 확보.

### 검증
- `next build`·`tsc --noEmit` 통과, `pnpm test` 123건 통과, `test:required` 통과.
  eslint 는 변경 파일 기준 **baseline(`origin/main`)과 동일**(7 errors·4 warnings, 전부 기존 것, 신규 0).
- 프로덕션 빌드를 띄워 실제 응답 확인:

| 요청 | 결과 |
|---|---|
| 익명 `/` | 200 · `<title>TAS \| 예약·고객 관리</title>` · description · `canonical https://takeaseat.co.kr/` · 소개 본문(h2 4개·CTA) SSR |
| 게스트 쿠키 `/` | 앱 셸(랜딩 아님) · `Cache-Control: private, no-store` |
| 익명 `/month/2026/8` | 소개 화면(next.config 가 `/` 로 rewrite) · canonical `/` |
| `/about` | 200 · canonical `https://takeaseat.co.kr/` |
| `/sitemap.xml` | `/`·`/terms`·`/privacy` |

- 헤드리스 Chromium 으로 하이드레이션 이후까지 확인:

| 시나리오 | 결과 |
|---|---|
| 익명 첫 방문 | `/` 에 머묾 · 리다이렉트 0 · 부팅 오버레이 없음 · 소개 화면 |
| 게스트(쿠키+데이터) | 캘린더(`/month/2026/8`) 진입 — 회귀 없음 |
| 게스트(쿠키만·데이터 없음) | `/login` — `/about` 삭제에 맞춰 목적지 변경 |
| 구 링크 `/about` 직접 진입 | 307 → `/` 소개 화면 |
| 게스트(쿠키 삭제·데이터 보유) | 쿠키 복구 후 새로고침 → 캘린더 진입 |

- **로그인 사용자 경로도 실제로 구동해 확인했다.** 로컬 Postgres 임시 클러스터(`127.0.0.1:55432`,
  `takeaseat_verify`)에 마이그레이션·시드를 넣고 오너 멤버십을 만든 뒤, 실제 세션 쿠키로 루트를 요청했다.

| 확인 | 결과 |
|---|---|
| SSR 페이로드 | `storageMode:"remote"` · 예약 57건 · 고객 12건 · `landing` 없음 |
| 응답 헤더 | `Cache-Control: private, no-cache, no-store` |
| 하이드레이션 후 | 캘린더(`/month/2026/8`) · 앱 셸(aside) 있음 · 소개 CTA 0 |

  **`origin/main` 대조군과 결과가 문자 단위로 같다**(최종 URL·aside·title·본문 길이 495자 동일).
  같은 대조군에서 **익명 경로는 기존 증상이 재현됐다** — `/` → `/month/2026/8` → `/about` 로
  JS 리다이렉트 2회를 거쳐 루트를 떠난다. 브랜치에서는 `/` 에 머문다.

---

## 완료 — 고객 병합 제안 그룹 규칙 재정의 (`feature/customer-merge-masked-rule`)

> 마스킹 이름(`김*수`) 병합 제안이 서로 다른 사람을 한 덩어리로 묶던 문제를 규칙 차원에서 고쳤다.
> UI 시안을 다듬는 대신 그룹 규칙을 바꾸자 체크박스가 통째로 사라졌다.

### 배경
- 제안 그룹을 **전이 병합**으로 만들었다. `김민수(A) ↔ 김*수 ↔ 김민수(B)` 처럼 마스킹 고객이
  다리 역할을 해서 실명 고객끼리도 한 그룹이 됐다. 전화번호가 다르면 **다른 사람일 수 있는데**
  병합하면 예약·적립금이 섞인다.
- 같은 이유로 `김민수` + `김진수` + `김*수` 가 한 카드에 떴다. `김*수` 가 누구인지 알 수 없는데
  제안을 띄우니 오너가 판단할 근거가 없다.
- 모달에 체크박스(합칠 대상)와 라디오(기준)가 동시에 있어 무엇을 고르는지 헷갈렸다.
  카드 전체가 클릭 영역이라 예약 카드를 보려다 기준이 바뀌기도 했다.

### 규칙
그룹 하나에 **마스킹 고객은 정확히 1명**, 나머지는 그와 이름 패턴이 맞는 실명 고객이다.
마스킹끼리는 묶지 않는다.

| 고객 | 제안 | 이유 |
|---|---|---|
| `김민수` + `김*수` | 1건 | 후보 1명 — 확인만 |
| `김민수`(A) + `김민수`(B) + `김*수` | 1건 (후보 2명) | 실명 이름이 1종이라 모호하지 않다. 누구인지는 라디오로 고른다 |
| `김민수` + `김민*` + `김*수` | **2건** | 마스킹 2명 → 각각 별도 제안. 기존 큐가 순차로 띄운다 |
| `김민수` + `김진수` + `김*수` | 0건 | 실명 이름 2종 — 판정 불가 |
| `김민*` + `김*수` | 0건 | 실명 후보 없음 |

### 구현
- `client/features/customers/merge-suggestion.ts` **(신규 순수 모듈)** — `detectMergeGroups`,
  `isMaskedName`, `isMaskedNameMatch`, `buildMergeGroupKey`. 그룹 키는 기존 형식(그룹 전체 ID
  오름차순 join)을 유지해 `customer-merge-reviewed` 기록이 되살아나지 않게 했다.
- `client/features/customers/merge-suggestion.test.ts` **(신규, 14건)** — 위 표의 다섯 조합을 전부 고정.
- `client/hooks/useCustomerMergeSuggestion.ts` — 전이 병합 삭제. `MergeSuggestion`이
  `{masked, candidates, targetId}` 로 바뀌었다. 병합 시 `sourceIds`는 **언제나 마스킹 고객 1명**이라
  실명 고객끼리는 어떤 경우에도 합쳐지지 않는다. `selectTarget`은 후보가 전부 실명이므로
  연락처 보유 → 오래된 단골 순으로 단순화.
- `client/components/modals/CustomerMergeSuggestionModal.tsx` — **체크박스 제거**.
  마스킹 고객 카드 ↓ `병합 기준 고객` 구획으로 나누고, 후보가 2명 이상일 때만 라디오를 띄운다
  (그때 제목은 `병합 기준 고객 선택`). **위 카드에는 구획 제목을 두지 않는다** — 헤더가 이미 그 고객을
  지목하고 화살표가 방향을 말한다. `삭제` 같은 말은 레코드 기준의 표현이라 사람을 가리킬 때 과하게 읽힌다.
  **클릭 영역은 라디오와 그 이름까지**(`StyledChoiceLabel`).
  배지는 구획 제목과 라디오가 이미 같은 말을 하므로 두지 않는다.
  예약·적립금·첫방문·메모태그는 **한 줄로 압축**(`StyledMetaLine`, 항목 사이 가운뎃점) — 항목마다
  줄을 차지하면 390px에서 두 번째 후보가 화면 밖으로 밀린다. 태그 앞에는 가운뎃점을 두지 않는다
  (줄바꿈 시 점만 홀로 남는다). **예약 카드는 공통 `ReservationInfoCard`를 그대로 쓴다.**

### 코드리뷰에서 고친 것
- **큐의 다음 제안이 감지 시점 스냅샷을 들고 있었다.** `merge()` 는 `setCustomerMap` 으로 스토어만
  갱신하고 `suggestions` 는 다시 만들지 않는다. 예약 건수는 살아있는 `reservationMap` 으로 계산되므로
  **한 카드 안에서 예약 건수만 갱신되고 적립금·첫방문은 옛 값**인 상태가 됐다. 후보를 공유하는 제안이
  연달아 뜨는 것이 새 규칙에선 정상 흐름(`김민수 + 김민* + 김*수` → 2건)이라 이 어긋남이 상시가 된다.
  `currentSuggestion` 을 `useMemo` 로 감싸 매 렌더에 `customerMap` 에서 다시 읽는다.
- **`index.md` 도메인 모델 표 누락.** 고객 병합 섹션과 훅 표만 고치고 `client/features/` 표를 빠뜨렸다.
- **키 호환성 서술 과장.** 2인 그룹은 기록이 승계되지만 한 그룹이 둘로 갈리는 경우
  (`1-2-3` → `1-2`/`1-3`)는 승계되지 않아 이미 건너뛴 제안이 한 번 다시 뜬다. 주석·테스트명을 실제에 맞췄다.

### /simplify 에서 고친 것
- **카드마다 전체 예약을 두 번씩 훑었다.** `countReservations` + `getLastReservation` 이 각각
  `reservationMap` 전체를 순회해, 카드 3장이면 렌더 한 번에 6회 전수 순회였고 라디오를 누를 때마다
  다시 치렀다. `summarizeCustomerReservations`(한 번 훑어 고객별 건수·최근 예약)로 합치고
  모달은 `useMemo` 로 한 번만 계산한다. 감지 단계도 그룹마다 훑던 것을 한 번으로 줄였다.
- **순수 함수가 훅 안에 묶여 테스트를 못 받고 있었다.** 기준 선정(`selectMergeTarget`)과 예약 집계를
  `features/customers/merge-suggestion.ts` 로 옮겼다. 모달이 훅에서 유틸(`countReservations`)을
  import 하던 이상한 의존도 사라졌다. 테스트 8건 추가(총 22건) — 연락처 우선·오래된 단골·
  예약 없는 고객·공백 연락처 등 갈림길을 전부 고정.
- **의미 없는 래퍼 정리.** 예약 카드를 감싸던 빈 `<div>` 를 프래그먼트로, 라디오 유무로 갈리던
  이름 마크업 중복을 `StyledChoiceLabel` 한 곳으로 합쳤다(`as` + `$interactive`).

**넘긴 것** — `components/address/AddressContent.tsx:97` 에 기준 고객 선정 로직이 한 벌 더 있다
(고객 목록에서 수동 병합할 때). 규칙이 달라(연락처 우선 단계 없음) 합치면 동작이 바뀌고,
이 PR 범위 밖 화면을 건드리게 된다. 별건으로 둔다.

### 같은 클래스 (이번 범위 밖)
- ~~`restoreConflictsFromPairs` 가 localStorage 에 박제된 `Reservation` 을 그대로 되돌려준다~~
  → 해결(`fix/conflict-pairs-stale-snapshot`). 로드된 예약은 `reservationMap` 의 현재 값으로 갱신하고,
  미로드 예약만 스냅샷을 폴백으로 남긴다. 구현은 `useNaverBookingSync.ts` 안에 있다
  (같은 이름의 `naverSyncConflictStorage.ts` 는 **아무 데서도 import 되지 않던 죽은 파일**이라 삭제했다).

### 남은 것 / 알려진 한계
- **동명이인이 실제로 다른 사람인 경우는 이름만으로 못 거른다.** 후보 2명을 띄우고 오너가 고르게
  하는 것이 현재 답이다. 기존 그룹핑도 이름만 봤으므로 새로 생긴 한계는 아니다.

### 검증
- 타입체크·eslint·`next build` 통과, 단위 테스트 99건 통과(신규 14건 포함).
- 헤드리스 브라우저로 위 표의 네 조합을 실제 구동해 확인:
  후보 1명(컨트롤 없음) / 동명이인 2명(라디오) / 이름 2종(제안 없음) / 마스킹 2명(건너뛰기로 두 번째 카드).
  390px 모바일 폭 포함 — 한 줄 압축 후 후보 2명이 모두 한 화면에 들어온다.
- 클릭 영역 실측: 카드 여백·전화번호·상세 행·하단 여백을 눌러도 기준이 바뀌지 않고,
  라디오 라벨과 방향키만 바뀐다. 예약 카드 클릭은 `예약 상세`를 열고 기준은 유지.
- 병합 요청 본문 확인: `{"sourceIds":[3],"targetId":2}` — 마스킹 1명만 source.

---

## 진행 중 — 중복예약이 다른 관리자에게 계속 뜨는 문제 (`feature/conflict-resolution-sync`)

### 증상
중복예약을 한 관리자가 **예약 시간 변경 없이 메모를 남기며 처리**했는데,
초대코드로 합류한 다른 관리자에게는 같은 중복예약이 계속 떴다.

### 원인
충돌 "처리 완료"가 **브라우저에만** 남는다.

| 저장소 | 위치 | 내용 |
|---|---|---|
| `sync-notifications` | `calendarStore.ts` | `conflictStatus: 'confirmed'` ← 처리 완료 표시가 여기 |
| `naver-sync-active-conflicts` | `useNaverBookingSync.ts` | 미해결 충돌쌍 |
| `naver-sync-deferred-conflicts` | `useNaverBookingSync.ts` | 나중에 보기 |

서버에 `ConflictResolution` 테이블과 `/api/conflict-resolution` 이 **이미 있었는데도** 안 쓰였다.
1. GET 이 `isActive = canUseSync && gmailConnected` 에 묶여 **Gmail 연동이 꺼져 있으면 호출조차 안 됨.**
   반면 감지는 `role === 'owner'` 만 보고 계속 돈다 — **감지는 하는데 해소 정보는 못 받는 비대칭**이 버그의 본체.
2. 받아온 값을 사유·메모 **표시에만** 쓰고, 충돌 억제(`confirmedKeys`)는 로컬 알림만 봤다.
3. POST 가 `if (trimmedReason)` 로 감싸여 있어 **사유 없이 확인하면 서버에 아무 기록도 안 남았다**
   (사유는 모달에서 "(선택)" 항목이다). 서버도 빈 사유를 400으로 거부했다.

### 구현
- `server/api/conflict-resolution.ts` — 빈 사유 허용(빈 문자열 저장). `reason` 은 non-null 컬럼이라
  **마이그레이션 불필요**.
- `client/hooks/useNaverBookingSync.ts`
  - 해결기록 GET 을 `gmailConnected` 게이트에서 떼어내 **감지와 같은 조건**(`role === 'owner'`)으로.
  - 감지 effect 는 `resolutionsLoaded` 이후에 돈다 — 안 그러면 이미 처리된 충돌이 잠깐 떴다 사라진다.
  - `confirmedKeys` = **로컬 confirmed ∪ 서버 기록**.
  - 서버 기록이 있는데 로컬에 미확인으로 남은 알림은 confirmed 로 내린다(알림 벨 배지 정리).
  - 사유가 비어도 처리 사실을 POST 한다.
- GET 실패 시에는 감지를 **막지 않는다.** 막으면 충돌을 아예 못 보게 되는데, 그건
  "이미 처리된 걸 또 보는 것"보다 나쁘다.

### 코드리뷰에서 고친 것
- **처리 기록 POST 실패를 조용히 삼키고 있었다.** 이 요청이 곧 "다른 관리자에게 다시 뜨지 않게 하는"
  경로인데 `.catch(() => {})` 였다. 실패하면 내 화면에서만 처리된 것처럼 보이고 증상이 그대로 재현된다.
  응답 상태까지 확인해 토스트로 알린다(`병합 실패`를 표면화한 `useCustomerMergeSuggestion` 과 같은 결).
  GET 실패는 그대로 조용히 둔다 — 로드마다 토스트가 뜨면 소음이고, 실패해도 옛 동작으로 퇴행할 뿐이다.
- `confirmedKeys` 를 `Set<string | undefined>` 대신 `flatMap` 으로 좁혀 `Set<string>` 으로.
- 감지 effect 본문이 **세션당 1회만 돈다**는 사실을 주석으로 명시. 의존성에 `resolvedKeys` 등이
  있어도 ref 가드에 걸려 재실행되지 않는다 — 다른 관리자가 방금 처리한 건은 새로고침해야 반영된다.

### 검증
- 타입체크·eslint(경고 4건은 변경 전과 동일, 신규 0)·`next build`·단위 테스트 85건 통과.
- **헤드리스 브라우저로 실제 클라이언트 경로를 구동해 확인**(`/api/auth/session`·`/api/store`·
  `/api/reservations` 등을 가로채 오너 세션 + 겹치는 예약 2건을 만든 하네스). 같은 담당자·같은 날
  14:00~15:30 과 15:00~16:00 → `conflictKey "1-2"`.

| 시나리오 | 수정 전 | 수정 후 |
|---|---|---|
| A. 서버에 기록 없음 (Gmail 연동 꺼짐) | GET 호출 **안 됨** · 충돌 뜸 | GET 호출됨 · 충돌 뜸(정상) |
| B. 다른 관리자가 이미 처리 | **충돌 그대로 뜸** ← 보고된 증상 | 알림 0건 · 저장쌍 0건 · 모달 안 뜸 |
| C. 사유 없이 확인 | POST **없음** | `{"conflictKey":"1-2","reason":""}` |

  수정 전 코드(`origin/main`)로 되돌려 같은 하네스를 돌린 **컨트롤에서 증상이 재현**됐다 —
  하네스가 구분력이 있음을 확인한 뒤 결과를 받았다.
- 다만 **실제 계정 2개로 도는 서버 왕복은 여기서 못 한다**(DB·세션 필요). 위 검증은 클라이언트
  판단 로직과 요청 본문까지이고, 서버 저장·조회는 배포 후 확인이 필요하다.

### 남은 것 / 같은 클래스 (범위 밖)
- `client/store/calendarStoreHelpers.ts` 의 서버 반영 경로 5곳(`/api/customers` POST, `/api/store` PATCH 등)이
  모두 `.catch(() => {})` 다. "로컬은 됐다고 보는데 서버는 모른다"는 **이번 버그와 같은 클래스**다.
  한 번에 손대면 범위가 커져 별건으로 둔다.
- ~~`restoreConflictsFromPairs` 가 박제된 `Reservation` 을 그대로 되돌려준다~~
  → 해결(`fix/conflict-pairs-stale-snapshot`).

---

## 미확인 — 로딩 화면에 걸어 다니는 공룡 (구현·검증 완료, 실기기 확인만 남음)

> 다른 저장소(`clipnote`)에 있는 로딩용 공룡을 TAS로 가져와, **로딩 중인 모든 화면**에 띄운다.
>
> **구현·자동 검증은 끝났다** — 빌드·타입체크·eslint·단위 테스트 52건 통과, 헤드리스 브라우저로
> 부팅 오버레이에서 CSS→JS 인수인계와 네 면 걷기·코너 도약 실측(아래 검증 결과). 남은 것:
> **Safari·iOS 실기기 확인**(`steps()` 스프라이트 전환·`scaleX(-1)` 뒤집기)과, 라우트 전환
> 오버레이(300ms 지연 후 노출)에서의 체감.

### 배경
`clipnote`(및 `clipnote-ios`)에는 로딩 동안 화면 테두리를 걸어 다니는 도트 공룡이 있다.
TAS의 로딩 화면은 지금 회전 스피너 + 문구뿐이라 같은 장면을 여기에도 둔다.

### 범위
- **붙이는 곳은 `LoadingOverlay` 한 곳.** 화면을 덮는 로딩은 전부 이 컴포넌트를 지나간다 —
  부팅(`_app.tsx` `isBooting`), 라우트 전환(`_app.tsx` `RouteLoading`), `/login`, `/consent`(2곳),
  `StoreSwitcher`. 여기 한 번 붙이면 **6곳**이 모두 덮인다. 화면마다 따로 넣지 않는다.
- **부분 로딩은 범위 밖.** 오버레이를 경유하지 않는 로딩 표시가 4곳 있다 —
  `GuestMigrationLayer`(`Spinner` 직접), `BookingRequestNotification`·`SNSLinkingSection`·
  `inquiry`(인라인 "불러오는 중" 행). 목록 행·패널 안의 표시라 **창 테두리를 도는 공룡을 넣는 건
  맞지 않는다.** 의도적으로 제외한다.
- 기존 `Spinner`는 **그대로 둔다.** 공룡은 장식이고 진행 표시는 스피너·문구가 계속 맡는다.

### 구현
- `client/public/dino-run.png` — 4프레임 47×45 스프라이트(clipnote/앱과 동일 파일).
- `client/components/ui/RunningDino.tsx` **(신규 컴포넌트 — 사유는 아래)**
  - 창을 상자로 삼아 네 면을 걷는다. 좌표는 `requestAnimationFrame` + DOM 직접 조작
    (초당 60회 리렌더 방지). 코너는 도약으로 돌고, 프레임은 시간이 아니라 걸은 거리로 넘긴다.
  - **JS가 붙기 전에도 보이게 한다.** 부팅 오버레이는 하이드레이션 전에도 화면에 있다.
    styled-components `keyframes`로 바닥 왕복을 기본 동작으로 깔고, effect가 뜨면
    `animation: none`으로 끄고 네 면 걷기를 이어받는다(실행 중 CSS 애니메이션이
    인라인 `transform`보다 우선하므로 반드시 꺼야 한다).
  - `prefers-reduced-motion: reduce`면 세워만 두고 걷지 않는다. `aria-hidden` + 클릭 통과.
- `client/components/ui/LoadingOverlay.tsx` — `<RunningDino />` 한 줄 추가.

### 신규 컴포넌트 사유 (Front-End Standards)
기존 재사용 대상이 없다. `Spinner`는 회전 원형 하나로 스프라이트 시트·좌표 애니메이션을
표현할 수 없고, 성격도 다르다(스피너=진행 표시, 공룡=대기 시간 장식). 오버레이 본문에
인라인으로 넣으면 `LoadingOverlay`가 200줄짜리 좌표 계산을 떠안는다.

### 영향 파일
`client/components/ui/RunningDino.tsx`(신규), `client/components/ui/LoadingOverlay.tsx`,
`client/public/dino-run.png`(신규 에셋).

### 검증 결과 (프로덕션 빌드 + 헤드리스 Chromium)
세션 응답을 붙잡아 부팅 오버레이를 유지시킨 상태에서 스프라이트 좌표를 샘플링했다.

| 시점 | 관측 | 뜻 |
|---|---|---|
| 0ms | `(0, 666)` 인라인 transform 없음 | 하이드레이션 전 — **CSS 바닥 왕복**이 돌고 있다 |
| 276~1027ms | `translate(1065px, 150→33px) rotate(270deg)` | JS 인수인계 후 오른쪽 벽을 타고 올라감 |
| 1277ms | `rotate(262.8deg)` | 코너 도약 중(각도 보간) |
| 1527ms~ | `translate(1057→982px, 0px) rotate(180deg)` | 천장을 거꾸로 매달려 왼쪽으로 |

빌드·`tsc --noEmit`·eslint(변경 파일)·`pnpm test`(52건)·`test:required` 게이트 전부 통과.

### 리스크 / 남는 것
- **Safari·iOS 미확인.** `steps()` 스프라이트 전환, `scaleX(-1)` 뒤집기, `image-rendering:
  pixelated`는 표준이지만 헤드리스 Chromium 하나로만 봤다.
- 오버레이는 `backdrop="dim"`(반투명)일 때 뒤 화면이 비친다 — 공룡이 콘텐츠와 겹쳐도
  `pointer-events: none`이라 조작을 막지는 않는다.
- 라우트 전환 오버레이는 300ms 지연 후에 뜬다(`_app.tsx`). 짧은 이동에서는 공룡도 안 뜬다 —
  의도된 동작이다.
- 순수 로직(좌표 계산)이 컴포넌트 파일 안에 있다. `client/features/**`가 아니라 단위 테스트
  의무 대상은 아니지만(`test:required` 게이트도 "변경 없음" 판정), 나중에 옮길 여지는 있다.

---

## ~~미확인 — 현재시각 바 화면 확인 (PR #197 후속)~~ → 확인 완료

- 화면으로 확인했다. **위치 계산은 맞다** — 16:58 에 열어 바가 오후 5시 눈금에 놓이는 것을 확인.
  (색은 빨강이 아니라 주황 `--orange-color` 였다.)
- 대신 다른 문제가 드러났다: **자동 스크롤이 없어** 오후에 열면 바가 화면 한참 아래(상단에서 1758px,
  스크롤러 높이 861px)에 있어 매번 손으로 내려야 했다. → **PR #213 (v0.52.0) 에서 처리 완료.**
  오늘이면 마운트 시 바를 화면 위쪽(`scroll-margin-top: 72px`)에 놓는다. 일별·주별·3일 공통.
  최초 1회만 — 30초마다 도는 `now` 갱신에 스크롤을 물리면 다른 시간대를 보는 중에도 끌려온다.

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


---

## 진행 중 — 매출 추이 차트를 SVG 라인 → CSS 세로 막대로 (`claude/revenue-app-bar-chart-607spf`)

### 배경
설정 > 매출의 "기간별 매출 추이"만 **SVG 라인 차트**다(`buildRevenueLinePath`로 path 문자열을 만들고
`<svg>` 안에 line/area 두 개를 그린 뒤, 각 점 위에 7px 원형 버튼을 절대배치).
같은 화면의 다른 차트(담당자별 막대, 결제수단·유입 도넛)는 전부 **div + CSS**로 그려져 있고,
iOS 앱(`tas-ios` `RevenueView`)의 같은 지표도 Swift Charts `BarMark` — **막대**다.

라인이 불리한 지점:
- 일 매출은 연속량이 아니라 **하루 단위 합계**다. 예약 없는 날이 0으로 내려갔다 올라오며 톱니가 된다.
- 클릭 대상이 지름 7px 점이라 조준이 어렵고, 툴팁도 그 점 위에 올려야만 뜬다.

### 구현 (SVG 제거, CSS만)
- `revenueChartUtils.ts` — `buildRevenueLinePath` 삭제(유일한 호출부가 이 차트).
- `revenue-chart-styles.ts` — `StyledLineChart`(svg)·`StyledChartGuide`·`StyledChartPointHalo`·
  `StyledChartPointButton`·`REVENUE_CHART_WIDTH/HEIGHT` 삭제. `StyledLineChart*` → `StyledTrendChart*` 로 이름 정리.
  추가: `StyledTrendChartStage`(flex, 막대를 바닥 정렬) / `StyledTrendColumn`(막대 1개 = **스테이지 전체 높이 버튼**) /
  `StyledTrendColumnFill`(높이 = 비율).
- `RevenueChartGrid.tsx` — 점 대신 막대. 툴팁·가로 가이드·Y축·X축·클릭 상세(`{kind:'date'}`)는 그대로.
- `RevenueSection.tsx` — `chartPath` 제거, `chartPoints`의 `yRatio` → `heightRatio`.

### 설계 판단
- **막대 자체가 아니라 열 전체가 버튼**이다. 매출 0인 날도 폭이 있는 클릭 대상이 되고, 조준 면적이 7px → 열 높이 전체로 커진다.
- 0원인 날은 높이 0이라 안 보이므로, **금액이 있는 날만 최소 3px**를 준다(0과 소액을 구분).
- 막대 간격은 개수에 따라 줄인다(20개 이하 4px / 45개 이하 2px / 그 이상 1px). 기본 빠른 범위가 오늘·7일·30일이라
  대부분 4~2px 구간이고, 커스텀 장기간에서도 막대가 사라지지 않는다.

### 검증
`pnpm lint` + `next build`(타입체크 포함). 순수 모듈(`client/features/**`) 변경 없음 — 테스트 추가 대상 아님.
