#!/bin/bash
set -euo pipefail

# 원격(Claude Code on the web) 세션에서만 동작한다.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# 세션에 지정된 작업 브랜치에서는 절대 옮기지 않는다.
# (이전 버전은 무조건 develop으로 checkout해서 지정 브랜치를 덮어썼다.)
case "$current" in
  main | master | "") ;;
  *)
    echo "[session-start] 현재 브랜치 '$current' 유지 — develop 전환 생략."
    exit 0
    ;;
esac

# 커밋되지 않은 변경이 있으면 건드리지 않는다.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[session-start] 커밋되지 않은 변경이 있어 develop 전환을 생략한다."
  exit 0
fi

# 얕은 클론에는 develop이 없을 수 있으므로 필요하면 먼저 가져온다.
if ! git rev-parse --verify --quiet develop >/dev/null &&
  ! git rev-parse --verify --quiet origin/develop >/dev/null; then
  if ! git fetch --depth=1 origin develop:refs/remotes/origin/develop; then
    echo "[session-start] origin/develop fetch 실패 — '$current' 유지."
    exit 0
  fi
fi

if git checkout develop; then
  echo "[session-start] develop 체크아웃 완료."
else
  echo "[session-start] develop 체크아웃 실패 — '$current' 유지."
fi
