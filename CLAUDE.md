# CLAUDE.md

> 이 저장소에서 Claude가 항상 따라야 할 지시사항. 세션 시작 시 `index.md`·`plan.md`와 함께 읽는다.

## Priority Order
1. Core Principles
2. Session Startup Rules
3. Development Workflow
4. Front-End Standards
5. Documentation Maintenance

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
