# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.
> 완료된 작업 기록은 git 히스토리에서 확인한다 (`git log -p -- plan.md`).

---

## 진행 중 — 담당자관리 카드 표시 정리 (에픽 #182)

> 설정 > 담당자관리 UI만. DB·API 변경 없음이라 배포 순서 제약 없음. 브랜치 `claude/issue-182-assignee-card-cleanup`.

### 배경
담당자 카드가 읽기 상태에서도 모든 항목을 `disabled` 입력칸으로 렌더했다. 그래서 (1) 값 없는 연락처·메모·다국어 이름이 **빈 입력칸으로 남고**, (2) 근무시간 7행(요일 × 체크박스 + 시간 2개)이 항상 펼쳐져 카드가 길었다. 또 메타 그리드 3열을 **컬러칩(32px 고정)과 다국어 입력이 공유**해 컬러 옆은 빈칸이 크고 `中文` 칸만 눌렸다.

### 구현
1. **#183 `summarizeSchedule()`** (`features/assignees/model.ts`) — 연속 동일 근무시간 요일을 묶어 `월~금 10:00~20:00 · 토 10:00~18:00 · 일 휴무` 형태로. 순수 함수.
2. **#184 읽기/편집 모드 분리** — 읽기 모드는 값 있는 항목만 라벨+값 텍스트(`StyledAssigneeReadMeta`), 근무시간은 1번 요약 한 줄. 컬러는 헤더 `Dot`이 이미 보여주므로 읽기 목록에서 제외. 편집 모드는 종전 입력·7행 유지하고 필드별 `disabled={!isEditing}` 제거(모드 분기로 대체). 상태 분기는 휴직/퇴직 안내 먼저 → 재직이면 편집/요약. 배경·라운드 잔재 제거(`MetaGrid`·`ScheduleList`·`DayLabel`).
3. **#185 다국어 셀 등폭** — `StyledAssigneeMetaGrid`는 기본정보 3칸 전용(3열 `32px` 고정 복귀), `StyledAssigneeI18nGrid` 신설(`repeat(3, minmax(0, 1fr))`). 배경 제거 후 남은 `padding: 8px` 잔재 제거.

### 변경 파일
- `client/components/settings/AssigneeManageSection.tsx`
- `client/components/settings/AssigneeManageSection.styles.ts`
- `client/features/assignees/model.ts`

### 검증
- ✅ `tsc --noEmit` 0 (커밋 단위별로 확인).
- ✅ `next build` 성공.
- ✅ `summarizeSchedule()` 단위 테스트 11건 (`features/assignees/model.test.ts`). 변이 3종(마지막 요일 가드 제거 / 휴무 여부 무시 / 하루짜리 구간도 물결) 각각 8·6·3건 실패로 회귀 감지 확인.
- ✅ Main 재동기화 — `origin/main` 병합 후 테스트·게이트·타입체크·빌드 재통과.
- ⬜ 담당자관리 화면 실제 구동 — 읽기 모드 빈 입력칸 0개 / 근무시간 요약 문구 / 편집 모드 다국어 3칸 등폭 확인.

### 절차 메모
- 이 작업은 **이슈·브랜치 없이 `main` 워킹트리에서 편집**한 상태로 시작됐다(절차 위반). 커밋·푸시 전에 이슈 #182~#185를 만들고 브랜치로 옮겨 커밋을 3단위로 재구성했다. `main` 히스토리는 오염되지 않았다.

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

