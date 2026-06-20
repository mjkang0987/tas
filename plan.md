# 게스트 → 계정 데이터 마이그레이션 (병합 플로우) 계획
## 상태 확인 후 완료되었으면 스킵

> **진행 현황 (2026-06-12, 완료)**: 서버(`/api/migrate-local`, `/api/designers/merge`) + 클라이언트(`GuestMigrationLayer` 확인 레이어·디자이너 병합 레이어·로컬 정리, `_app.tsx` 분기)까지 전부 구현 확인 → **스킵 처리**.

## 배경 / 문제
- 게스트 모드는 모든 데이터를 `localStorage`(`takeaseat.local-db.v1`)에 저장.
- 현재 게스트→SNS 연동 시 마이그레이션(`_app.tsx`)은 **온보딩 API(`/api/onboarding`)를 재사용** → `shopName/shopType/services/designers`만 전송. **고객·예약은 전송 안 됨.**
- 마이그레이션 후 `snapshot.onboarded = false`만 세팅하고 **로컬 데이터는 정리하지 않음** → 나중에 로그아웃→게스트가 되면 잔여 데이터(매장명·고객)가 되살아남.
- 증상: 게스트에서 "고객확인(병합) 모달"·"매장명"이 뜸 = localStorage에 잔여 데이터가 있다는 신호.

## 진입 분기 (게스트가 SNS 연동 → 인증, 로컬 데이터 있음)
서버 응답으로 자동 구분 (이미 서버 가드가 구분해줌):
- **빈 매장 (신규, `200`)** → 게스트 데이터 **전체 자동 이전** → 로컬 정리
- **기존 데이터 있는 매장 (`409` ALREADY_SETUP)** → **확인 레이어** 표시:
  > "기존 **[매장명]** 데이터가 있습니다. 병합하시겠습니까?  **[병합]** / **[삭제]**"
  - **삭제** → 로컬 데이터 정리(폐기)
  - **병합** → 아래 병합 스텝 진행

## 병합 스텝 (케이스 2 - 병합 선택 시)
1. **게스트 데이터 append** — 서버 트랜잭션에서 **ID remap**(기존 max legacyId 뒤로 재배치, 예약의 고객/디자이너 참조도 매핑) 후 추가. *기존 매장 데이터는 절대 덮어쓰지 않음(append/upsert만).*
2. **디자이너 병합 레이어** (신규) — 중복/대응 디자이너를 사용자가 병합 (예약 재배정 + 게스트 디자이너 정리)
3. **고객 병합** — 기존 `useCustomerMergeSuggestion`(고객확인 모달)이 append된 고객 중복 자동 감지 (재사용)
4. **중복예약 확인** — 기존 기능 (재사용)
5. **로컬 정리**

## 구현 항목
### 서버
- (A) 마이그레이션 엔드포인트 — 전체 데이터(services/designers/customers/reservations) 수신. 빈 매장=생성 / 기존=remap 후 append. 트랜잭션.
- (B) 디자이너 병합 엔드포인트 — `POST /api/designers/merge` (source→target, 예약 재배정 후 source 삭제)

### 클라이언트
- (C) 진입 감지·분기 — 현 `_app.tsx` 마이그레이션 로직을 이걸로 확장
- (D) "기존 매장 데이터 병합/삭제" 확인 레이어
- (E) 디자이너 병합 레이어 (고객 병합 모달과 동일 톤)
- (F) 병합 완료 후 로컬 정리

## 재사용 / 신규
- 재사용: 고객 병합(`useCustomerMergeSuggestion`), 중복예약 확인
- 신규: 디자이너 병합(엔드포인트 + 레이어), 확인 레이어, 마이그레이션 엔드포인트

## 리스크 / 주의
- **ID 충돌**: 고객 PUT은 `storeId_legacyId` upsert. 게스트 로컬 ID(1,2,3…)가 기존 매장 ID와 충돌하면 덮어씀 → **서버 트랜잭션에서 remap 필수**.
- 부분 실패 → 트랜잭션 롤백.
- 기존 매장 데이터 보존 → append/upsert만, replace 금지.

## 권장 진행 순서 (단계별 검증)
1. 서버 마이그레이션 엔드포인트 (빈매장 전체이전 + 기존매장 append remap)
2. 확인 레이어 + `_app` 분기 연결
3. 디자이너 병합 (엔드포인트 + 레이어)
4. 로컬 정리 + 전체 흐름 검증

## 사전 확인
- 기존에 디자이너 병합 기능이 정말 없는지 확인 후 시작.

## 관련 코드 위치
- 마이그레이션: `client/pages/_app.tsx` (게스트→SNS 마이그레이션 effect)
- 온보딩 API: `server/api/onboarding.ts` (현재 setup 데이터만 수신, 409 가드)
- 고객 API: `server/api/customers.ts` (PUT = legacyId upsert)
- 예약 API: `server/api/reservations.ts` (POST = 단건 생성)
- 고객 병합: `client/hooks/useCustomerMergeSuggestion.ts`
- 로컬 DB: `client/features/local-db/storage.ts`

---

# 폴더 경계 정리 계획 (client / server)

> **진행 현황 (2026-06-12, 완료)**: Phase 1(`a98f938`)·Phase 2(`a413b37`) 완료. 단, generated 클라이언트는 빌드 산출물이라 `client/prisma/generated`에 유지 — 패키지 루트(client) 밖으로 옮기면 `@prisma/client/runtime` 해석이 깨짐(tsc·node 시드 모두). DB 연결이 필요한 검증(migrate status diff, 시드, 카운트 비교)은 원격 환경 제약으로 미실행 — 로컬에서 1회 확인 권장. 추가로 nodemailer 의존성 누락·server/ bare import 해석 문제 수정(`f67c680`)으로 `next build` 그린.

## 배경 / 문제
이 repo는 단일 패키지(패키지 루트 = `client/`, `server/`는 Next 앱이 import하는 소스 폴더)라서 백엔드 자산이 client 쪽에 섞여 있음.

1. **계정·멤버 API 로직이 `client/pages/api/`에 인라인** — 컨벤션("진입 파일은 한 줄 re-export, 로직은 `server/`")을 위반.
   대상: `members.ts`, `invites.ts`, `account/{link,linked,unlink,merge,merge-preview,delete}.ts`, `user/{stores,nickname}.ts`
2. **Prisma 자산이 `client/prisma/`에 위치** — schema/migrations/generated/seed가 client에 있고, `server/db/prisma.ts` 등 백엔드가 `../../client/prisma/generated/...`를 **역참조**.

## 목표 구조
```
client/pages/api/**   → 전부 한 줄 re-export (Next.js 라우팅 제약상 위치만 유지)
server/api/           → 도메인 데이터 HTTP 핸들러 (현행 유지)
server/api/account/   → 계정 연동·병합·탈퇴 핸들러 (이전)
server/api/user/      → stores, nickname 핸들러 (이전)
server/api/members.ts, invites.ts (이전)
server/prisma/        → schema.prisma, migrations/, generated/, seed.mjs, seed-data/
```
- `client/auth.ts`(NextAuth 설정)·`client/proxy.ts`(미들웨어)는 Next 런타임 제약상 client 유지.
- 패키지 루트(`client/package.json`)는 그대로 — Prisma CLI는 client에서 실행하되 경로만 `prisma.config.ts`로 지정.

## Phase 1 — 계정·멤버 API 로직 이전 (저위험)
1. `client/pages/api/`의 인라인 핸들러 10개를 `server/api/`(account/, user/ 하위 포함)로 이동
2. `client/pages/api/*`는 `export {default} from '../../../server/api/...'` 한 줄로 교체
3. 이동 파일의 상대 import 경로 조정 (`client/auth` → `../../client/auth` 등)

### Phase 1 검증
```bash
# 1) 타입 체크 (client/에서)
npx tsc --noEmit                          # 소스 에러 0 (.next/ 제외)

# 2) 인라인 로직 잔존 확인 — client/pages/api에 prisma/auth 직접 사용이 남으면 안 됨
grep -rlE "from '.*server/db|prisma\.|getApiSession" client/pages/api/ \
  | grep -v "auth/\[\.\.\.nextauth\]"     # 결과 0건이어야 함 (re-export만 존재)

# 3) 메서드 가드 보존 — 각 라우트 405 응답 확인 (미로그인 curl)
for p in members invites account/linked user/stores; do
  curl -s -o /dev/null -w "%{http_code} /api/$p\n" -X OPTIONS http://localhost:3000/api/$p
done                                       # 이동 전후 응답코드 동일해야 함
```
**수동 시나리오 (dev, 로그인 상태):**
- 멤버 관리: 목록 조회 → 역할 변경(PATCH) → 멤버 제거(DELETE) 토스트 확인
- 초대코드: 생성(POST) → 목록(GET) → 취소(DELETE)
- SNS 연동: `/settings/sns` 연결 목록(linked) 표시, 연결 해제(unlink)
- 계정 병합: 충돌 계정 연결 시 merge-preview 모달 → 병합(merge)
- StoreSwitcher: 매장 목록(user/stores) → 매장 전환 → 데이터 변경 확인
- 닉네임 변경(user/nickname), 회원탈퇴 모달 진입(account/delete는 실탈퇴라 UI 진입까지만)

## Phase 2 — Prisma 자산 server 이전 (중위험)
1. `client/prisma/{schema.prisma, migrations/, seed.mjs, seed-data/}` → `server/prisma/`로 이동
2. `schema.prisma` generator `output` → `server/prisma/generated` (상대경로 재계산)
3. `client/prisma.config.ts` 경로 수정: `schema: '../server/prisma/schema.prisma'`, `migrations.path`, `seed` 명령 경로
4. generated import 경로 수정 — 사용처 8곳 (사전 grep 확인됨):
   - `server/db/prisma.ts`, `server/db/mappers.ts`, `server/auth/sync-auth-user.ts`
   - `server/api/services.ts`, `server/api/naver-booking-sync.ts`, `server/api/gmail/helpers.ts`
   - `client/scripts/verify-seed.mjs`, `client/scripts/backfill-designer-legacyid.mjs`
   - (+ `seed.mjs` 내부의 `./generated/...` 상대 import)
5. `.gitignore`의 `client/prisma/generated/` → `server/prisma/generated/`로 갱신

### Phase 2 검증
```bash
# 0) 사전 스냅샷 (이동 전 기준 상태 기록)
pnpm prisma:migrate:status > /tmp/migrate-before.txt
psql "$DATABASE_URL" -c "SELECT
  (SELECT count(*) FROM \"Reservation\") AS r,
  (SELECT count(*) FROM \"Customer\") AS c,
  (SELECT count(*) FROM \"Designer\") AS d,
  (SELECT count(*) FROM \"Service\") AS s;" > /tmp/counts-before.txt

# 1) 생성·검증 체인 (client/에서)
pnpm prisma:validate && pnpm prisma:generate   # 새 경로로 생성 성공
npx tsc --noEmit                                # 소스 에러 0

# 2) 옛 경로 참조 잔존 0건 확인
grep -rn "client/prisma/generated" client/ server/ \
  --include="*.ts" --include="*.tsx" --include="*.mjs" \
  | grep -vE "\.next/|node_modules/"            # 0건이어야 함

# 3) 빌드 + 마이그레이션 상태 동일성
npm run build
pnpm prisma:migrate:status > /tmp/migrate-after.txt
diff /tmp/migrate-before.txt /tmp/migrate-after.txt   # 차이 없어야 함

# 4) 시드 무결성 (read-only 검증)
pnpm prisma:verify-seed

# 5) 데이터 불변 확인
psql "$DATABASE_URL" -c "(위 카운트 쿼리 재실행)" | diff /tmp/counts-before.txt -
```
**수동 시나리오 (dev 기동 후):**
- 로그인 → 캘린더에 예약/고객/디자이너 정상 로드 (DB 연결 전체 경로 스모크)
- 예약 1건 생성 → 수정 → 취소 (쓰기 경로 확인)
- 네이버 동기화 버튼 1회 (gmail/helpers의 generated import 경로 확인)
- 백필 스크립트 dry-run: `node scripts/backfill-designer-legacyid.mjs --dry-run`

## 주의사항
- **Phase 2는 마이그레이션 워크플로우를 건드림** — 이동 전 `prisma migrate status`로 히스토리 정상 여부 먼저 확인 (db push/migrate 혼용 중)
- 두 Phase는 독립 — 각각 별 커밋, Phase 끝날 때마다 빌드 검증
- 순수 파일 이동 + 경로 수정만 (동작 변화 0). 로직 리팩터는 섞지 않음
- Vercel/배포 스크립트가 `client/prisma` 경로를 하드코딩하는지 배포 설정 확인 (`docs/deployment-runbook.md`)

## 공통 검증 원칙
- 커밋 전 `git diff --stat`으로 의도한 파일만 변경됐는지 확인 (이동 = rename으로 잡혀야 함, `git mv` 사용)
- 검증 실패 시 해당 Phase 전체 revert (부분 수정으로 끌고 가지 않음)
- 각 Phase 완료 후 dev 서버 재시작 기준으로 검증 (핫리로드는 라우트/경로 변경을 못 잡는 경우 있음)

## 진행 순서 권장
Phase 1(API 이전) 먼저 — 위험이 낮고 즉시 경계가 깔끔해짐. Phase 2(Prisma)는 배포 런북 확인 후 별도 진행.

# 구글 계정 email 사용 연동 추가

> **진행 현황 (2026-06-12, 완료)**: `30cf145`. 구글 로그인은 로그인 전용(스코프 축소), Gmail 연동은 별도 플로우(`/api/gmail/connect→oauth-callback`, GmailConnection 테이블, 계정 선택 화면 강제)로 분리. 실패 시 `/settings/naver?gmail=error` 리다이렉트 + 안내 레이어. **배포 전 필수**: Google Cloud 콘솔 OAuth 클라이언트에 리다이렉트 URI `{origin}/api/gmail/oauth-callback` 등록, DB 마이그레이션(`202606120001_gmail_connection`) 적용.
## 시나리오
### 구글 게정 로그인
1. 로그인 기능만 사용 
2. 이메일 자동 연동 하지 않음

### aside - 네이버 예약 연동으로 gmail 연동
1. gmail 연동 버튼 추가
- 연동버튼 선택 시 구글 게정 선택 화면
  - 로그인계정 / gmail 계정 다르게 사용 가능 에정

## 검증
- 작업 완료 이후 문제 없는지 검증 필수
- 부수효과 발생여부 확인
- 연동 실패 시 redirect + 실패 안내 레이어 추가


# 패스 잘못 진입 시 리다이렉트 혹은 에러 페이지 구성

> **진행 현황 (2026-06-12, 완료)**: 404/500 안내 페이지는 기존(aa3be11) 디자인 적용 확인. 404에 5초 카운트다운 자동 홈 리다이렉트 추가(`3938299`). 잘못된 설정 탭 경로는 기존 `getServerSideProps` 리다이렉트로 처리됨.
- 디자인 가이드 맞춰서 안내 페이지 제작
- 올바른 페이지로 리다이렉트 기능 구현

---

# 릴리즈 준비 — UI 정리 + 광고

> **진행 현황 (2026-06-18, 진행 중)**: 아래 UI 정리 작업 완료, 커밋 대기. 광고제거 기능은 미착수(아래 별도 섹션).

## 배포 방향 (확정)
- 호스팅: **Cloud Run 무료 티어 + Neon(무료 Postgres) + Cloudflare(DNS) + 블로그는 Cloudflare Pages**. 비용 0 + 상업용 제한 없음(Vercel Hobby는 광고/상업 불가라 제외).
- 도메인: `takeaseat.co.kr`(TAS), `blog.takeaseat.co.kr`(블로그), `clipnote.co.kr`(별도 앱). 호스팅과 독립 — DNS만 맞추면 됨.
- 광고: Google AdSense (이미 `AdBanner` 구현됨). 릴리즈 시 ① `NEXT_PUBLIC_ADSENSE_CLIENT`/슬롯 설정 ② `/ads.txt` 추가 ③ AdSense 사이트 승인.

## 완료한 UI 작업 (커밋 대기)
1. **aside 약관 링크 정리** — 이용약관·개인정보처리방침·개인정보 처리위탁을 한 줄 `·` 나열 → 세로 스택 + 왼쪽 정렬, 구분자(`StyledLegalSeparator`) 제거. (`components/layout/Aside.tsx`, `Aside.styles.ts`)
2. **인증 화면 광고 추가** — 로그인·온보딩(게스트 포함)·약관동의 카드 아래 `AdBanner` 추가, 공용 슬롯 `NEXT_PUBLIC_ADSENSE_AUTH_SLOT`. (`pages/login.tsx`, `pages/onboarding/index.tsx`, `pages/consent.tsx`, `.env.example`)
3. **모바일 aside z-index 수정** — 모바일 aside `z-index 200 → 99`. 드로어가 모달 대역(`OVERLAY_Z_INDEX` 100~190)보다 위라 aside 내부에서 여는 모달(게스트 로그아웃 등)이 가려지던 버그 해결. (`Aside.styles.ts`)
4. **모바일 인증 화면 박스 제거** — 로그인·온보딩·약관동의 카드를 ≤640px에서 풀블리드로(그림자·라운드·고정폭 제거, 페이지 좌우 패딩 0). 배경이 흰색이라 박스 없이 풀스크린처럼 보임. 광고도 모바일에서 가로 꽉 + 좌우 인셋으로 정렬, 폴드 위 노출(카드 `flex:1` 제거).

## 커밋 단위 (Korean, conventional)
1. `style: aside 약관 링크 세로 정렬로 정리`
2. `feat: 로그인·온보딩·약관 동의 화면에 광고 추가`
3. `fix: 모바일에서 게스트 로그아웃 레이어가 aside에 가려지는 문제 수정`
4. `style: 모바일 인증 화면 박스 디자인 제거 및 광고 정렬`

---

# 광고제거(ad-free) 계정 분기 — "광고제거 키"

> **진행 현황 (2026-06-18, 계획)**: 미착수. 결정 확정 — **사용자(User) 단위 / 영구 해제(Boolean) / 운영자 수동 발급(CLI)**.

## 배경 / 정책
- 일부 계정에 광고를 노출하지 않도록 "광고제거 키"를 발급. 유저가 키 입력 → 해당 **유저 계정**이 영구 ad-free.
- ⚠️ 발급은 **운영자만** (CLI 스크립트). 인앱 발급 API는 만들지 않음 — 만들면 일반 유저가 스스로 광고를 끌 수 있어 수익화가 무너짐.
- 게스트는 계정이 없으므로 ad-free 대상 아님(항상 광고 노출).
- 기존 **초대코드 시스템**(`server/auth/invite.ts`, `pages/api/invites.ts`, `Invite` 모델) 패턴을 그대로 미러링.

## 구현 항목
### 1. DB 스키마 (`server/prisma/schema.prisma`) — 마이그레이션 필요
- `User`에 `adFree Boolean @default(false)` 추가
- `AdRemovalKey` 모델 추가 (Invite 미러):
  ```prisma
  model AdRemovalKey {
    id           String    @id @default(cuid())
    code         String    @unique
    redeemedById String?
    redeemedAt   DateTime?
    createdAt    DateTime  @default(now())
    redeemedBy   User?     @relation(fields: [redeemedById], references: [id])
  }
  ```
  - `User`에 역관계 `adKeysRedeemed AdRemovalKey[]` 추가

### 2. 서버 로직 (`server/auth/ad-key.ts`)
- `generateAdKey()` — invite의 CHARSET/6자리 재사용
- `validateAdKey(code)` — not-found / used / valid
- `redeemAdKey(code, userId)` — 트랜잭션: 키 소비(`redeemedAt`, `redeemedById`) + `user.adFree = true`

### 3. 세션 전파 (`auth.ts`, `types/next-auth.d.ts`)
- jwt 콜백의 기존 `consentUser` select에 `adFree` 추가 → `token.adFree`
- session 콜백에서 `session.user.adFree = token.adFree`
- `types/next-auth.d.ts`의 `Session['user']`에 `adFree?: boolean`

### 4. 사용처리 API (`pages/api/ad-keys/redeem.ts` → `server/api/...` 한 줄 re-export)
- `POST { code }` → 인증 필요, `redeemAdKey`, 성공 시 세션 갱신 유도(클라에서 `update()`)

### 5. 클라 게이트 (단일 차단점)
- `store/calendarStore.ts`에 `adFree: boolean` + setter
- `_app.tsx`에서 `session.user.adFree`로 세팅
- `components/ad/AdBanner.tsx`에서 `adFree`면 `return null` — 모든 광고 위치(aside·footer·인증화면) 일괄 차단

### 6. 설정 UI
- 설정 화면에 "광고 제거 코드 입력" 섹션 (MemberSection 초대 입력 패턴 재사용). 이미 ad-free면 "광고 제거됨" 상태 표시.

### 7. 운영자 키 발급 (`scripts/gen-ad-key.mjs`)
- CLI로 키 N개 생성·DB insert·출력. 운영자가 고객에게 전달.

## 리스크 / 주의
- **DB 마이그레이션** — 운영 DB 영향. 마이그레이션 실행 주체/방식 별도 확인(`prisma migrate dev` vs 수동).
- 키는 운영자만 발급 — 인앱 발급 API 금지(수익화 보호).
- `adFree`는 매 요청 jwt 갱신이라 키 사용 직후 `update()` 호출로 즉시 반영.

## 진행 순서 권장
1. 스키마 + 마이그레이션 → 2. 서버 로직 + 세션 전파 → 3. 클라 게이트(AdBanner) → 4. redeem API + 설정 UI → 5. 발급 스크립트 → 6. 전체 흐름 검증(키 발급 → 입력 → 광고 사라짐 확인)

---

# 로그인/인증 안정화 — OAuth 진단 + 초대 링크 + 인앱 브라우저 대응

> **진행 현황 (2026-06-20, 완료)**: 아래 항목 구현·검증·푸시 완료(`claude/angdae-issue-gym218`). 커밋 `54cf696`(로고 링크), `dd816c5`(초대 링크), `43ea35c`(온보딩 step0 되돌림), `c73a2c6`(인앱 브라우저).

## 배경 / 문제 (QA·운영 제보)
- Google/Kakao 로그인 실패 → 원인은 **콘솔 설정**(인앱브라우저 `disallowed_useragent`, 카카오 redirect URI 미등록)으로 규명. **코드 수정 불필요**(콘솔에 `https://takeaseat.co.kr/api/auth/callback/{google,kakao}` 등록 필요).
- 초대코드로 로그인했는데 새 매장이 생성됨 → 초대가 **수동 코드 입력**으로만 적용되고 "링크"가 없어서, 코드 미입력 시 `syncAuthUser`가 새 매장(owner) 경로로 빠짐.
- 카카오톡 등 인앱 브라우저에서 구글 로그인 차단 → 사용자가 막힘.

## 구현 항목 (완료)
1. **로그인 로고 → 루트(/) 링크** (`pages/login.tsx`) — `next/link`로 감싸 홈 이동.
2. **초대 링크 지원** (`pages/login.tsx`) — `/login?invite=CODE` 진입 시 코드 자동입력 + `tas-invite-code` 쿠키 세팅(대문자화·6자 슬라이스). 콜백에서 초대 매장 합류. 쿠키 `secure`는 https에서만 부여(로컬 http 누락 방지).
3. **초대 링크 복사** (`components/settings/MemberSection.tsx`) — 코드/링크 복사 버튼 + 안내 문구.
4. **인앱 브라우저 대응** (`pages/login.tsx`) — WebView(KakaoTalk·Instagram·Naver·Line·FB·Threads 등) 감지 → 안내 배너 + "외부 브라우저로 열기"(카카오 스킴/안드로이드 chrome intent/iOS 복사 폴백) + 카카오 로그인 우선 정렬.
5. **온보딩 step0 노출 변경 → 되돌림** — SNS 사용자에게 step0(30초 인트로) 노출은 불필요하여 원복.

## 검증 (실제 브라우저 구동, Playwright)
- 초대: `/login?invite=abc123` → 입력칸 `ABC123` + 쿠키 세팅, 8자 입력 시 6자 슬라이스, 미지정 시 빈값. ✅
- 인앱: KakaoTalk UA → 배너 노출 + 카카오 우선 정렬 / 일반 UA → 배너 없음 + 기본 순서. ✅
- 타입체크 + `next build` 그린.

## 후속 / 미해결
- **버그2(온보딩 중 로그인으로 튕김)**: 초대 흐름 수정으로 해소 가능성 → 운영 재테스트 대기. 재현 시 튕기는 시점 + 콘솔 에러 필요.
- **OAuth 콘솔 작업(코드 외)**: Google/Kakao 콘솔 redirect URI 등록, Cloudflare SSL=Full(strict), Google 동의화면 프로덕션 게시.
- **Gmail 제한범위(`gmail.readonly`) 인증**: 데모영상 + CASA 보안평가 필요(별도).

---

# AdSense 광고 붙이기 (퍼블리셔 ID 주입)

> **진행 현황 (2026-06-20, 완료)**: 퍼블리셔 ID `ca-pub-5655041057903258` 코드 기본값 주입 + ads.txt 갱신. 운영 모드 검증 — `/login` HTML에 로더 스크립트 삽입, `/ads.txt` 정상 응답, `next build` 그린. 후속: AdSense 콘솔 사이트 승인 + 자동광고 ON, 개별 유닛용 슬롯 ID 발급.

## 배경
- 광고 인프라는 이미 구축됨: `_document.tsx`가 `NEXT_PUBLIC_ADSENSE_CLIENT` 존재 시 AdSense 로더 스크립트 자동 삽입, `AdBanner` 컴포넌트(`<ins class="adsbygoogle">`)와 배치(푸터·로그인·온보딩·동의)도 존재.
- 미설정이던 퍼블리셔 ID만 주입하면 페이지 레벨 스크립트(자동 광고) 활성화.

## 요구사항 / 접근
- 퍼블리셔 ID: `ca-pub-5655041057903258` (ads.txt용 publisher id: `pub-5655041057903258`).
- `NEXT_PUBLIC_*`는 빌드타임 인라인이라 배포 env 미설정 시 광고가 안 뜸 → **코드에 기본값**을 두어 env 없이도 동작하게 함(env로 오버라이드 가능). 퍼블리셔 ID는 페이지 소스에 노출되는 공개값이라 하드코딩 무방.

## 영향 파일
- `client/lib/ads.ts` (신규) — `ADSENSE_CLIENT` 단일 소스(env ?? 기본값).
- `client/components/ad/AdBanner.tsx` — 로컬 상수 → `lib/ads` 사용.
- `client/pages/_document.tsx` — 로더 스크립트도 `lib/ads` 사용.
- `client/public/ads.txt` — 실제 게시자 라인 활성화.
- `client/.env.example` — 기본값 안내.

## 기대 결과 / 검증
- 운영 빌드에서 `<head>`에 `adsbygoogle.js?client=ca-pub-5655041057903258` 로더 삽입.
- `/ads.txt` → `google.com, pub-5655041057903258, DIRECT, f08c47fec0942fa0` 응답.
- `next build` 그린.

## 주의 / 후속
- 개별 광고 유닛(`AdBanner`)은 **슬롯 ID**(`NEXT_PUBLIC_ADSENSE_FOOTER_SLOT`/`AUTH_SLOT`)가 있어야 `<ins>`가 렌더됨 — 슬롯은 AdSense 콘솔에서 발급 후 env 설정 필요. 그 전까지는 페이지 레벨(자동 광고)만 동작.
- AdSense 사이트 승인 + 콘솔에서 자동광고 ON 필요.

---

# run.app 도메인 정규화 + 온보딩 로고 링크

> **진행 현황 (2026-06-20, 완료)**: 구현·검증·푸시(`claude/angdae-issue-gym218`). 온보딩 로고 링크(`6ba521b`), run.app 정규화 리다이렉트.

## 배경
- 네이버앱이 Cloud Run 기본 URL(`tas-...run.app`)로 연결됨. 이 URL 접속은 OAuth 콜백/세션 쿠키/AdSense가 모두 `takeaseat.co.kr` 기준이라 **로그인이 깨짐**.

## 구현 (완료)
- `proxy.ts`: host가 `*.run.app`이면 같은 경로로 `https://takeaseat.co.kr`로 **308 영구 리다이렉트**. matcher에서 `login` 제외 해제(로그인 페이지도 정규화 적용).
- `onboarding/index.tsx`: 헤더 로고 → 루트(/) 링크(로그인 화면과 동일).

## 검증 (next start, Host 헤더 시뮬레이션)
- `Host: tas-...run.app` → `/about`·`/login?invite=...` 모두 308 → `takeaseat.co.kr`(경로·쿼리 보존). 일반 Host는 200. `next build` 그린.

## 후속 (코드 외)
- 네이버 스마트플레이스/예약에 등록된 사이트 URL을 `https://takeaseat.co.kr`로 교체(근본).

---

# 중복예약(충돌) 모달 안 뜨는 회귀 수정

> **진행 현황 (2026-06-20, 완료)**: `useNaverBookingSync.ts` 2곳 수정. 빌드/타입체크 그린. 런타임(클릭 동작)은 Gmail 충돌 데이터+로그인 필요라 배포 후 모바일 확인 요망.

## 근본 원인
충돌 모달을 여는 경로가 **현재 캘린더에 로드된 예약(reservationMap)에 그 두 예약이 있어야만** 동작. 다른 날짜를 보면:
1. `restoreConflictsFromPairs`가 미로드 예약 충돌을 버림 → `saveActiveConflictPairs(merged)`가 저장본을 덮어써 영구 삭제
2. `openConflictByKey`가 reservationMap에서 못 찾으면 조용히 `return` → 모달 안 뜸
→ "처음엔 떴다가 다른 날짜 보면 영구히 안 뜨는" 회귀.

## 수정 (2곳, `useNaverBookingSync.ts`)
1. `restoreConflictsFromPairs`: 미로드 예약을 버리지 않음. 현재 로드된 범위에서 **취소/노쇼로 확인된 경우만** 제외 → 저장본이 보존됨(덮어쓰기 시에도 유지).
2. `openConflictByKey`: 폴백을 `loadActiveConflictPairs()` 스냅샷 우선으로 → 어떤 날짜든 모달 오픈, 조용한 return 제거.

## 알려진 한계 / 후속
- 감지 effect의 자동확정(line~162)은 여전히 로드된 감지(detectedKeys)만 기준이라, 미로드 충돌이 'confirmed' 상태로 표시될 수 있음(모달은 열림). 카운트 정확도까지 원하면 별도 보강.
 