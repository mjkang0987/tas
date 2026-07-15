# CLAUDE.md

> 이 저장소에서 Claude가 항상 따라야 할 지시사항. 세션 시작 시 `index.md`·`plan.md`와 함께 읽는다.

## Priority Order
1. Core Principles
2. Session Startup Rules
3. Development Workflow
4. Work Request Flow
5. Front-End Standards
6. Documentation Maintenance

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
1. **업무 요청 접수** — 요구사항이 모호하면 먼저 질문해 범위를 확정한다(추측 금지).
2. **이슈 분할·생성** — 작업을 단위로 쪼개 GitHub 이슈를 만든다. 큰 기능은 상위(에픽) 이슈 + 서브이슈. 각 이슈에 배경·작업 체크리스트·완료 조건·관련 파일을 적는다.
3. **작업** — 지정 브랜치에서 이슈 단위로 구현. 커밋은 최소 단위·한국어·conventional prefix (`On Commit` 준수). `plan.md` 계획 선행은 `Development Workflow` 준수.
4. **검증** — `/verify`로 빌드 + 실제 동작 확인(테스트만이 아니라 대상 흐름을 구동).
5. **코드리뷰** — `/code-review`로 현재 diff를 리뷰한다.
   1. **리팩토링** — 리뷰 지적사항 반영 + 재사용·단순화(`/simplify`).
6. **재검증** — 리팩토링 후 다시 빌드·검증.
7. **PR 생성** — 본문에 `Closes #<이슈>`를 포함한다. PR 생성 시 자동 코드리뷰 Action(`.github/workflows/pr-review.yml`)이 실행된다.
8. **코드 검증** — PR 상태에서 코드를 최종 검증한다(`/verify` 빌드+구동). 자동 리뷰·CI 결과도 함께 확인. 지적이 있으면 4~6을 반복한다.
9. **머지** — `package.json` semver 버전 범프(`Development Workflow`). 머지되면 이슈 자동 종료, `index.md`·`plan.md` 갱신(`Documentation Maintenance`).

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
