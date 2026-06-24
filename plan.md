# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

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
