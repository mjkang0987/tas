# `.claude/skills/` — UI Skills 도입 기록

이 디렉터리의 스킬은 **[UI Skills](https://www.ui-skills.com/) — "Skills for Design Engineers"** 에서 가져왔다.

| 항목 | 값 |
|---|---|
| 원본 패키지 | `ui-skills@0.2.4` (npm) |
| 저자 | `ibelick` |
| 라이선스 | MIT |
| 도입일 | 2026-07-31 |

Claude Code는 `.claude/skills/<name>/SKILL.md`를 자동으로 인식한다. 별도 설정은 없다.

---

## 설치 목록

| 스킬 | 상태 | 용도 |
|---|---|---|
| `fixing-accessibility` | **원문 그대로** | ARIA·키보드·포커스·폼 에러·대비. WCAG 점검 |
| `fixing-metadata` | **원문 그대로** | title·description·canonical·OG/Twitter·favicon·JSON-LD·hreflang |
| `fixing-motion-performance` | **원문 그대로** | 레이아웃 스래싱, compositor 속성, 스크롤 연동 모션, blur |
| `improve-ui` | **원문 그대로** | 한 화면을 자체 디자인 근거와 대조하는 read-only 감사 → `design-plans/`에 실행 계획 산출 |
| `baseline-ui` | ⚠️ **TAS 각색** | 간격·위계·타이포·레이아웃 정리. 아래 각색 내역 참고 |
| `ui-skills-root` | ❌ **미설치** | 아래 사유 참고 |

원문 4종은 tarball과 **바이트 동일**하다.

---

## `ui-skills-root`를 넣지 않은 이유

`ui-skills-root`는 스킬이 아니라 **`npx ui-skills` CLI로 스킬을 골라오는 라우팅 계층**이다. 그런데 CLI의 모든
하위 명령이 `https://www.ui-skills.com/skills/registry.json`을 fetch하고, **이 호스트는 조직 egress 정책에
차단돼 있다.** 실측(2026-07-31):

```
$ npx ui-skills start
Error communicating with ui-skills.com: Failed to fetch https://www.ui-skills.com/skills/registry.json (403 Forbidden)
$ npx ui-skills categories        # 동일 403
$ npx ui-skills list --category motion   # 동일 403
$ npx ui-skills get baseline-ui    # 동일 403
```

이 스킬을 설치하면 UI 작업마다 **반드시 실패하는 명령을 먼저 시도**하게 된다. 스킬을 로컬에 두면
Claude Code 자체 스킬 탐색이 라우팅을 대신하므로 기능 손실도 없다.

> 네트워크가 열린 환경에서는 `npx ui-skills start`가 정상 동작하며, 사이트 레지스트리에는
> 여기 동봉된 6종 외에 서드파티 스킬도 올라온다. 그 환경이라면 CLI 쪽이 더 최신이다.

---

## `baseline-ui` 각색 내역

원본은 **Tailwind CSS · `cn`(clsx+tailwind-merge) · `motion/react` · Base UI/Radix/React Aria**를 전제한다.
이 저장소 실측 결과는 정반대다:

- Tailwind 참조 **0건**, `motion`/`framer-motion` **0건**, Radix/Base UI/React Aria **0건**
- `styled-components` **141개 파일**, `@media (max-width: 640px)` **43개 파일**

원문을 그대로 두면 *"MUST use Tailwind CSS defaults"* 같은 지시가 상주해, styled-components 저장소에
Tailwind 클래스를 넣으라고 유도한다. 그래서 **규칙을 삭제하지 않고 표현 수단만 치환**했다.

| 원본 | TAS 각색 |
|---|---|
| Tailwind 기본값 | `styles/globalStyle.ts` CSS 변수 토큰 + `font-size` px 리터럴 금지 |
| `cn` / `clsx` 클래스 분기 | styled-components props 분기 (`styled.button<{ $primary?: boolean }>`) + `css` 헬퍼 |
| `motion/react`, `tw-animate-css` | CSS `transition`/`@keyframes` (애니메이션 라이브러리 미도입) |
| Base UI / Radix / React Aria | **네이티브 HTML 요소 우선** (CLAUDE.md Front-End Standards) + `ModalStyles.ts`의 `useDialogAccessibility` |
| `AlertDialog` | `ui/ConfirmDialog` · `AccountDeleteModal` · `AsideGuestLogout` 패턴 |
| `text-balance` / `text-pretty` | `text-wrap: balance` / `pretty` |
| `tabular-nums` | `font-variant-numeric: tabular-nums` |
| `truncate` / `line-clamp` | `text-overflow: ellipsis` / `-webkit-line-clamp` |
| `size-*` | 동일 `width`/`height` 또는 `aspect-ratio: 1` |
| `h-dvh` (not `h-screen`) | `100dvh` (not `100vh`) — 저장소 기존 관례와 동일 |
| Tailwind shadow 스케일 | `--shadow-sm` · `--shadow-md` · `--card-shadow` · `--modal-shadow` |
| 임의 `z-*` 금지 | `ModalStyles.ts`의 `OVERLAY_Z_INDEX` + `docs/design-spec.md` §6 계층 |
| 프로젝트 기존 프리미티브 우선 | `components/ui/` · `settings/settings-styles.ts` · `ModalStyles.ts` 명시 |

**무변경으로 둔 절**: `Animation`, `Performance`, `Design` — 스택과 무관한 규칙이라 원문 그대로다.

**추가한 저장소 고유 규칙**: 태그 셀렉터 금지, 신규 컴포넌트 생성 전 승인, `font-size` 토큰 강제,
존재하지 않는 토큰에 폴백 hex를 붙이는 패턴(`var(--red-color, #d94a4a)`) 금지, 모바일 규칙은
`@media (max-width: 640px)` 안에 격리.

---

## 업스트림 재동기화 절차

```bash
# 1. 최신 tarball 확보 (레지스트리는 프록시 예외라 접근 가능)
curl -sSL -o /tmp/ui-skills.tgz \
  "$(curl -sS https://registry.npmjs.org/ui-skills | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.versions[j["dist-tags"].latest].dist.tarball)})')"
mkdir -p /tmp/us && tar xzf /tmp/ui-skills.tgz -C /tmp/us

# 2. 원문 4종은 덮어쓰기
for s in fixing-accessibility fixing-metadata fixing-motion-performance improve-ui; do
  cp -r "/tmp/us/package/skills/$s/." ".claude/skills/$s/"
done

# 3. baseline-ui는 diff로 변경점만 확인 후 수동 반영 (각색본이라 덮어쓰지 말 것)
diff /tmp/us/package/skills/baseline-ui/SKILL.md .claude/skills/baseline-ui/SKILL.md
```

재동기화 후 이 파일의 **버전 표**와 **각색 내역 표**를 갱신할 것.

---

## 주의

- `improve-ui`는 감사 결과를 **`design-plans/`** 에 쓴다. 이 저장소의 계획 단일 소스는 여전히 **`plan.md`** 이며,
  `design-plans/`는 그 스킬의 감사 산출물 전용이다. 채택한 내용은 `plan.md`로 옮길 것.
- `improve-ui`는 제품 소스를 수정하지 않는다(read-only). 실행은 별도 에이전트/세션의 몫이다.
- 스킬은 CLAUDE.md를 **대체하지 않는다.** 충돌 시 **CLAUDE.md가 우선**한다 — 특히 DB Safety와
  Front-End Standards(컴포넌트 재사용 우선·신규 생성 승인·태그 셀렉터 금지).
