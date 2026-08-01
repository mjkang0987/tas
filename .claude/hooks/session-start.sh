#!/bin/bash
set -euo pipefail

# 원격(Claude Code on the web) 세션에서만 동작한다.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# 워크플로 기준 브랜치는 main 이다(CLAUDE.md `Development Workflow`).
# feature 브랜치를 낡은 main 에서 따면 검증 기준이 낡으므로, 세션 시작 시 main 을 최신으로 맞춰 둔다.
# (이전 버전은 develop 으로 checkout 했다. 기준이 main 으로 바뀌면서 역할도 바뀌었다.)

current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# 세션에 지정된 작업 브랜치에서는 절대 옮기지 않는다.
case "$current" in
  main | master | "") ;;
  *)
    echo "[session-start] 현재 브랜치 '$current' 유지 — main 동기화 생략."
    exit 0
    ;;
esac

# 커밋되지 않은 변경이 있으면 건드리지 않는다.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[session-start] 커밋되지 않은 변경이 있어 main 동기화를 생략한다."
  exit 0
fi

if ! git fetch origin main; then
  echo "[session-start] origin/main fetch 실패 — 현재 상태 유지."
  exit 0
fi

# fast-forward 만 한다. 갈라져 있으면 손대지 않고 알리기만 한다.
if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
  if git merge --ff-only origin/main; then
    echo "[session-start] main 최신화 완료 ($(git rev-parse --short HEAD))."
  else
    echo "[session-start] fast-forward 실패 — 현재 상태 유지."
  fi
else
  echo "[session-start] 로컬이 origin/main 과 갈라져 있어 동기화를 생략한다."
fi
