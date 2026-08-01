---
description: 현재 diff를 리뷰한다 (업무 절차 5단계)
---

현재 변경을 리뷰한다. 외부 자동 도구가 아니라 **이 세션에서 직접** 수행한다 — `.github/workflows/pr-review.yml` 의 CI 는 lint + 빌드/타입체크만 하고 AI 리뷰는 하지 않는다.

## 대상

```sh
git diff                          # 워킹 트리

# 브랜치 누적. 원격 세션은 얕은 클론이라 base ref 가 없을 수 있다 — 없으면 먼저 받는다.
git rev-parse --verify --quiet origin/main \
  || git fetch --depth=1 origin main:refs/remotes/origin/main
git diff origin/main...HEAD
```

fetch 가 실패하면 그 사실을 보고에 적는다. base 를 못 구한 채 워킹 트리만 보고 "리뷰 완료"라고 하지 않는다.

## 반드시 확인할 것

### 횡단 규칙 위반 (`index.md` → 횡단 규칙)

- 날짜 전용 컬럼을 `.toISOString().slice(0,10)` 로 읽지 않았는가 → `toDateKey`
- 예약 조회에 `include` 를 쓰지 않았는가 → `prisma-includes.ts` 의 명시적 `select`
- 생성 시 `legacyId` 를 부여했는가
- 정책 문서의 모든 렌더 경로가 `applyPolicyVars` 를 통과하는가
- `font-size` 에 px 리터럴을 쓰지 않았는가
- 스키마를 바꿨다면 마이그레이션이 코드 배포보다 **먼저** 적용되는 순서인가

### 문서를 고쳤다면 (실제로 자주 틀리는 곳)

- **코드와 대조했는가.** 파일명·역할·구현 여부를 `ls`/`grep` 으로 확인했는가. 다른 문서의 설명에서 **유추하지 않았는가.**
- **같은 주제를 다루는 다른 위치도 고쳤는가.** 섹션만 고치고 헤더·목차·상호참조를 낡은 채로 두지 않았는가.
- `index.md` 를 만졌다면 각주 참조(고아·깨짐)·내부 앵커·마크다운 코드 스팬 균형이 유효한가.
- "미구현"·"완료" 표기가 코드의 실제 상태와 맞는가.

### 일반

- 실패 경로를 조용히 삼키지 않는가 (`2>/dev/null || true` 류)
- 새로 추가한 순수 함수에 테스트가 있는가
- 검사 스크립트를 직접 짰다면 **그 스크립트가 맞는지도 확인했는가** (멀티바이트 문자를 `sed` 문자클래스에 넣기, 마크다운 목록을 `grep '^-'` 로 거르기 등에서 오탐이 난 적 있다)

### 같은 패턴이 다른 곳에도 있는지 (필수 · 건너뛰지 말 것)

이 저장소에서 **가장 자주 재발한 실패 유형**이다 — 인스턴스를 고치고 **클래스를 놓친다.**
실제 사례: 섹션만 고치고 헤더의 모순을 방치 / 컴포넌트 역할을 코드 안 보고 다른 문서에서 유추 /
얕은 클론에 base ref 가 없는 문제를 훅에서 진단해 고쳐놓고 명령 문서에서 그대로 반복 /
워크플로 기준을 `main` 으로 바꾸면서 `CLAUDE.md` 만 고치고 명령·CI·게이트의 `origin/develop` 을 방치.

무언가를 고쳤으면 **같은 패턴을 저장소 전체에서 훑고 결과를 보고에 적는다.**
"훑었고 없었다"도 적는다 — 훑지 않은 것과 구분돼야 한다.

```sh
# 실패를 삼키는 패턴
grep -rn '2>/dev/null\|| true\|catch {}\|continue-on-error' \
  --include='*.sh' --include='*.mjs' --include='*.yml' .claude .github client/scripts

# 존재를 가정하는 ref
grep -rn 'origin/develop\|origin/main\|origin/HEAD' \
  --include='*.sh' --include='*.mjs' --include='*.yml' --include='*.md' .claude .github client/scripts

# 문서가 언급한 파일이 실재하는가 (index.md 는 경로가 아니라 파일명만 적으므로
# 고정 경로로 찾으면 전부 오탐이 난다 — basename 으로 저장소 전체를 뒤진다)
grep -oE '`[A-Za-z0-9_/-]+\.tsx?`' index.md | tr -d '`' | grep -v '^\.' | sort -u |
  while read -r f; do git ls-files "*/$f" "$f" | grep -q . || echo "없음: $f"; done
```

**훑기 명령을 새로 쓰거나 고쳤으면 그 명령부터 검증한다.** 실재하는 것 하나와
없는 것 하나를 일부러 넣어 각각 통과·검출되는지 본다. 후보를 0개 뽑는 정규식이
"문제 0건"으로 보고되는 사고가 실제로 있었다.

문서를 고쳤다면 **고친 주제어로 전수 grep** 한다. 브랜치 기준을 고쳤으면
`grep -n 'develop\|main' CLAUDE.md` 로 모든 언급을 확인하는 식이다. 한 줄만 고치고 끝내지 않는다.

## 결과

지적사항을 심각도 순으로 적는다. 각 항목에 파일·줄과 근거를 붙인다. 없으면 없다고 한 줄로 적는다.

이어서 `/simplify` 로 재사용·단순화를 검토한다(5-1 리팩토링).
