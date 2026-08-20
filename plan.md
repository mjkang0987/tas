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
  마스킹 고객 카드 ↓ `병합 기준 고객` 구획으로 나누고, 후보가 2명 이상일 때만 라디오를 띄운다
  (그때 제목은 `병합 기준 고객 선택`). **위 카드에는 구획 제목을 두지 않는다** — 헤더가 이미 그 고객을
  지목하고 화살표가 방향을 말한다. `삭제` 같은 말은 레코드 기준의 표현이라 사람을 가리킬 때 과하게 읽힌다.
  **클릭 영역은 라디오와 그 이름까지**(`StyledChoiceLabel`).
  배지는 구획 제목과 라디오가 이미 같은 말을 하므로 두지 않는다.
  예약·적립금·첫방문·메모태그는 **한 줄로 압축**(`StyledMetaLine`, 항목 사이 가운뎃점) — 항목마다
  줄을 차지하면 390px에서 두 번째 후보가 화면 밖으로 밀린다. 태그 앞에는 가운뎃점을 두지 않는다
  (줄바꿈 시 점만 홀로 남는다). **예약 카드는 공통 `ReservationInfoCard`를 그대로 쓴다.**

### 코드리뷰에서 고친 것
- **큐의 다음 제안이 감지 시점 스냅샷을 들고 있었다.** `merge()` 는 `setCustomerMap` 으로 스토어만
  갱신하고 `suggestions` 는 다시 만들지 않는다. 예약 건수는 살아있는 `reservationMap` 으로 계산되므로
  **한 카드 안에서 예약 건수만 갱신되고 적립금·첫방문은 옛 값**인 상태가 됐다. 후보를 공유하는 제안이
  연달아 뜨는 것이 새 규칙에선 정상 흐름(`김민수 + 김민* + 김*수` → 2건)이라 이 어긋남이 상시가 된다.
  `currentSuggestion` 을 `useMemo` 로 감싸 매 렌더에 `customerMap` 에서 다시 읽는다.
- **`index.md` 도메인 모델 표 누락.** 고객 병합 섹션과 훅 표만 고치고 `client/features/` 표를 빠뜨렸다.
- **키 호환성 서술 과장.** 2인 그룹은 기록이 승계되지만 한 그룹이 둘로 갈리는 경우
  (`1-2-3` → `1-2`/`1-3`)는 승계되지 않아 이미 건너뛴 제안이 한 번 다시 뜬다. 주석·테스트명을 실제에 맞췄다.

### /simplify 에서 고친 것
- **카드마다 전체 예약을 두 번씩 훑었다.** `countReservations` + `getLastReservation` 이 각각
  `reservationMap` 전체를 순회해, 카드 3장이면 렌더 한 번에 6회 전수 순회였고 라디오를 누를 때마다
  다시 치렀다. `summarizeCustomerReservations`(한 번 훑어 고객별 건수·최근 예약)로 합치고
  모달은 `useMemo` 로 한 번만 계산한다. 감지 단계도 그룹마다 훑던 것을 한 번으로 줄였다.
- **순수 함수가 훅 안에 묶여 테스트를 못 받고 있었다.** 기준 선정(`selectMergeTarget`)과 예약 집계를
  `features/customers/merge-suggestion.ts` 로 옮겼다. 모달이 훅에서 유틸(`countReservations`)을
  import 하던 이상한 의존도 사라졌다. 테스트 8건 추가(총 22건) — 연락처 우선·오래된 단골·
  예약 없는 고객·공백 연락처 등 갈림길을 전부 고정.
- **의미 없는 래퍼 정리.** 예약 카드를 감싸던 빈 `<div>` 를 프래그먼트로, 라디오 유무로 갈리던
  이름 마크업 중복을 `StyledChoiceLabel` 한 곳으로 합쳤다(`as` + `$interactive`).

**넘긴 것** — `components/address/AddressContent.tsx:97` 에 기준 고객 선정 로직이 한 벌 더 있다
(고객 목록에서 수동 병합할 때). 규칙이 달라(연락처 우선 단계 없음) 합치면 동작이 바뀌고,
이 PR 범위 밖 화면을 건드리게 된다. 별건으로 둔다.

### 같은 클래스 (이번 범위 밖)
- ~~`restoreConflictsFromPairs` 가 localStorage 에 박제된 `Reservation` 을 그대로 되돌려준다~~
  → 해결(`fix/conflict-pairs-stale-snapshot`). 로드된 예약은 `reservationMap` 의 현재 값으로 갱신하고,
  미로드 예약만 스냅샷을 폴백으로 남긴다. 구현은 `useNaverBookingSync.ts` 안에 있다
  (같은 이름의 `naverSyncConflictStorage.ts` 는 **아무 데서도 import 되지 않던 죽은 파일**이라 삭제했다).

### 남은 것 / 알려진 한계
- **동명이인이 실제로 다른 사람인 경우는 이름만으로 못 거른다.** 후보 2명을 띄우고 오너가 고르게
  하는 것이 현재 답이다. 기존 그룹핑도 이름만 봤으므로 새로 생긴 한계는 아니다.

### 검증
- 타입체크·eslint·`next build` 통과, 단위 테스트 99건 통과(신규 14건 포함).
- 헤드리스 브라우저로 위 표의 네 조합을 실제 구동해 확인:
  후보 1명(컨트롤 없음) / 동명이인 2명(라디오) / 이름 2종(제안 없음) / 마스킹 2명(건너뛰기로 두 번째 카드).
  390px 모바일 폭 포함 — 한 줄 압축 후 후보 2명이 모두 한 화면에 들어온다.
- 클릭 영역 실측: 카드 여백·전화번호·상세 행·하단 여백을 눌러도 기준이 바뀌지 않고,
  라디오 라벨과 방향키만 바뀐다. 예약 카드 클릭은 `예약 상세`를 열고 기준은 유지.
- 병합 요청 본문 확인: `{"sourceIds":[3],"targetId":2}` — 마스킹 1명만 source.

---

## 진행 중 — 중복예약이 다른 관리자에게 계속 뜨는 문제 (`feature/conflict-resolution-sync`)

### 증상
중복예약을 한 관리자가 **예약 시간 변경 없이 메모를 남기며 처리**했는데,
초대코드로 합류한 다른 관리자에게는 같은 중복예약이 계속 떴다.

### 원인
충돌 "처리 완료"가 **브라우저에만** 남는다.

| 저장소 | 위치 | 내용 |
|---|---|---|
| `sync-notifications` | `calendarStore.ts` | `conflictStatus: 'confirmed'` ← 처리 완료 표시가 여기 |
| `naver-sync-active-conflicts` | `useNaverBookingSync.ts` | 미해결 충돌쌍 |
| `naver-sync-deferred-conflicts` | `useNaverBookingSync.ts` | 나중에 보기 |

서버에 `ConflictResolution` 테이블과 `/api/conflict-resolution` 이 **이미 있었는데도** 안 쓰였다.
1. GET 이 `isActive = canUseSync && gmailConnected` 에 묶여 **Gmail 연동이 꺼져 있으면 호출조차 안 됨.**
   반면 감지는 `role === 'owner'` 만 보고 계속 돈다 — **감지는 하는데 해소 정보는 못 받는 비대칭**이 버그의 본체.
2. 받아온 값을 사유·메모 **표시에만** 쓰고, 충돌 억제(`confirmedKeys`)는 로컬 알림만 봤다.
3. POST 가 `if (trimmedReason)` 로 감싸여 있어 **사유 없이 확인하면 서버에 아무 기록도 안 남았다**
   (사유는 모달에서 "(선택)" 항목이다). 서버도 빈 사유를 400으로 거부했다.

### 구현
- `server/api/conflict-resolution.ts` — 빈 사유 허용(빈 문자열 저장). `reason` 은 non-null 컬럼이라
  **마이그레이션 불필요**.
- `client/hooks/useNaverBookingSync.ts`
  - 해결기록 GET 을 `gmailConnected` 게이트에서 떼어내 **감지와 같은 조건**(`role === 'owner'`)으로.
  - 감지 effect 는 `resolutionsLoaded` 이후에 돈다 — 안 그러면 이미 처리된 충돌이 잠깐 떴다 사라진다.
  - `confirmedKeys` = **로컬 confirmed ∪ 서버 기록**.
  - 서버 기록이 있는데 로컬에 미확인으로 남은 알림은 confirmed 로 내린다(알림 벨 배지 정리).
  - 사유가 비어도 처리 사실을 POST 한다.
- GET 실패 시에는 감지를 **막지 않는다.** 막으면 충돌을 아예 못 보게 되는데, 그건
  "이미 처리된 걸 또 보는 것"보다 나쁘다.

### 코드리뷰에서 고친 것
- **처리 기록 POST 실패를 조용히 삼키고 있었다.** 이 요청이 곧 "다른 관리자에게 다시 뜨지 않게 하는"
  경로인데 `.catch(() => {})` 였다. 실패하면 내 화면에서만 처리된 것처럼 보이고 증상이 그대로 재현된다.
  응답 상태까지 확인해 토스트로 알린다(`병합 실패`를 표면화한 `useCustomerMergeSuggestion` 과 같은 결).
  GET 실패는 그대로 조용히 둔다 — 로드마다 토스트가 뜨면 소음이고, 실패해도 옛 동작으로 퇴행할 뿐이다.
- `confirmedKeys` 를 `Set<string | undefined>` 대신 `flatMap` 으로 좁혀 `Set<string>` 으로.
- 감지 effect 본문이 **세션당 1회만 돈다**는 사실을 주석으로 명시. 의존성에 `resolvedKeys` 등이
  있어도 ref 가드에 걸려 재실행되지 않는다 — 다른 관리자가 방금 처리한 건은 새로고침해야 반영된다.

### 검증
- 타입체크·eslint(경고 4건은 변경 전과 동일, 신규 0)·`next build`·단위 테스트 85건 통과.
- **헤드리스 브라우저로 실제 클라이언트 경로를 구동해 확인**(`/api/auth/session`·`/api/store`·
  `/api/reservations` 등을 가로채 오너 세션 + 겹치는 예약 2건을 만든 하네스). 같은 담당자·같은 날
  14:00~15:30 과 15:00~16:00 → `conflictKey "1-2"`.

| 시나리오 | 수정 전 | 수정 후 |
|---|---|---|
| A. 서버에 기록 없음 (Gmail 연동 꺼짐) | GET 호출 **안 됨** · 충돌 뜸 | GET 호출됨 · 충돌 뜸(정상) |
| B. 다른 관리자가 이미 처리 | **충돌 그대로 뜸** ← 보고된 증상 | 알림 0건 · 저장쌍 0건 · 모달 안 뜸 |
| C. 사유 없이 확인 | POST **없음** | `{"conflictKey":"1-2","reason":""}` |

  수정 전 코드(`origin/main`)로 되돌려 같은 하네스를 돌린 **컨트롤에서 증상이 재현**됐다 —
  하네스가 구분력이 있음을 확인한 뒤 결과를 받았다.
- 다만 **실제 계정 2개로 도는 서버 왕복은 여기서 못 한다**(DB·세션 필요). 위 검증은 클라이언트
  판단 로직과 요청 본문까지이고, 서버 저장·조회는 배포 후 확인이 필요하다.

### 남은 것 / 같은 클래스 (범위 밖)
- `client/store/calendarStoreHelpers.ts` 의 서버 반영 경로 5곳(`/api/customers` POST, `/api/store` PATCH 등)이
  모두 `.catch(() => {})` 다. "로컬은 됐다고 보는데 서버는 모른다"는 **이번 버그와 같은 클래스**다.
  한 번에 손대면 범위가 커져 별건으로 둔다.
- ~~`restoreConflictsFromPairs` 가 박제된 `Reservation` 을 그대로 되돌려준다~~
  → 해결(`fix/conflict-pairs-stale-snapshot`).

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

## ~~미확인 — 현재시각 바 화면 확인 (PR #197 후속)~~ → 확인 완료

- 화면으로 확인했다. **위치 계산은 맞다** — 16:58 에 열어 바가 오후 5시 눈금에 놓이는 것을 확인.
  (색은 빨강이 아니라 주황 `--orange-color` 였다.)
- 대신 다른 문제가 드러났다: **자동 스크롤이 없어** 오후에 열면 바가 화면 한참 아래(상단에서 1758px,
  스크롤러 높이 861px)에 있어 매번 손으로 내려야 했다. → `feature/timeline-scroll-to-now` 에서 처리.

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

