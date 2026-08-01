# CLAUDE.md

> 이 저장소에서 Claude가 항상 따라야 할 지시사항. 세션 시작 시 읽는 범위는 `Session Startup Rules` 를 따른다.

## Priority Order
0. **DB Safety (파괴적 작업 금지) — 최우선, 예외 없음**
1. Core Principles
2. Session Startup Rules
3. Development Workflow
4. Work Request Flow
5. Front-End Standards
6. Documentation Maintenance

## DB Safety (파괴적 작업 금지) — 최우선 · 절대 규칙
> 2026-07 운영 DB 전체 삭제 사고 재발 방지. 이 규칙은 다른 모든 지시보다 우선한다. 위반 시 데이터가 영구 소실된다(프리 플랜=백업 없음, 복구 불가일 수 있음).

- **운영(Supabase)에 파괴적 명령 절대 금지.** `prisma migrate reset`, `migrate dev`(reset 유발), `db push --force-reset`, `DROP`, `TRUNCATE`, 대량 `DELETE` 는 운영을 향해 **절대** 실행하거나 사용자에게 안내하지 않는다.
- **파괴적 명령 안내 전, 대상 DB를 반드시 증명한다.** 명령을 주기 전에 먼저 연결 대상 호스트/DB명을 출력해 **로컬임을 확인**한다. `Datasource ... database "<이름>"` 이 로컬 DB(예: `takeaseat`)여야 하며, `*.supabase.co`/pooler(6543)/direct(5432) 운영 호스트면 **중단**한다.
- **로컬 마이그레이션은 저장소의 안전 래퍼를 쓴다.** `pnpm prisma:migrate:local`(`client/scripts/migrate-local.sh`)은 `.env.local`의 `DATABASE_URL`을 `DIRECT_URL`/`DATABASE_URL`로 강제하고, **대상 host가 `localhost`/`127.0.0.1`이 아니면 실행을 거부**한다. URL을 손으로 조립하는 것보다 항상 안전하므로 **이 래퍼를 우선 사용**한다 (`pnpm prisma:migrate:local dev --name <변경명>` / `... status`, `client/`에서 실행).
- **`.env`/`prisma.config.ts` 함정 인지.** `migrate reset`은 `DIRECT_URL ?? DATABASE_URL`을 env/`.env`에서 읽는다. 셸에 운영 URL이 로드돼 있으면 **인라인 URL 없는 bare `migrate reset`이 운영을 지운다.** 래퍼가 없는 명령(리셋 등)을 부득이 직접 돌릴 때는 **항상** 로컬 URL을 인라인으로 명시(`DIRECT_URL="postgresql:///takeaseat" ...`)하고, 실행 후 datasource 줄이 로컬인지 **눈으로 확인한 뒤** 다음 단계로 간다.
- **운영 스키마 변경은 멱등·가산만.** 운영 마이그레이션은 `ADD COLUMN IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS` 등 데이터를 지우지 않는 것만, 수동 선적용 후 검증. reset 계열 금지.
- **드리프트/컬럼 없음 문제를 reset으로 풀지 않는다.** 로컬조차 reset 전에 데이터 보존 대안을 먼저 검토하고, reset이 유일하면 위 대상 증명 절차를 밟는다.
- **확신 없으면 멈추고 물어본다.** 어느 DB인지 불확실하면 파괴적 명령을 주지 말고 사용자에게 확인한다. "일단 돌려보세요"는 금지.

## Core Principles
- If unsure, say so instead of guessing.
- Point out problems with my approach directly.
- If something fails, investigate the root cause before retrying.

## Session Startup Rules
- 세션 시작 시 `plan.md` **전체**와 `index.md`의 **목차 + `횡단 규칙` 섹션**을 읽는다. 이 둘을 읽기 전에는 구현을 시작하지 않는다.
- **`index.md` 전체를 읽지 않는다.** 목차에서 작업 영역에 해당하는 섹션만 펼쳐 읽는다.
- **파일 위치·구조는 `index.md`가 아니라 코드에서 확인한다**(`ls`/`glob`/`grep`). 문서는 코드보다 뒤처질 수 있고, 실제로 라우팅 표에서 빠진 페이지가 있다.
- `index.md`가 값을 갖는 지점은 **코드로 복원할 수 없는 것** — 함정·실패 이력·설계 근거·미구현 범위·법적 판단이다. 이 부분은 반드시 참고한다.
- `plan.md`는 현재 작업·향후 작업의 단일 소스로 삼는다.
- 문서와 구현이 다르면 보고하고 확인을 요청한 뒤 진행한다.

## Development Workflow
- **작업 계획 수립:** 모든 작업을 시작하기 전 `plan.md`를 작성할 것. 요구사항, 구현 방식, 영향받는 파일,
  예상 결과를 기록하고 검토가 끝난 후 코드를 수정할 것. (개발 중 범위가 변경되면 `plan.md` 즉시 업데이트)
- **작업 분할 및 브랜치 생성:** 작업 요청 시 가장 작은 단위의 이슈로 나누고, **`main` 최신본을 기준으로**
  개별 `feature` 브랜치를 생성하여 시작할 것.
  > **왜 `main` 기준인가** — 이 저장소는 feature를 `main`에 **하나씩** 올린다(묶어서 릴리스하지 않는다).
  > 그러면 배포되는 조합은 항상 `main` + 내 것 하나다. 브랜치도 같은 곳에서 따야 **빌드하는 조합 = 배포될 조합**이 된다.
  > `develop`(= 내 것 + 남의 미출시분)을 기준으로 따면 그 둘이 어긋나, 남의 미출시 변경에 기댄 코드가
  > `develop`에선 통과하고 `main`에서만 깨진다.
  >
  > 이건 "묶어서 릴리스하는 방식이 틀렸다"는 뜻이 **아니다.** `develop`을 통째로 승격하는 방식은
  > 검증 덩어리 = 배포 덩어리라 그 자체로 온전하다. 여기서 `main` 기준을 택한 이유는 결함 회피가 아니라
  > **건별 격리** — 내 것만 따로 내보내고 싶어서다. 대신 통합 검증 자리를 잃으므로 아래 두 단계로 메운다.
- **Feature 검증 사이클:** `작업` > `코드리뷰` > `개선` > `검증` > `수정작업` > `코드리뷰` > `개선` > `검증`
  — 이 프로세스를 `feature` 브랜치 내에서 **완벽히 완료**할 것. 리뷰를 건너뛰고 푸시하지 않는다.
  **검증은 여기서 끝난다** — `develop` 통과를 검증으로 갈음하지 않는다.
- **`develop` 통합 테스트:** feature 검증이 끝나면 `develop`에 머지해 **합쳐진 상태를 실제로 구동**한다.
  동시에 굴러가는 다른 feature와 부딪히는지 여기서 본다.
  - **`develop`은 배포 경로가 아니다.** `main`으로 흘러들지 않으므로, **작업을 시작할 때마다 `main`을 받아 최신화**한다
    (`git checkout develop && git merge origin/main`). 안 하면 계속 벌어진다.
  - **여기 통과가 곧 배포 승인은 아니다.** `develop`에서 본 것은 `내 것 + 남의 미출시분`이고, 실제로 나가는 것은
    `main + 내 것 하나`다. **배포될 조합의 최종 확인은 아래 `Main 재동기화`가 담당한다.**
  - 배포 환경은 `main`(Cloud Run) 하나뿐이다. `dev.takeaseat.co.kr`은 배포된 스테이징이 아니라
    **로컬 HTTPS 개발용 호스트명**(`client/README.md`)이다. 스테이징 구축은 미완(`docs/service-launch-plan.md` Phase 6).
- **Main 재동기화 (필수):** PR 직전 `origin/main`을 병합하고 **검증을 다시 통과**시킬 것.
  브랜치를 딴 뒤 `main`이 움직였으면 검증 기준이 낡은 것이다. **이 단계가 이 워크플로의 안전핀이다.**
- **Main 배포:** feature 브랜치에서 `main`으로 PR을 생성하고 머지를 **요청**할 것.
  지시자의 명시적 승인 없이 `main`에 머지하지 않는다.
- **버전 펌핑:** PR 머지 시 변경 규모(Patch / Minor / Major)를 판단하여 버전을 올릴 것. (`package.json`)

## Work Request Flow (업무 처리 절차)
> 사용자가 업무를 요청하면 아래 순서를 따른다. 각 단계는 지정 도구를 사용한다.

**세부 규약:**
- **이슈당 브랜치 · 이슈당 PR.** 브랜치명 `feature/<짧은슬러그>`(또는 `claude/issue-<번호>-<슬러그>`), **`main`에서 분기**. 한 번에 한 이슈.
- **PR 생성까지만 자동 진행.** 검증·리뷰가 그린이면 `main` 대상 PR을 연다. **`main` 머지는 지시자의 명시적 승인이 있을 때만.**
- **라벨**: `feature`/`fix`/`chore`/`refactor`/`docs` + `phase-*` (없으면 생성). 하위 작업 3개 이상이면 상위(에픽) 이슈 + 서브이슈.
- **검증 범위**: 항상 빌드/타입체크·단위 테스트 (`/verify`). **순수 모듈(`client/features/**`, 런타임 import 없음)을 바꿨으면 테스트 필수** — `/test` 규약, CI 게이트가 강제한다. 런타임 변경은 실제 구동. 문서·설정만이면 빌드만.

1. **업무 요청 접수** — 요구사항이 모호하면 먼저 질문해 범위를 확정한다(추측 금지).
2. **이슈 분할·생성** — 작업을 단위로 쪼개 GitHub 이슈를 만든다. 큰 기능은 상위(에픽) 이슈 + 서브이슈. 각 이슈에 배경·작업 체크리스트·완료 조건·관련 파일을 적는다.
3. **작업** — 이슈당 브랜치(`claude/issue-<번호>-<슬러그>`)를 **`origin/main` 최신본에서** 만들어 구현. 커밋은 최소 단위·한국어·conventional prefix (`On Commit` 준수). `plan.md` 계획 선행은 `Development Workflow` 준수.
4. **검증** — `/verify`로 빌드 + 실제 동작 확인(테스트만이 아니라 대상 흐름을 구동).
5. **코드리뷰** — `/code-review`로 현재 diff를 리뷰한다.
   1. **리팩토링** — 리뷰 지적사항 반영 + 재사용·단순화(`/simplify`).
6. **재검증** — 리팩토링 후 다시 빌드·검증.
   1. **`develop` 통합 테스트** — `develop`에 `origin/main`을 먼저 받아 최신화한 뒤 이 브랜치를 머지해 **합쳐진 상태를 구동**한다. 다른 진행 건과의 충돌을 여기서 잡는다. 여기 통과를 **배포 검증으로 치지는 않는다**(본 것은 `내 것 + 남의 미출시분`, 나갈 것은 `main + 내 것`).
   2. **Main 재동기화(필수)** — feature 브랜치에서 `origin/main`을 병합하고 **4~6을 다시 통과**시킨다. 이게 실제로 배포될 조합이며, 여기 통과가 배포 검증이다.
7. **PR 생성** — base는 **`main`**. 본문에 `Closes #<이슈>`를 포함한다. PR 생성 시 CI(`.github/workflows/pr-review.yml` — lint + 빌드/타입체크. AI 리뷰 아님)가 실행된다. **PR 생성 직후 `subscribe_pr_activity`로 자동 구독**하고 별도 승인 없이 CI·리뷰 이벤트를 지켜본다(그린이면 보고, 지적 있으면 4~6단계 반복). 세션이 살아 있어야 웹훅을 받으며, 세션 사후 상시 감시는 보장되지 않는다.
8. **코드 검증** — PR 상태에서 코드를 최종 검증한다(`/verify` 빌드+구동). 자동 리뷰·CI 결과도 함께 확인. 지적이 있으면 4~6을 반복한다.
9. **머지** — 8단계가 그린이고 **지시자 승인이 있으면** `main`으로 머지한다. `package.json` semver 버전 범프(`Development Workflow`). 머지되면 이슈 자동 종료, `index.md`·`plan.md` 갱신(`Documentation Maintenance`).
10. **배포** — `main` 머지 시 **Google Cloud Build 트리거가 자동으로 빌드·Cloud Run 배포**한다(코드). **DB 마이그레이션은 자동화돼 있지 않고**, 스키마 변경 시 사용자가 **Supabase에서 수동으로**(direct 5432) 적용한다. 그래서 스키마 변경 PR은 "**마이그레이션 먼저(수동), 코드 배포(자동) 나중**" 순서를 지킨다 — 머지되면 코드가 자동 배포되므로, 마이그레이션은 그 전에 적용돼 있어야 500이 안 난다.

## Front-End Standards
- **컴포넌트 재사용 우선:** 기존에 구현된 컴포넌트 재사용을 최우선 기준으로 삼을 것.
- **신규 컴포넌트 생성 통제:** 신규 컴포넌트 생성이 불가피할 경우, 코드 작성 전에 반드시
  '새로 만들어야 하는 이유'를 브리핑하고 승인을 받은 후 진행할 것.
- Do not use tag selectors. Use IDs or class names only.
- Follow web standards and accessibility (WCAG) guidelines.
- Prefer semantic HTML elements.
- Use native HTML features before implementing custom JavaScript solutions.
- Use native radio buttons, checkboxes, select boxes, and buttons whenever possible.
- Avoid unnecessary custom UI components that replace built-in browser functionality.

## Documentation Maintenance
- After completing a task, update `index.md` and `plan.md` to reflect the changes.

## On Commit
- Split commits into minimal units of work.
- Write commit messages in Korean.
- Use conventional prefixes: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, etc.
- Always push after committing.
- **세션을 끝낼 때 커밋되지 않은 변경·푸시되지 않은 커밋을 남기지 않는다.** 원격 세션은 일회성 컨테이너라 남은 작업이 소실된다.
