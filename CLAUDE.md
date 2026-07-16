# CLAUDE.md

> 이 저장소에서 Claude가 항상 따라야 할 지시사항. 세션 시작 시 `index.md`·`plan.md`와 함께 읽는다.

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
- **`.env`/`prisma.config.ts` 함정 인지.** `migrate reset`은 `DIRECT_URL ?? DATABASE_URL`을 env/`.env`에서 읽는다. 셸에 운영 URL이 로드돼 있으면 **인라인 URL 없는 bare `migrate reset`이 운영을 지운다.** 로컬 리셋은 **항상** 로컬 URL을 인라인으로 명시(`DIRECT_URL="postgresql:///takeaseat" ...`)하고, 실행 후 datasource 줄이 로컬인지 **눈으로 확인한 뒤** 다음 단계로 간다.
- **운영 스키마 변경은 멱등·가산만.** 운영 마이그레이션은 `ADD COLUMN IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS` 등 데이터를 지우지 않는 것만, 수동 선적용 후 검증. reset 계열 금지.
- **드리프트/컬럼 없음 문제를 reset으로 풀지 않는다.** 로컬조차 reset 전에 데이터 보존 대안을 먼저 검토하고, reset이 유일하면 위 대상 증명 절차를 밟는다.
- **확신 없으면 멈추고 물어본다.** 어느 DB인지 불확실하면 파괴적 명령을 주지 말고 사용자에게 확인한다. "일단 돌려보세요"는 금지.

## Core Principles
- If unsure, say so instead of guessing.
- Point out problems with my approach directly.
- If something fails, investigate the root cause before retrying.

## Session Startup Rules
- At the start of a new session, read `index.md` and `plan.md` first.
- Do not begin implementation until `index.md` and `plan.md` have been reviewed.
- Use `index.md` as the source of truth for the project structure and current status.
- Use `plan.md` as the source of truth for current tasks and future work.
- If the documentation and implementation differ, report the discrepancy and request confirmation before proceeding.

## Development Workflow
- Before starting any task, create a `plan.md` file (or add a section to it).
- Document requirements, implementation approach, affected files, and expected outcomes in `plan.md`.
- Review and finalize the plan before making code changes.
- Update `plan.md` if the implementation scope changes during development.
- When merging, bump the version in `package.json`. Determine the appropriate semver bump (patch / minor / major) based on the changes in the PR.

## Work Request Flow (업무 처리 절차)
> 사용자가 업무를 요청하면 아래 순서를 따른다. 각 단계는 지정 도구를 사용한다.

**세부 규약:**
- **이슈당 브랜치 · 이슈당 PR.** 브랜치명 `claude/issue-<번호>-<짧은슬러그>`, `main`에서 분기. 한 번에 한 이슈.
- **자동 머지.** 8단계(코드검증·자동리뷰·CI)가 모두 그린이면 사용자 승인 없이 머지한다.
- **라벨**: `feature`/`fix`/`chore`/`refactor`/`docs` + `phase-*` (없으면 생성). 하위 작업 3개 이상이면 상위(에픽) 이슈 + 서브이슈.
- **검증 범위**: 항상 빌드/타입체크. 런타임 변경은 `/verify`로 구동. 문서·설정만이면 빌드만.

1. **업무 요청 접수** — 요구사항이 모호하면 먼저 질문해 범위를 확정한다(추측 금지).
2. **이슈 분할·생성** — 작업을 단위로 쪼개 GitHub 이슈를 만든다. 큰 기능은 상위(에픽) 이슈 + 서브이슈. 각 이슈에 배경·작업 체크리스트·완료 조건·관련 파일을 적는다.
3. **작업** — 이슈당 브랜치(`claude/issue-<번호>-<슬러그>`)를 `main`에서 만들어 구현. 커밋은 최소 단위·한국어·conventional prefix (`On Commit` 준수). `plan.md` 계획 선행은 `Development Workflow` 준수.
4. **검증** — `/verify`로 빌드 + 실제 동작 확인(테스트만이 아니라 대상 흐름을 구동).
5. **코드리뷰** — `/code-review`로 현재 diff를 리뷰한다.
   1. **리팩토링** — 리뷰 지적사항 반영 + 재사용·단순화(`/simplify`).
6. **재검증** — 리팩토링 후 다시 빌드·검증.
7. **PR 생성** — 본문에 `Closes #<이슈>`를 포함한다. PR 생성 시 자동 코드리뷰 Action(`.github/workflows/pr-review.yml`)이 실행된다. **PR 생성 직후 `subscribe_pr_activity`로 자동 구독**하고 별도 승인 없이 CI·리뷰 이벤트를 지켜본다(그린이면 보고, 지적 있으면 4~6단계 반복). 세션이 살아 있어야 웹훅을 받으며, 세션 사후 상시 감시는 보장되지 않는다.
8. **코드 검증** — PR 상태에서 코드를 최종 검증한다(`/verify` 빌드+구동). 자동 리뷰·CI 결과도 함께 확인. 지적이 있으면 4~6을 반복한다.
9. **머지** — 8단계가 그린이면 자동 머지. `package.json` semver 버전 범프(`Development Workflow`). 머지되면 이슈 자동 종료, `index.md`·`plan.md` 갱신(`Documentation Maintenance`).
10. **배포** — `main` 머지 시 **Google Cloud Build 트리거가 자동으로 빌드·Cloud Run 배포**한다(코드). **DB 마이그레이션은 자동화돼 있지 않고**, 스키마 변경 시 사용자가 **Supabase에서 수동으로**(direct 5432) 적용한다. 그래서 스키마 변경 PR은 "**마이그레이션 먼저(수동), 코드 배포(자동) 나중**" 순서를 지킨다 — 머지되면 코드가 자동 배포되므로, 마이그레이션은 그 전에 적용돼 있어야 500이 안 난다.

## Front-End Standards
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

## Recurring Tasks
- Around 4 PM KST daily, if work is in progress, ask whether to organize and commit changes.
  - 주의: 시간 기반 자동 트리거는 Claude 자체로는 보장되지 않음(일회성 컨테이너). 자동화하려면 `.claude/settings.json` 훅 또는 외부 스케줄러가 필요.
