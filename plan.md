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