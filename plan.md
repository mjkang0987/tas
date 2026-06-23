# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

## 진행 중 — 캘린더 타임라인: 영업시간 연동 + 뷰별 시간범위 + 표시 개선

### 배경
- 캘린더 시간축(`store.time.start/end`)이 코드 고정 `10~20`. `setTime` 호출이 어디에도 없음 → **영업시간 설정과 완전 분리**.
- 영업시간 편집 UI(`components/settings/StoreManageSection.tsx`)·저장(`PUT /api/store` → DB `StoreBusinessHour`)은 **이미 존재**하나, 저장돼도 캘린더 화면엔 미반영(항상 10~20).
- 동시에: 30분 간격이 좁음 / 현재시간 바가 오래 두면 어긋남 / 빈 곳 클릭 예약추가 시각 불일치 문제 병행.

### 결정 사항
- **영업시간 설정 1개를 기준**으로 삼고, **뷰별 범위는 코드 규칙으로 파생** (설정 UI 추가 없음).
  - Day: 앞뒤 1시간 확장 (영업 10~20 → **9~21**)
  - Three / Week: 영업시간 그대로 (**10~20**)

### 구현 항목

#### A. 영업시간 → 캘린더 축 연동 + 뷰별 파생 (이번 핵심, **구현 완료**)
- 신규 순수함수 `getTimelineRange(viewType, businessHours)` (`client/utils/timelineRange.ts`):
  - `"HH:MM"` → 소수 시 파싱 후 `start = floor(open)`, `end = ceil(close)`
  - 뷰별 패딩 상수 `{ day: 1, three: 0, week: 0 }` 적용 후 `0~24` 클램프, 비정상값(end≤start) 시 최소 1h 폭 보장
- 적용처: `Timeline.tsx`·`TimelineTitle.tsx`가 `time.start/end` 대신 이 함수 결과 사용(`view.type` + `storeSettings.businessHours` 구독, `useMemo`). 드래그·클릭은 Timeline이 넘기는 start/end를 그대로 받으므로 자동 반영.
- `store.time.start/end` 정적값은 레거시화(슬라이스는 유지, 소비처 0). 파생 방식이라 `setTime` 도입 불필요.
- 검증값(스크립트): Day 10~20→9~21, Three/Week→10~20, 10:30~20:30(day)→8~22, 미설정→10~20 폴백, 23:00~23:30(day)→22~24 클램프.
- 미결: 분 단위 영업시간을 시 경계(floor/ceil)로 처리 — 현 정책 확정. Day 확장폭(±1h)은 실사용 피드백으로 재조정 여지.

#### B. 표시/동작 개선 (이미 작업, **로컬 워킹트리·미커밋**)
- ① 30분=50px(1시간=100px) 확대. 높이를 `TIMELINE_HOUR_HEIGHT`/`_MINUTE_HEIGHT`/`_HALF_HOUR_HEIGHT`로 단일화(`utils/constants.ts`), 흩어진 `80`·`4/3` 매직넘버 제거.
- ② 현재시간 바: CSS `down` 애니메이션 의존 제거 → 30초 주기 + `visibilitychange`/`focus` 재계산으로 위치 직접 지정(백그라운드/절전 후 드리프트 해결).
- ③ 빈 곳 클릭 예약추가 좌표식 수정: `(clientY - rect.top - blockOffset) / 분당높이` (paddingTop 빼지 않음 — absolute 자식은 padding 영향 없음). 카드/현재시간 바 렌더 좌표와 일치.
  - 마감(end) 줄 클릭은 `end-1`로 클램프됨(영업종료 시각 시작 예약 불가 — 의도). 검증은 중간 시각으로.
  - 임시 디버그 로그(`Timeline.tsx [CLICKDBG]`) 존재 → **검증 후 제거 필요**.

### 영향 파일
- 신규: `client/utils/timelineRange.ts`
- 수정: `Timeline.tsx`, `TimelineTitle.tsx`, `useTimelineDrag.ts`, `timelineInteractions.ts`, `utils/constants.ts`, `styles/globalStyle.ts`

### 검증
- 타입체크 0에러(`tsc --noEmit`). 파생값은 스크립트로 확인(위 A 검증값).
- 남은 실측(브라우저): ① 영업시간 변경 → 일/3일/주 축 즉시 반영, ② 중간 시각 클릭 → 예약추가 시작시각 일치, ③ 현재시간 바 탭 백그라운드/복귀 후 정확.
- (참고: ESLint는 환경 비호환(`eslint-plugin-react` × ESLint 10)으로 미실행 — 코드 무관.)

### 리스크
- 눈금선↔블록 정렬차(±수 px) 가능 → 실측 후 `blockOffset`/마진 보정.
- 영업시간 외 판정은 디자이너 근무시간(`DesignerSchedule`)만 사용 — 본 작업 범위 밖(불변).

### 진행 상태
- A(영업시간 연동 + 뷰별 파생): **구현 완료**(타입체크 통과). B(①②③): 완료(커밋 `9ae39ab`/`ab7fe43`, 디버그 로그 제거 확인).
- 남은 것: 브라우저 실측만(위 검증). 실측 완료 시 본 「진행 중」 섹션 정리.

---

## 다가오는 작업 — 읽기 과부하/페이징(③) + 매출 서버화(A)

> 설계 상세: [docs/reading-overload-pagination.md](docs/reading-overload-pagination.md).

### 트리거 (재산정 2026-06-23)
- 6/1~6/23(23일) 예약 ~60건 ≈ **월 ~80~100건+**(월말 전). **네이버 예약 API 연동 추가 예정** → 유입 가속.
- 러프: **3~4개월 → 누적 수백 건**(B 트리거 "미래 예약 수백+" 도달), **~1년 → 수천**. ReservationHistory는 더 빠름.
- → 무기한 보류 아님. **몇 달 내** 현실화.

### 순서
1. **지금 해도 무방(무위험)**: **B-1 공통 로직 추출** — `priceIsManual`/`durationIsManual` 등을 `features/services/model.ts`로 단일화(무동작 변경, 스케일무관). 미래 ③를 싸게 만듦. (필수는 아님)
2. **네이버 연동 마일스톤에 결합**:
   - `naver-booking-sync.ts:88` 매 폴링 전체예약 풀스캔 **bound**(연동 시 그 파일 만지므로 같이) — 인덱스+범위/증분.
   - **A(매출 집계 서버화)** 를 이 마일스톤으로 끌어와 착수(연동으로 데이터 곧 늘어 명분 생김). A 스텝은 docs "A" 섹션 참조.
3. **B-3 페이징 / B-2 updateService 서버화 / B-4 고객 페이징**: 누적 수백~수천 신호 시(몇 달 내 예상). A가 선결로 먼저 돼 있게.

### A 주의 (착수 시)
- 원격 전용 + local(`shouldUseLocalDb`)은 클라 계산 유지(모드 분기). 서버는 revenue.ts **순수함수 재사용**(query→`dbReservationToFrontend`→`groupByDate`→동일 함수 호출, 재구현 X).
- 예외: `getRevenueInsights` 신규/재방문은 범위 밖 이력 필요 → stored `Customer.firstVisitDate` 사용.
- 회귀=매출 오표시 → 클라==서버 합계 일치 검증.
