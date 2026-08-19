# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.
> 완료된 작업 기록은 git 히스토리에서 확인한다 (`git log -p -- plan.md`).

---

## 완료 — 고객 병합 제안 그룹 규칙 재정의 (`feature/customer-merge-masked-rule`)

> 마스킹 이름(`김*수`) 병합 제안이 서로 다른 사람을 한 덩어리로 묶던 문제를 규칙 차원에서 고쳤다.
> UI 시안을 다듬는 대신 그룹 규칙을 바꾸자 체크박스가 통째로 사라졌다.

### 배경
- 제안 그룹을 **전이 병합**으로 만들었다. `김민수(A) ↔ 김*수 ↔ 김민수(B)` 처럼 마스킹 고객이
  다리 역할을 해서 실명 고객끼리도 한 그룹이 됐다. 전화번호가 다르면 **다른 사람일 수 있는데**
  병합하면 예약·적립금이 섞인다.
- 같은 이유로 `김민수` + `김진수` + `김*수` 가 한 카드에 떴다. `김*수` 가 누구인지 알 수 없는데
  제안을 띄우니 오너가 판단할 근거가 없다.
- 모달에 체크박스(합칠 대상)와 라디오(기준)가 동시에 있어 무엇을 고르는지 헷갈렸다.
  카드 전체가 클릭 영역이라 예약 카드를 보려다 기준이 바뀌기도 했다.

### 규칙
그룹 하나에 **마스킹 고객은 정확히 1명**, 나머지는 그와 이름 패턴이 맞는 실명 고객이다.
마스킹끼리는 묶지 않는다.

| 고객 | 제안 | 이유 |
|---|---|---|
| `김민수` + `김*수` | 1건 | 후보 1명 — 확인만 |
| `김민수`(A) + `김민수`(B) + `김*수` | 1건 (후보 2명) | 실명 이름이 1종이라 모호하지 않다. 누구인지는 라디오로 고른다 |
| `김민수` + `김민*` + `김*수` | **2건** | 마스킹 2명 → 각각 별도 제안. 기존 큐가 순차로 띄운다 |
| `김민수` + `김진수` + `김*수` | 0건 | 실명 이름 2종 — 판정 불가 |
| `김민*` + `김*수` | 0건 | 실명 후보 없음 |

### 구현
- `client/features/customers/merge-suggestion.ts` **(신규 순수 모듈)** — `detectMergeGroups`,
  `isMaskedName`, `isMaskedNameMatch`, `buildMergeGroupKey`. 그룹 키는 기존 형식(그룹 전체 ID
  오름차순 join)을 유지해 `customer-merge-reviewed` 기록이 되살아나지 않게 했다.
- `client/features/customers/merge-suggestion.test.ts` **(신규, 14건)** — 위 표의 다섯 조합을 전부 고정.
- `client/hooks/useCustomerMergeSuggestion.ts` — 전이 병합 삭제. `MergeSuggestion`이
  `{masked, candidates, targetId}` 로 바뀌었다. 병합 시 `sourceIds`는 **언제나 마스킹 고객 1명**이라
  실명 고객끼리는 어떤 경우에도 합쳐지지 않는다. `selectTarget`은 후보가 전부 실명이므로
  연락처 보유 → 오래된 단골 순으로 단순화.
- `client/components/modals/CustomerMergeSuggestionModal.tsx` — **체크박스 제거**.
  `삭제` ↓ `병합 기준 고객` 두 구획으로 나누고, 후보가 2명 이상일 때만 라디오를 띄운다
  (그때 제목은 `병합 기준 고객 선택`). **클릭 영역은 라디오와 그 이름까지**(`StyledChoiceLabel`).
  배지는 구획 제목과 라디오가 이미 같은 말을 하므로 두지 않는다.
  예약·적립금·첫방문·메모태그는 **한 줄로 압축**(`StyledMetaLine`, 항목 사이 가운뎃점) — 항목마다
  줄을 차지하면 390px에서 두 번째 후보가 화면 밖으로 밀린다. 태그 앞에는 가운뎃점을 두지 않는다
  (줄바꿈 시 점만 홀로 남는다). **예약 카드는 공통 `ReservationInfoCard`를 그대로 쓴다.**

### 남은 것 / 알려진 한계
- **동명이인이 실제로 다른 사람인 경우는 이름만으로 못 거른다.** 후보 2명을 띄우고 오너가 고르게
  하는 것이 현재 답이다. 기존 그룹핑도 이름만 봤으므로 새로 생긴 한계는 아니다.
- **병합 시 target의 연락처만 살아남는다**(`server/api/customers-merge.ts` 최종 update가
  `points`·`firstVisitDate`만 건드림). 마스킹 쪽에만 번호가 있으면 유실된다. 새 규칙에서는
  target이 항상 실명 고객이라 영향이 줄었지만 결함 자체는 남아 있다 — 별건.

### 검증
- 타입체크·eslint·`next build` 통과, 단위 테스트 99건 통과(신규 14건 포함).
- 헤드리스 브라우저로 위 표의 네 조합을 실제 구동해 확인:
  후보 1명(컨트롤 없음) / 동명이인 2명(라디오) / 이름 2종(제안 없음) / 마스킹 2명(건너뛰기로 두 번째 카드).
  390px 모바일 폭 포함 — 한 줄 압축 후 후보 2명이 모두 한 화면에 들어온다.
- 클릭 영역 실측: 카드 여백·전화번호·상세 행·하단 여백을 눌러도 기준이 바뀌지 않고,
  라디오 라벨과 방향키만 바뀐다. 예약 카드 클릭은 `예약 상세`를 열고 기준은 유지.
- 병합 요청 본문 확인: `{"sourceIds":[3],"targetId":2}` — 마스킹 1명만 source.

---

## 미확인 — 로딩 화면에 걸어 다니는 공룡 (구현·검증 완료, 실기기 확인만 남음)

> 다른 저장소(`clipnote`)에 있는 로딩용 공룡을 TAS로 가져와, **로딩 중인 모든 화면**에 띄운다.
>
> **구현·자동 검증은 끝났다** — 빌드·타입체크·eslint·단위 테스트 52건 통과, 헤드리스 브라우저로
> 부팅 오버레이에서 CSS→JS 인수인계와 네 면 걷기·코너 도약 실측(아래 검증 결과). 남은 것:
> **Safari·iOS 실기기 확인**(`steps()` 스프라이트 전환·`scaleX(-1)` 뒤집기)과, 라우트 전환
> 오버레이(300ms 지연 후 노출)에서의 체감.

### 배경
`clipnote`(및 `clipnote-ios`)에는 로딩 동안 화면 테두리를 걸어 다니는 도트 공룡이 있다.
TAS의 로딩 화면은 지금 회전 스피너 + 문구뿐이라 같은 장면을 여기에도 둔다.

### 범위
- **붙이는 곳은 `LoadingOverlay` 한 곳.** 화면을 덮는 로딩은 전부 이 컴포넌트를 지나간다 —
  부팅(`_app.tsx` `isBooting`), 라우트 전환(`_app.tsx` `RouteLoading`), `/login`, `/consent`(2곳),
  `StoreSwitcher`. 여기 한 번 붙이면 **6곳**이 모두 덮인다. 화면마다 따로 넣지 않는다.
- **부분 로딩은 범위 밖.** 오버레이를 경유하지 않는 로딩 표시가 4곳 있다 —
  `GuestMigrationLayer`(`Spinner` 직접), `BookingRequestNotification`·`SNSLinkingSection`·
  `inquiry`(인라인 "불러오는 중" 행). 목록 행·패널 안의 표시라 **창 테두리를 도는 공룡을 넣는 건
  맞지 않는다.** 의도적으로 제외한다.
- 기존 `Spinner`는 **그대로 둔다.** 공룡은 장식이고 진행 표시는 스피너·문구가 계속 맡는다.

### 구현
- `client/public/dino-run.png` — 4프레임 47×45 스프라이트(clipnote/앱과 동일 파일).
- `client/components/ui/RunningDino.tsx` **(신규 컴포넌트 — 사유는 아래)**
  - 창을 상자로 삼아 네 면을 걷는다. 좌표는 `requestAnimationFrame` + DOM 직접 조작
    (초당 60회 리렌더 방지). 코너는 도약으로 돌고, 프레임은 시간이 아니라 걸은 거리로 넘긴다.
  - **JS가 붙기 전에도 보이게 한다.** 부팅 오버레이는 하이드레이션 전에도 화면에 있다.
    styled-components `keyframes`로 바닥 왕복을 기본 동작으로 깔고, effect가 뜨면
    `animation: none`으로 끄고 네 면 걷기를 이어받는다(실행 중 CSS 애니메이션이
    인라인 `transform`보다 우선하므로 반드시 꺼야 한다).
  - `prefers-reduced-motion: reduce`면 세워만 두고 걷지 않는다. `aria-hidden` + 클릭 통과.
- `client/components/ui/LoadingOverlay.tsx` — `<RunningDino />` 한 줄 추가.

### 신규 컴포넌트 사유 (Front-End Standards)
기존 재사용 대상이 없다. `Spinner`는 회전 원형 하나로 스프라이트 시트·좌표 애니메이션을
표현할 수 없고, 성격도 다르다(스피너=진행 표시, 공룡=대기 시간 장식). 오버레이 본문에
인라인으로 넣으면 `LoadingOverlay`가 200줄짜리 좌표 계산을 떠안는다.

### 영향 파일
`client/components/ui/RunningDino.tsx`(신규), `client/components/ui/LoadingOverlay.tsx`,
`client/public/dino-run.png`(신규 에셋).

### 검증 결과 (프로덕션 빌드 + 헤드리스 Chromium)
세션 응답을 붙잡아 부팅 오버레이를 유지시킨 상태에서 스프라이트 좌표를 샘플링했다.

| 시점 | 관측 | 뜻 |
|---|---|---|
| 0ms | `(0, 666)` 인라인 transform 없음 | 하이드레이션 전 — **CSS 바닥 왕복**이 돌고 있다 |
| 276~1027ms | `translate(1065px, 150→33px) rotate(270deg)` | JS 인수인계 후 오른쪽 벽을 타고 올라감 |
| 1277ms | `rotate(262.8deg)` | 코너 도약 중(각도 보간) |
| 1527ms~ | `translate(1057→982px, 0px) rotate(180deg)` | 천장을 거꾸로 매달려 왼쪽으로 |

빌드·`tsc --noEmit`·eslint(변경 파일)·`pnpm test`(52건)·`test:required` 게이트 전부 통과.

### 리스크 / 남는 것
- **Safari·iOS 미확인.** `steps()` 스프라이트 전환, `scaleX(-1)` 뒤집기, `image-rendering:
  pixelated`는 표준이지만 헤드리스 Chromium 하나로만 봤다.
- 오버레이는 `backdrop="dim"`(반투명)일 때 뒤 화면이 비친다 — 공룡이 콘텐츠와 겹쳐도
  `pointer-events: none`이라 조작을 막지는 않는다.
- 라우트 전환 오버레이는 300ms 지연 후에 뜬다(`_app.tsx`). 짧은 이동에서는 공룡도 안 뜬다 —
  의도된 동작이다.
- 순수 로직(좌표 계산)이 컴포넌트 파일 안에 있다. `client/features/**`가 아니라 단위 테스트
  의무 대상은 아니지만(`test:required` 게이트도 "변경 없음" 판정), 나중에 옮길 여지는 있다.

---

## 미확인 — 현재시각 바 화면 확인 (PR #197 후속)

- 타임라인 배율 배선(#196/PR #197)에서 **현재시각 바만 화면으로 확인하지 못했다.** 코드상 예약 블록과
  같은 형태의 식(`blockOffset + (시-시작)×hourHeight + 분×minuteHeight`)을 쓰고 그 식은 30/10/5분 매장에서
  픽셀 단위로 검증했지만, 바 자체를 눈으로 본 것은 아니다(검증 시각이 영업시간 밖이었다).
  영업 중에 캘린더를 열어 빨간 선이 현재 시각에 놓이는지 한 번만 보면 된다.

## 미확인 — 담당자관리 카드 실기기/화면 확인 (PR #186 후속)

> 구현·자동 검증은 PR #186에서 끝났다(빌드·타입·단위 테스트 11건 + 변이 검사). 화면을 직접 띄워본 확인만 남았다.

- **설정 > 담당자관리 실제 구동** — 읽기 모드에 빈 입력칸 0개 / 근무시간 요약 문구가 7행과 일치 / 편집 모드 다국어 3칸 등폭.

## 다가오는 작업 — 고객 예약 페이지 접근성 잔여분 (PR #188 후속)

> PR #188에서 지시로 보류하거나 제 손으로 못 끝낸 것들. 본 작업 기록은 git 히스토리(`git log -p -- plan.md`).

- **단계 제목 `strong` → `h2`** (`book/[slug].tsx`의 `StyledSectionLabel`, 5곳). 페이지에 `h1` 하나뿐이라 스크린리더 heading 탐색이 무용지물이다. `styled.strong` → `styled.h2` **한 글자**이고 양쪽 다 기본 스타일을 덮어써 **시각 변화 0**. "태그 변경건 제외" 지시로 보류됨.
- **`BookingPickers.tsx`의 `i { }` 태그 셀렉터** (`SlotLegend`). CLAUDE.md Front-End Standards의 "태그 셀렉터 금지" 위반. 위 건과 같은 성격이라 함께 보류됨.
- **en/ja/zh 검증 문구 3종 원어민 검수** (`nameRequired`/`telRequired`/`telInvalid`). 내가 작성한 것이라 기존 문구 톤과 맞는지 미확인.
- **iOS Safari 실기기 확인.** 제출 검증 실패 시 `scrollIntoView` + `focus()`가 소프트 키보드를 띄우는데, 스무스 스크롤 진행 중 뷰포트가 바뀌면 최종 위치가 어긋날 수 있다. Chromium으로는 재현 불가. `:empty` 라이브 리전의 Safari/Firefox 동작도 미확인(최악은 16px 여백, 기능 영향 없음).


## 진행 중 — 업종별 라벨 시스템 (매장관리 직종 표시·수정 + 담당자/서비스 문구 전환)

> 매장 관리에 직종(shopType) 표시·수정 추가, 직종에 맞게 "담당자"·"서비스" 문구가 화면에 반영되게.

### 진행 현황 (2026-06-29 갱신)
- ✅ **Phase A(핵심)**: `features/store-settings/labels.ts`(category 매핑·`getStoreLabels`·`sanitizeShopType`) + `hooks/useStoreLabels.ts` 구현. aside 메뉴·담당자/서비스 관리·예약 폼·캘린더 적용. 업종 확장(beauty/food/medical/fitness/class/pet/repair/space/counsel/etc) 반영 — 라벨 표는 index.md 참조.
- 🔶 **Phase B(확장)**: 매출·모달까지 `useStoreLabels` 적용 완료(18개 파일). **온보딩(`OnboardingStep3`)만 '담당자' 하드코딩으로 남음** — 여기만 정리하면 종료.
- 미결(이월): "시술"→"서비스" 명칭 통일 여부 — 현재 라벨 시스템이 beauty service 라벨을 '서비스'로 노출하므로 사실상 흡수. 별도 전수 치환은 불필요로 판단(필요 시 재검토).

### 설계 결정 (요약)
- 라벨은 **category 기준**. 같은 category 내 세부업종 다중 허용, **cross-category 비허용**. 다중 업종(콤마) 시 첫 업종(primary)의 category로 라벨 결정.
- 라벨 주입: `getStoreLabels(shopType) → {assignee, service}` + `useStoreLabels()` 훅(calendarStore의 shopType 구독). 합성문구는 템플릿(`${labels.assignee} 관리`).
- **제외(영구)**: 약관/개인정보/DPA/about/maintenance의 "서비스"(앱 명칭). PageHero 영문 eyebrow(ASSIGNEE/SERVICE)는 유지.

### 리스크
- 약관 등 "서비스" 오치환 → 라벨 대상만 선별 치환(전수 find-replace 금지).
- 음식점은 라벨만으론 부족(인원수·테이블 자원·회전시간은 별도 트랙) — 이번 범위는 **라벨/직종 표시까지만**.

---

## 다가오는 작업 — 읽기 과부하/페이징(③) + 매출 서버화(A)

> 설계 상세: [docs/reading-overload-pagination.md](docs/reading-overload-pagination.md).

### 트리거 (재산정 2026-06-23)
- 6/1~6/23(23일) 예약 ~60건 ≈ **월 ~80~100건+**(월말 전). **네이버 예약 API 연동 추가 예정** → 유입 가속.
- 러프: **3~4개월 → 누적 수백 건**(B 트리거 "미래 예약 수백+" 도달), **~1년 → 수천**. ReservationHistory는 더 빠름.
- → 무기한 보류 아님. **몇 달 내** 현실화.

### 순서
1. ~~**B-1 공통 로직 추출**~~ — **완료**. `calendarStoreServiceHelpers.ts`에 인라인이던 `minutesBetween`·수동판정(`isPriceManual`/`isDurationManual`)을 `features/services/model.ts`로 이동(무동작 변경, `export *`로 자동 재export, 서버 import 가능).
2. **네이버 연동 마일스톤에 결합**:
   - `naver-booking-sync.ts:88` 매 폴링 전체예약 풀스캔 **bound**(연동 시 그 파일 만지므로 같이) — 인덱스+범위/증분.
   - **A(매출 집계 서버화)** 를 이 마일스톤으로 끌어와 착수(연동으로 데이터 곧 늘어 명분 생김). A 스텝은 docs "A" 섹션 참조.
3. **B-3 페이징 / B-2 updateService 서버화 / B-4 고객 페이징**: 누적 수백~수천 신호 시(몇 달 내 예상). A가 선결로 먼저 돼 있게.

### A 주의 (착수 시)
- 원격 전용 + local(`shouldUseLocalDb`)은 클라 계산 유지(모드 분기). 서버는 revenue.ts **순수함수 재사용**(query→`dbReservationToFrontend`→`groupByDate`→동일 함수 호출, 재구현 X).
- 예외: `getRevenueInsights` 신규/재방문은 범위 밖 이력 필요 → stored `Customer.firstVisitDate` 사용.
- 회귀=매출 오표시 → 클라==서버 합계 일치 검증.

## 의존성 보안 패치 스윕 (#85)

### 요구사항
- Dependabot 취약점 9건(high 8, moderate 1) 대응. 알림 목록 조회 불가 → **블라인드 패치 스윕**.

### 구현 방침
- `pnpm update`로 semver 범위 내 최신 패치 반영(transitive 완화 포함), pin된 `next` 등은 패치 범프 검토.
- **제외**: `xlsx@0.18.5`(npm 패치본 없음, export-only 수용 리스크 — `revenue-export.ts` 문서화), `next-auth`(beta)·`react`(pin) major/beta 범프.

### 영향 파일
- `client/package.json`, `pnpm-lock.yaml`

### 검증
- `pnpm build`(prisma generate + next build) + 타입체크 그린 = 회귀 없음.

### 완료 조건
- 빌드 그린, 안전 범위 취약 의존성 패치 갱신. 남은 알림(xlsx)은 수용 리스크로 명시.

