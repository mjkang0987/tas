# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

## 진행 중 — 매장관리: 적립금/회원권 시스템 토글 + 회원권 풀 기능

> 매장 관리에서 "적립금 시스템 사용"·"회원권 시스템 사용"을 켜면 aside 설정에 메뉴가 뜨고 페이지가 열린다.
> 아이콘 교체(담당자=이름표/뱃지, 사용안내=전구)는 선행 완료(`be7fe49`).

### 확정된 설계 결정 (사용자 확인)
- **적립금 = 금액 / 회원권 = 비금액(횟수·기간)**. 금액권은 기존 적립금 충전(recharge)에 이미 있으므로 **별도로 안 만든다**(중복 방지). 적립금 화면 "충전/선불금" 라벨 정비는 회원권과 같이 진행.
- **회원권**: 한 모델에 `횟수(옵션) + 만료(옵션)` 둘 다 담아 횟수권/기간권/복합 모두 표현. 서비스 **지정·전체 둘 다** 지원. 결제 시 **결제수단으로 차감 연동**. **선택적 만료**.
- 적립금 토글 **기존 매장 기본값 = 꺼짐**(`default(false)`).
- aside: 적립금 관리(기존 `point`)는 적립금 토글 ON일 때만, 회원권 관리(신규)는 회원권 토글 ON일 때만 노출.

### 데이터 모델 (Prisma)
- **Store**: `usePointSystem Boolean @default(false)`, `useMembershipSystem Boolean @default(false)`.
- **MembershipProduct**(회원권 상품): id, storeId, legacyId(@@unique[storeId,legacyId]), name, `totalCount Int?`(횟수, null=무제한), `validDays Int?`(발급일+유효일수, null=무기한), `price Int`, `appliesToAllServices Boolean @default(true)`, status, services(MembershipProductService[]).
- **MembershipProductService**: 회원권↔Service N:N(특정 서비스 지정 시).
- **CustomerMembership**(고객 보유분): id, storeId, legacyId, customerId, productId?, name(스냅샷), `totalCount Int?`, `remainingCount Int?`, issuedAt, `expiresAt DateTime?`, status(active/expired/used_up/cancelled), usages.
- **MembershipUsage**(차감/조정 이력): id, customerMembershipId, reservationId?, `delta Int`(음수=차감/양수=환불·발급), type(issue/use/adjust/refund), createdAt, memo.
- **PaymentMethod** enum에 `membership` 추가.

### 구현 단계
1. **Phase 1 — 토글 + 메뉴/페이지 골격**(스키마: Store 토글 2개만): Store boolean 2개 + 마이그레이션, `/api/store` GET/PATCH·매퍼·클라 스토어 연동, StoreManageSection에 native 체크박스 2개, Aside 메뉴 게이팅 + 회원권 메뉴/아이콘 신설, `/settings/membership` 페이지 골격(탭 디스패치 등록), 적립금 라벨 정비. 로컬 PG 검증 → 커밋.
2. **Phase 2 — 회원권 모델 + 관리 UI**: 위 4개 모델 + 마이그레이션, CRUD API(상품 발행/조회/수정/보관), `/settings/membership` 관리 화면(상품 목록·생성, 고객별 발급·잔여 조회).
3. **Phase 3 — 결제 연동**: PaymentMethod.membership, 예약 결제 시 회원권 선택→차감(MembershipUsage 기록), 잔여/만료 검증, 고객 상세에 보유 회원권·이력 표시.

### 리스크/주의
- 새 테이블은 마이그레이션 → **운영 반영은 DB 접근 가능 시**(rename 배포 배치와 함께). 로컬 검증은 지금 가능.
- 결제 차감은 트랜잭션으로(예약 결제 ↔ 회원권 차감 정합성). 만료/잔여 0 방어.

---

## 완료 — seed ID 재매핑 버그 수정 + ESLint 툴체인 복구

> 담당자 rename 소스 검증 중 발견. 커밋 `dee8700`(seed)·`4cc4ce8`(deps). 둘 다 rename 과 독립.

### 1) seed 담당자 ID 재매핑 버그 (correctness) — 수정됨
- **증상**: `prisma:seed` 시 `reservations.json`의 모든 예약이 `assigneeId=null`(미배정)로 들어가 담당자별 예약·매출이 통째로 빔.
- **근본 원인(2중)**: ① `normalizeAssignees`·`normalizeReservationPayload`·`seedTestConflicts`가 같은 담당자 ID를 각자 독립 맵으로 재매핑 → 불일치(담당자 legacyId 1·2·3·4 vs 예약 130·140·145). ② `buildLegacyIdMap`이 `MAX_INT_32` 초과 ID 중복을 안 걸러 nextId 낭비·덮어씀.
- **수정**: `buildLegacyIdMap` dedup + `loadAssigneeIdMap`(assignees.json 단일 출처·메모이즈)을 세 정규화 함수가 공유.
- **검증**: 로컬 PG 시드 → 예약 54건 전부 유효 담당자 연결, dangling 0 (수정 전 0건 연결 → 후 54건).

### 2) ESLint 툴체인 복구 (infra) — 수정됨
- **증상**: `pnpm lint` 실행 자체 불가. eslint 10 에선 react 룰 `getFilename` 비호환, eslint 9 로 내리면 brace-expansion override(5.0.6 일괄)가 minimatch@3.x(1.x API) 를 깨뜨림(`expand is not a function`).
- **수정**: eslint 10.4.1→9.39.4(next/plugin-react peer 정렬) + brace-expansion override 를 `brace-expansion@1: 1.1.12`(1.x 만 패치)로 정정. minimatch@10.x 는 5.0.6 자연 해석, ReDoS 패치 유지.
- **검증**: `pnpm lint` 정상 실행. tsc·next build 통과.
- **후속(미정)**: lint 가 드러낸 기존 코드 이슈 **22 errors·51 warnings**(주로 `react-hooks/set-state-in-effect`, `no-unused-vars`)는 별도 정리 필요.

---

## 완료(최근) — 캘린더 타임라인: 영업시간 연동 + 표시 개선

> 배포 완료. 상세는 git 히스토리(`d5a2333`·`4fdbba4`·`456750a` 외 `9ae39ab`·`ab7fe43`).

- **A 영업시간 → 축 연동**: `getTimelineRange(viewType, businessHours)`(`utils/timelineRange.ts`) 신설. `Timeline`/`TimelineTitle`이 `storeSettings.businessHours` 구독. 모든 뷰 영업시간 그대로(패딩 0). 죽은 `store.time` 슬라이스 제거.
- **B 표시/동작**: 1시간=100px(30분=50px) 단일화, 현재시간 바 드리프트 수정, 빈 곳 클릭 예약추가 좌표 수정(이전 구버전은 클릭 단위 불일치로 하단 클릭이 ~3h 어긋남 → 수정됨).
- **실측(Playwright)**: 영업시간 변경 시 일/3일/주 축 반영, 빈 곳 클릭·드래그 이동 시작시각 모두 정확 확인.

---

## 완료 — 디자이너 영구 삭제 (분리 삭제 방식)

> 구현·빌드 검증 완료. 상세는 git 히스토리.
> 결정: **디자이너만 분리 삭제** — 디자이너+스케줄은 제거하되 과거 예약은 `designerId` 미지정으로 보존. 절대 차단되지 않음(예약 cascade 삭제 X).
> UI: "퇴직자" 섹션 카드에만 "영구 삭제" 버튼 노출(2단계 안전장치). 확인 모달에 영향받는 예약 건수 표기.

### 배경/현황 (조사 결과)
- 서버 `designers.ts`는 PUT-by-omission으로 하드 삭제하되 **예약 연결 시 400 차단**. 영속화 `syncToServer`는 **에러를 삼키고 로컬 낙관적 제거** → 기존 `deleteDesigner`를 그대로 버튼에 붙이면 "화면선 사라지나 서버 거부 → 새로고침 시 부활" 버그. 그래서 전용 DELETE 엔드포인트로 간다.
- DB: `DesignerSchedule`은 onDelete Cascade(자동), `Reservation.designerId`는 optional FK → 트랜잭션에서 명시적 `updateMany(null)` 후 designer.delete.
- 프런트 `Reservation.designerId: number | null`, UI는 이미 `null`을 "미지정" 표시 → 분리 삭제와 정합.

### 구현 항목
1. **`server/api/designers.ts`** — `DELETE` 추가. `requireRole('owner')`, body `{ id }`(legacyId) → `storeId_legacyId`로 해석. 트랜잭션: `reservation.updateMany({designerId:해당 → null})` → `designer.delete()`(스케줄 Cascade). `Allow`에 DELETE 추가. 미존재 시 404.
2. **`store/calendarStoreHelpers.ts`** — `deleteDesignerOnServer(id)` 추가(`deleteCustomerOnServer` 패턴). 원격 DELETE, 로컬 모드는 스냅샷에서 디자이너 제거 + 해당 예약 designerId=null.
3. **`store/calendarStore.ts`** — `deleteDesigner` 액션 수정: PUT-by-omission 제거 → 디자이너 상태 제거 + `reservationMap` 내 해당 예약 designerId=null + `deleteDesignerOnServer(id)`.
4. **`components/settings/DesignerManageSection.tsx`** — "영구 삭제" UI 추가. **퇴직자 섹션에만** 노출(2단계 안전장치: 재직→삭제(퇴직)→영구 삭제). 확인 모달에 "예약 N건은 '미지정'으로 남고 디자이너는 영구 삭제됩니다" 안내 후 `deleteDesigner(id)`.
5. **문서**: 완료 후 `index.md`·`plan.md` 갱신.

### 리스크
- 분리 삭제라 예약 데이터 손실 없음. 단 매출/통계에서 해당 예약은 "미지정"으로 집계됨(의도된 동작).
- 로컬 모드 스냅샷과 원격 동작 일치 확인 필요.

---

## 다가오는 작업 — 읽기 과부하/페이징(③) + 매출 서버화(A)

> 설계 상세: [docs/reading-overload-pagination.md](docs/reading-overload-pagination.md).

### 트리거 (재산정 2026-06-23)
- 6/1~6/23(23일) 예약 ~60건 ≈ **월 ~80~100건+**(월말 전). **네이버 예약 API 연동 추가 예정** → 유입 가속.
- 러프: **3~4개월 → 누적 수백 건**(B 트리거 "미래 예약 수백+" 도달), **~1년 → 수천**. ReservationHistory는 더 빠름.
- → 무기한 보류 아님. **몇 달 내** 현실화.

### 순서
1. ~~**B-1 공통 로직 추출**~~ — **완료**. `calendarStoreServiceHelpers.ts`에 인라인이던 `minutesBetween`·수동판정(`isPriceManual`/`isDurationManual`)을 `features/services/model.ts`로 이동(무동작 변경, `export *`로 자동 재export, 서버 import 가능). `parseServiceString`/`sumPrice`/`sumDurationMinutes`/`calcEndTime`/`LEGACY_NAME_MAP`은 이미 model에 있었음.
2. **네이버 연동 마일스톤에 결합**:
   - `naver-booking-sync.ts:88` 매 폴링 전체예약 풀스캔 **bound**(연동 시 그 파일 만지므로 같이) — 인덱스+범위/증분.
   - **A(매출 집계 서버화)** 를 이 마일스톤으로 끌어와 착수(연동으로 데이터 곧 늘어 명분 생김). A 스텝은 docs "A" 섹션 참조.
3. **B-3 페이징 / B-2 updateService 서버화 / B-4 고객 페이징**: 누적 수백~수천 신호 시(몇 달 내 예상). A가 선결로 먼저 돼 있게.

### A 주의 (착수 시)
- 원격 전용 + local(`shouldUseLocalDb`)은 클라 계산 유지(모드 분기). 서버는 revenue.ts **순수함수 재사용**(query→`dbReservationToFrontend`→`groupByDate`→동일 함수 호출, 재구현 X).
- 예외: `getRevenueInsights` 신규/재방문은 범위 밖 이력 필요 → stored `Customer.firstVisitDate` 사용.
- 회귀=매출 오표시 → 클라==서버 합계 일치 검증.

---

## 업종 중립화 — 미용실 한정 용어 제거 (계획, 미착수)

> 목표: "미용실·뷰티샵" 한정 색을 빼고 범용 "예약·고객 관리 서비스"로.
> 참고: 이전 세션에서 카피 변경·plan을 작성했으나 워킹트리 정리(2026-06-24)로 전부 되돌아감. 아래는 재정리한 계획.

### 0. 선작업 — 점검중(maintenance) 페이지 + 게이트 (rename 배포 안전장치) — ✅ 구현·검증 완료, main 배포·드라이런 대기

> rename은 "깨지는 창"이 불가피(아래 §2 참고) → 그 동안 사용자에게 **500 대신 "점검 중"**을 보여줄 장치를 먼저 만든다. rename 외 향후 마이그레이션·장애 대응에도 재사용.

- **점검 페이지**: `client/pages/maintenance.tsx` — **DB/Prisma 비의존 페이지**(getServerSideProps·getInitialProps 없음). 빌드상 ƒ(서버 렌더)지만 — `_document.getInitialProps`(styled-components SSR)로 앱 전체가 ƒ — DB를 안 건드리므로 마이그레이션 중에도 안전. 로고 + "점검 중" 문구. **상태: 구현·검증 완료**(런타임 200 + noindex 확인). _app·LayoutComponent에서 bare 페이지 처리도 완료.
- **게이트**: `client/proxy.ts`(Next 16은 `proxy.ts`가 미들웨어 파일 — 내부상수 `PROXY_FILENAME='proxy'`). `MAINTENANCE_MODE==='true'`면 모든 요청을 `/maintenance`로 `NextResponse.rewrite`. `/maintenance`·`/_next` 바이패스. **상태: 구현·검증 완료**(커밋 `c8a4706`).
  - ⚠️ **설계 교훈 — 게이트는 `auth()` 밖 최상단에 둘 것**: 처음엔 `auth()` 콜백 안에 넣었더니 NextAuth가 요청 URL을 `AUTH_URL` origin으로 치환 → `rewrite`가 외부 프록시로 새서 **500**(`Failed to proxy ... ECONNREFUSED`). `auth()` 밖에서 *치환 전 진짜 요청 origin*을 쓰게 해 해결(origin 불일치에서도 정상). 부수효과로 auth가 깨져도 점검 페이지가 뜸(인증 독립).
  - env(`process.env`)만 사용 — 미들웨어 Edge 런타임이라 무거운 import(Prisma 등) 금지.
- **토글 — ✅ 런타임 반영 검증 완료**: 로컬 프로덕션 빌드(`MAINTENANCE_MODE` 없이 빌드) 후 `next start`에서 env만 바꿔 ON→점검·OFF→정상 확인 → **빌드타임 인라인 아님**(런타임 읽기). 단 Cloud Run `--update-env-vars`는 **새 리비전 롤아웃**(이미지 재빌드 X, 인스턴스 내 즉시 전환은 아님)이라 배포 후 실제 토글 1회 드라이런 권장.
- **헬스체크**: Cloud Run에 **HTTP 헬스 프로브가 설정돼 있지 않으면 포트 응답만 보므로 `/api/health` 불필요**할 수 있음 → 현재 서비스 프로브 설정 먼저 확인 후 항목 유지/제거 결정.
- **rename 배포 시퀀스**: ① 점검 ON → ② 마이그레이션(RENAME) → ③ 새 코드 배포 → ④ 검증 → ⑤ 점검 OFF. 사용자는 내내 "점검 중"만 봄(500 노출 0).
- **열린 질문**: (a) 게이트는 proxy.ts에 통합(별도 미들웨어 X). (b) 로그인/인증 포함 전체 차단이 단순·안전. (c) Cloud Run 프로브 방식 확인 후 헬스체크 경로 필요 여부 결정.

### 0-1. 점검 게이트 `/login` 누수 수정 (rename 선행) — ✅ 완료

> **문제**: `proxy.ts`의 `config.matcher`가 `login`을 제외(`(?!...|login)`)해 미들웨어가 `/login`에서 아예 실행 안 됨 → `MAINTENANCE_MODE='true'`여도 `/login`은 점검 페이지로 안 가고 정상 렌더. rename 마이그레이션 중 `/login` 진입 시 데이터 로드로 500 노출 위험. 열린 질문 (b)("로그인 포함 전체 차단이 단순·안전")를 코드에 반영.

- **요구사항**: 점검 모드일 때 `/login`도 `/maintenance`로 덮는다. 정상 모드에서는 `/login` 동작 무변(현행 유지).
- **접근**: `matcher`에서 `login` 토큰만 제거 → 미들웨어가 `/login`에서도 실행됨. 점검 게이트가 auth() 밖 최상단이라 ON이면 rewrite로 먼저 가로챔. OFF면 `authMiddleware`로 진입하지만 `/login`은 이미 `isExempt`(14~22줄)라 약관·온보딩 리다이렉트 없이 통과 → 정상 모드 동작 동일. `api/auth`·`_next/*`·`favicon.ico` 제외는 유지(인프라/인증 엔드포인트는 계속 살려둠).
- **영향 파일**: `client/proxy.ts`(matcher 1줄).
- **예상 결과**: ON → `/login`이 점검 페이지. OFF → `/login` 기존대로. 타입/빌드 무변.
- **검증**: 타입체크/린트. 정상모드 `/login` 통과·점검모드 `/login` 차단 로직 추적.

### 0-2. §0 main 배포 + 토글 드라이런 (rename 선행) — 진행 중

> **목표**: 점검 페이지·게이트(현재 develop만)를 운영(main→Cloud Run)에 **`MAINTENANCE_MODE=false`로** 먼저 심고, 토글이 운영에서 실제 동작하는지 1회 리허설. 사용자 영향 0. rename 때 비로소 ON.

- **버전**: `client/package.json` 0.8.0 → **0.9.0**(minor — develop에 `feat` 점검 페이지·게이트 포함, breaking 없음).
- **머지**: develop→main **fast-forward 가능**(develop..main=0). main 푸시 자동배포 워크플로 없음(배포는 수동 gcloud) → main 푸시 자체는 사용자 영향 없음.
- **배포(사용자 실행)**: `gcloud run deploy`로 새 코드 운영 반영. `MAINTENANCE_MODE` 미설정=OFF라 배포만으론 점검 안 켜짐.
- **드라이런(사용자 실행)**: 운영에서 `MAINTENANCE_MODE` ON → `/maintenance` 확인 → OFF. Cloud Run env 변경은 새 리비전 롤아웃이므로 실제 1회 확인 필요.
- **제약**: 샌드박스에 gcloud·GCP 인증 없음 → 배포·토글은 복붙 명령 제공, 실행은 사용자.
- **드라이런 결과(2026-06-25)**: 0.9.0 운영 배포 후 토글 ON 확인. 홈(`/`)·`/maintenance`·`/login` 모두 게이트 정상 — 단 `/login`은 **Cloudflare가 캐시**해서 맨 URL은 옛 로그인 화면이 떴고, 캐시 무력화 쿼리(`?cb=`)로는 점검 페이지 확인됨. → **앱 게이트(`/login` 누수 수정)는 정상 작동**. CDN 캐시가 변수.
- ⚠️ **rename 실배포 추가 스텝 — Cloudflare 캐시 퍼지**: 점검 ON 직후 **Cloudflare 캐시를 purge**(최소 `/login`, 안전하게 전체)해야 캐시된 페이지가 점검 화면을 새지 않음. 시퀀스: ① 점검 ON → **①' Cloudflare purge** → ② 마이그레이션 → … . 캐시 TTL 만료를 기다리지 말 것.

### 1. 카피·문서 — ✅ 완료 (커밋 `ff8f8a8`)
- 브랜딩 카피: `about.tsx`(태그라인/meta "미용실·뷰티샵을 위한"→ 제거), `README.md`("Salon"→"Reservation & customer management"), `design-guide.html`(placeholder "헤어샵"→"매장")
- 내부 문서: `prisma-seed-runbook.md`·`service-launch-plan.md` 영문 "salon"→"reservation"

### 2. "디자이너" → "담당자" 전면 rename (이름 확정)

> **방식 결정(2026-06-24): 물리 rename(DB 테이블/컬럼까지).** `@@map` 절충안 대신 DB까지 일관. 데이터가 적은 지금 실행(단, `ALTER ... RENAME`은 즉시 메타데이터 연산이라 위험·소요는 데이터 양과 무관 — "지금"의 이점은 다운타임 중 영향 사용자가 거의 0이라는 점뿐).

**확정안:**
- 화면 한글: **디자이너 → 담당자**
- DB/코드 식별자: `Designer → Assignee`, `designerId → assigneeId`, `DesignerSchedule → AssigneeSchedule`, `DesignerStatus → AssigneeStatus`, `Store.designers → Store.assignees`
- URL: `/settings/designer → /settings/assignee`
- 방식: **물리 테이블/컬럼까지 진짜 rename**(`ALTER TABLE ... RENAME`, 데이터 제자리 보존). `@@map` 절충안은 폐기(반쪽 상태가 찝찝 → DB 콘솔까지 일관).

**이름 충돌 검증 완료**: `Member`/`Manager`/`Staff`는 `enum MembershipRole {owner, manager, staff}`(권한 시스템)에서 이미 점유 중 → 사용 불가. `Assignee`는 어디와도 안 겹침(안전).

**⚠️ Prisma 함정**: 모델명만 바꾸고 `prisma migrate`하면 `DROP TABLE Designer` + `CREATE TABLE Assignee`로 생성돼 **데이터 전부 소실**. 반드시 생성된 SQL을 손으로 `ALTER TABLE ... RENAME`으로 교체. FK는 이름이 아닌 정체성 기반이라 RENAME 시 자동 유지됨.

**마이그레이션 SQL (손으로 작성):**
> ⚠️ 테이블/컬럼/enum뿐 아니라 **Postgres 자동생성 제약·인덱스·FK·PK 이름**까지 모두 RENAME해야 함. 안 하면 다음 `prisma migrate`가 drift로 감지 → drop/recreate 시도. 실제 이름은 운영 DB에서 `\d "Designer"`·`\d "DesignerSchedule"`로 **먼저 확인**(아래는 Prisma 기본 네이밍 가정).
```sql
-- 테이블/컬럼/enum
ALTER TABLE "Designer" RENAME TO "Assignee";
ALTER TABLE "DesignerSchedule" RENAME TO "AssigneeSchedule";
ALTER TABLE "AssigneeSchedule" RENAME COLUMN "designerId" TO "assigneeId";
ALTER TABLE "Reservation" RENAME COLUMN "designerId" TO "assigneeId";
ALTER TYPE "DesignerStatus" RENAME TO "AssigneeStatus";
-- PK / unique 인덱스
ALTER INDEX "Designer_pkey" RENAME TO "Assignee_pkey";
ALTER INDEX "Designer_storeId_legacyId_key" RENAME TO "Assignee_storeId_legacyId_key";
ALTER INDEX "DesignerSchedule_pkey" RENAME TO "AssigneeSchedule_pkey";
ALTER INDEX "DesignerSchedule_designerId_dayIndex_key" RENAME TO "AssigneeSchedule_assigneeId_dayIndex_key";
-- FK 제약 (운영 DB 실측으로 확정 — 2026-06-24)
ALTER TABLE "Assignee" RENAME CONSTRAINT "Designer_storeId_fkey" TO "Assignee_storeId_fkey";
ALTER TABLE "AssigneeSchedule" RENAME CONSTRAINT "DesignerSchedule_designerId_fkey" TO "AssigneeSchedule_assigneeId_fkey";
ALTER TABLE "Reservation" RENAME CONSTRAINT "Reservation_designerId_fkey" TO "Reservation_assigneeId_fkey";
-- (확인) Reservation.designerId 단독 인덱스 없음 → RENAME 대상 아님. Reservation 인덱스는 storeId 조합뿐.
```
**위 이름은 운영 DB 실측 결과(`pg_constraint`·`pg_indexes`)와 대조해 확정됨.** 단, 마이그레이션 시점에 스키마가 또 바뀌었을 수 있으니 실행 직전 재확인 권장.
**검증**: 마이그레이션 후 `prisma migrate diff`(또는 `migrate dev`)가 **빈 diff**여야 함(drift 0). diff가 남으면 빠진 제약/인덱스 이름이 있다는 신호.

**진행 상태(2026-06-25)** — 브랜치 `refactor/designer-to-assignee`(커밋 `fdbee67`):
- ✅ `schema.prisma` rename 완료(model/enum/필드/관계, 잔여 Designer 0).
- ✅ 마이그레이션 `0004_rename_designer_to_assignee/migration.sql` 작성(ALTER RENAME, 데이터 보존). enum 값 불변.
- ✅ **정적 검증**: 0001~0003의 Designer DDL 12객체(테이블2·enum1·컬럼2·PK2·unique2·FK3) 전부 0004 RENAME으로 커버. Reservation designerId 단독 인덱스 없음 확인.
- ⏳ **라이브 검증 대기**: 샌드박스에 Postgres 설치 불가(no sudo) → 사용자 로컬에서 `cd client && pnpm prisma:migrate:local` 후 `pnpm prisma:validate` + migrate status로 빈 diff 확인 필요.
- ✅ **코드 rename 완료**(커밋 `bd0f12a`): client 71 + server 11 파일 식별자 치환, 파일/디렉터리 15개 rename(features/assignees·pages/api/assignees·컴포넌트·스토어·유틸·서버API·seed), API URL `/api/designers`→`/api/assignees`, 라우트 `/settings/designer`→`/settings/assignee`, 한글 '디자이너'→'담당자' 전수. **tsc --noEmit 소스 에러 0**. 잔존 designer/디자이너 0.
- ✅ `index.md` 갱신(동일 매핑).
- ✅ **호스트 검증 완료**: `prisma generate` + `pnpm build` + `prisma:migrate:local`(0004 replay) 전부 통과.
- ✅ **운영 전환 완료(2026-06-25)**: §0 시퀀스대로 점검 ON → Cloudflare purge → 운영 DB 0004 적용(세션 풀러 5432) → main 머지·배포(`tas-00071`) → 점검 OFF(`tas-00072`) → 스모크 검증. 버전 0.10.0.
  - ⚠️ **운영 마이그레이션 연결 교훈**: Supabase `db.xxx.supabase.co:5432`(direct)는 **IPv6 전용**이라 Prisma가 P1001. 트랜잭션 풀러 6543은 advisory lock 불가. → **세션 풀러(`...pooler.supabase.com:5432`, 유저명 `postgres.<ref>`)** 로 마이그레이션해야 함.
  - 🐛 **후속 핫픽스(0.10.1, `c7324aa`)**: 담당자 추가 시 `buildAddedAssigneeState`가 신규 legacyId를 `Date.now()`(13자리)로 만들어 Int 컬럼 초과(P2020). 기존 버그(rename 무관, 게스트는 localStorage라 안 터짐)였고 서버 첫 추가에서 발현 → `max(id)+1`로 수정.
- **남은 정리**: 머지된 브랜치 `refactor/designer-to-assignee` 삭제 가능, .git 잠금 잔재(`*.stale`·`*.x*`) 호스트에서 정리 가능.

**작업 범위 (영향 파일):**
- `server/prisma/schema.prisma` — `model Designer`·`model DesignerSchedule`·`enum DesignerStatus`·`designerId` FK(Reservation/DesignerSchedule)·`Store.designers` 관계. ⚠️ **enum 값은 영문**(`active`/`on_leave`/`resigned`) — 타입 이름만 rename(`AssigneeStatus`), **값은 건드리지 말 것**(한글 아님). 한글 `재직/휴직/퇴직`은 프런트 표시값.
- 서버: `/api/designers`→`/api/assignees`(라우트 파일·핸들러), `designers-merge`·`naver-booking-fix-designer`, `server/db/mappers.ts`(`dbReservationToFrontend`의 `designerId` 분기 + **영문↔한글 상태 매퍼 `active:'재직'` 양방향 맵의 `DesignerStatus` 타입 참조**), `resolveDesignerCuid`.
- 클라: store(`calendarStore`·`calendarStoreHelpers`·`calendarStoreDesignerHelpers`), 타입(⚠️ `Designer`/`DesignerStatus`/`DesignerStatusMeta`는 **`features/designers/model.ts`** 정의 + **`utils/designers.ts`가 `export *` 재export**(임포트 다수가 이 배럴 경유) / `designerId?` 필드는 `features/reservations/model.ts`), 온보딩(`onboarding-types` STEP 라벨·`LocalDesigner`), 캘린더 필터(`Header.tsx`), 매출(`revenue*`), 설정(`DesignerManageSection`→`AssigneeManageSection`), URL 라우트(`Aside.tsx:54`, `pages/settings/[tab].tsx`), 모달(`GuestMigrationLayer`·`NaverSyncConflictModal` 등 "디자이너" 문구 다수), PageHero `eyebrow="DESIGNER"`→`"ASSIGNEE"`.
- 표시 문구: 한글 "디자이너"→"담당자" 전수.

**⚠️ 사이트 접속 우려 — rename은 "치환"이라 안전한 배포 순서가 없음**:
- 마이그레이션 먼저 → 옛 코드가 `Designer`/`designerId` 조회 → 500. 배포 먼저 → 새 코드가 `assigneeId` 조회하는데 DB는 아직 `designerId` → 500.
- Cloud Run은 새 리비전 health 통과까지 옛 리비전이 트래픽 받음 → 오버랩 깨짐 불가피.
- 깨지는 화면: 캘린더 로드, 예약 생성/수정, 매출, 담당자 관리, 네이버 동기화 등.
- **대응 = §0 점검중 페이지**로 창 전체를 "점검 중"으로 덮어 500 노출 0. 트래픽 최저 시간대 실행.

**배포 순서 (dev-workflow 메모리)**: 마이그레이션 포함 → main 머지(=배포)와 묶어 §0 시퀀스대로 저트래픽 시간대 실행. 로컬은 `pnpm prisma:migrate:local`.

**미결**: "시술"→"서비스" 동반 변경 여부(별도 판단). 이번 rename 범위엔 미포함.
