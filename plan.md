# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

---

# Slack 알림 채널 2분기 (biz / ops) — 2026-06-23

## 배경 / 문제

현재 Slack 알림은 단일 채널로 모인다(`server/notify/slack.ts`).
- `resolveWebhookUrl()`이 `NODE_ENV`로 운영(`SLACK_WEBHOOK_URL`)·개발(`SLACK_WEBHOOK_URL_DEV`)만 가른다.
- `notifySlackForStore`는 `SLACK_STORE_ID`로 지정 매장만 전송(비즈니스 알림: 예약 신규·변경·취소·노쇼·삭제, 문의).
- **운영(클라우드) 상태 신호가 없다.** 서버 에러·네이버 동기화 실패·문의 메일 실패는 `console.error`로만 삼켜져
  서비스 수정/개선 시 문제 발생을 즉시 알 수 없다.

## 범위 / 결정사항

- 채널을 **2개로 분기**한다(사용자 합의):
  1. **biz**(기존): 지정 매장의 예약·문의 알림. 동작·env 그대로 유지(하위호환).
  2. **ops**(신규): 운영/시스템 알림. 서버 에러·예외, 네이버 동기화 실패, 문의 메일 발송 실패 등
     "서비스가 정상인지" 확인용. **어떤 에러인지** 알 수 있게 위치+에러내용 포함.
- 환경 분리는 기존 패턴 유지: ops도 prod/dev webhook을 따로 둔다(운영 변수로 폴백 금지).
- 매장 필터(`SLACK_STORE_ID`)는 biz에만 적용. ops는 매장 무관 전역(에러는 매장과 독립).
- 중앙 에러 래퍼는 도입하지 않는다(각 핸들러가 독립 Next.js API라 비용 큼). 명시적 catch 블록에만 연결.

## 구현 항목

### 서버 — `server/notify/slack.ts`

- `resolveWebhookUrl(channel: 'biz' | 'ops')`로 일반화.
  - biz: prod `SLACK_WEBHOOK_URL` / dev `SLACK_WEBHOOK_URL_DEV`.
  - ops: prod `SLACK_WEBHOOK_URL_OPS` / dev `SLACK_WEBHOOK_URL_OPS_DEV`.
- POST 로직을 `postToSlack(url, text)`로 추출(중복 제거).
- `notifySlack`(biz)·`notifySlackForStore`(biz) 동작 불변.
- 신규 `notifySlackOps(text)`: ops 채널 전송, 미설정 시 no-op.
- 신규 `notifySlackOpsError(context, err)`: `🛑 *운영 에러* \`env\`` + 위치 + `name: message` 포맷.

### 서버 — 운영 에러 연결(catch 블록)

- `api/inquiry.ts`: 메일 발송 실패(63).
- `api/customers.ts`: PUT 저장 실패 500(171).
- `api/services.ts`: 예기치 못한(non-Prisma) 실패 rethrow 직전(95).
- `api/account/merge.ts`: 병합 실패 500(104).
- `api/account/delete.ts`: 계정 삭제 실패 500(33).
- `api/naver-booking-sync.ts`: 루프 종료 후 `errors.length > 0`이면 1건으로 요약 전송.
- `api/migrate-local.ts`: 마이그레이션 실패 500(234).

### 문서 / 환경변수

- `.env.local`에 `SLACK_WEBHOOK_URL_OPS`, `SLACK_WEBHOOK_URL_OPS_DEV` 추가(운영 Docker/로컬 각각).
- `index.md` 환경변수 항목·`notify/slack.ts` 설명 갱신.

## 기대 결과

- 예약·문의 알림은 그대로 매장 채널로, 에러·동기화 실패는 운영 채널로 분리 수신.
- 운영 채널 메시지로 "어디서 어떤 에러"인지 즉시 파악 → 수정/배포 회귀 감지.

## 리스크 / 주의

- ops webhook 미설정 시 전부 no-op → 기존 동작 영향 0(점진 도입 가능).
- 네이버 동기화는 자동 폴링이라 실패 알림이 반복될 수 있음 → 폴링 1회당 요약 1건으로 제한.
- 스키마 변경·마이그레이션 불필요(env만 추가).
- (후속) 전 핸들러 커버가 필요하면 공통 `withApiHandler` 래퍼 도입 검토.

## 진행 현황

- ✅ `slack.ts`: biz/ops 채널 분기 + `notifySlackOps`/`notifySlackOpsError` 추가.
- ✅ 운영 에러 연결: inquiry·customers·services·account(merge/delete)·migrate-local catch + naver-sync 요약.
- ✅ `index.md` env 항목 갱신(ops webhook 키).
- ✅ `tsc --noEmit` 통과(0 errors).
- ⏳ 배포 전 필요: 운영 Docker/로컬에 `SLACK_WEBHOOK_URL_OPS`(+`_DEV`) 설정. 미설정 시 ops는 no-op.

---

# (이전) 디자이너 스케줄 N+1 — 완료

## 배경 / 문제

디자이너 저장 API(`server/api/designers.ts` PUT)가 전체 디자이너 목록을 받아
**디자이너마다 upsert + 그 디자이너의 요일 스케줄(최대 7개)마다 upsert**를 한다.
- 쿼리 수: `1 deleteMany(삭제분) + N upsert(디자이너) + N×최대7 upsert(스케줄)` ≈ **N×8**.
- 트랜잭션으로 묶여 있어 데이터 유실은 없지만(서비스와 달리 원자성은 이미 확보),
  스케줄 N+1이 가장 큰 왕복 비용. 어제 고객(58111b8)·서비스(e5ce020)와 같은 계열.

## 범위 / 결정사항

- 이번 작업 범위: **`server/api/designers.ts` PUT 핸들러만**. 클라이언트(전체 목록 전송)는
  이번에 건드리지 않는다(디자이너 수는 보통 한 자리라 페이로드는 수용 가능).
- **디자이너 행 자체는 upsert 유지**: 예약(`Reservation.designerId`)이 Designer를 FK로 참조 →
  서비스처럼 delete-recreate하면 예약-디자이너 연결이 끊긴다. 행을 보존해야 함.
  (삭제 대상 디자이너의 예약 연결 차단 검증도 그대로 유지)
- **스케줄만 일괄 교체**: 디자이너별 요일 upsert(N×7) 대신, 루프에서 스케줄 row를 모아
  업서트된 디자이너들의 스케줄을 `deleteMany` 후 `createMany` 단일 호출로 재삽입.
  → 스케줄 쿼리: `N×7 upsert` → `1 deleteMany + 1 createMany`.
  → 전체: `N×8` → `N(디자이너 upsert) + 3`.

## 구현 항목

### 서버

- `server/api/designers.ts` PUT (현재 69~115行 트랜잭션 내부):
  - 디자이너 upsert 루프는 유지하되, 안에서 스케줄을 `scheduleRows`로 수집.
  - 루프 종료 후, **스케줄 데이터가 온 디자이너(`scheduledDesignerIds`)만**
    `deleteMany({where:{designerId:{in: scheduledDesignerIds}}})` → `createMany({data: scheduleRows})`.
  - 스케줄이 payload에 없는 디자이너의 기존 스케줄은 건드리지 않음(원동작 보존).
  - 스케줄 필드: designerId, dayIndex, enabled, startTime(=schedule.start), endTime(=schedule.end).

### 클라이언트

- 변경 없음(이번 범위 아님).

## 리스크 / 주의

- `designerSchedule`의 `@@unique([designerId, dayIndex])`: `entries()` 인덱스는 0~6 고유라
  한 디자이너 안에서 dayIndex 중복 없음 → createMany 위반 없음.
- 트랜잭션 원자성 유지(deleteMany schedules → createMany는 같은 tx 안).
- 운영 DB 마이그레이션 불필요(스키마 변경 없음).
- 디자이너 upsert는 값이 행마다 달라 배치 불가 → N 유지(보통 수 개라 비용 낮음).

> ✅ 디자이너 스케줄 N+1 — 완료·배포(952fd1e), 런타임 검증 OK.

---

# 과부하 & 데이터 손실 코드 감사 (2026-06-23)

서버 API 전수 점검 결과, 위 저장 계열(customers/services/designers)의 연장선에서
아래 치명적 후보가 남아 있다.

## 배경 / 문제 (감사 발견)

### 🔴 CRITICAL — 무제한 로드 (과부하 시한폭탄)
- `reservations.ts` GET: 전체 예약 + 결제내역 + **전체 ReservationHistory**를 매 페이지 로드마다
  통째 조회(날짜 필터·페이징 없음) → 클라 메모리 적재. 이력은 수정마다 누적되는데 전량 로드.
  데이터 누적 시 쿼리·페이로드·메모리 폭발(어제 P2028 쓰기의 읽기 버전).
- `customers.ts` GET: 전체 고객 + **전체 CustomerPointHistory**를 통째 로드(같은 패턴).
- 현재 규모(예약 66/이력 4/고객 63)는 작아 즉각 문제는 아니나 **무한 증가 구조**.

### 🟠 HIGH — `naver-booking-sync.ts` 비트랜잭션 (무결성 + 과부하)
- booking마다 customer + reservation(+필요시 designer/service) 생성이 **트랜잭션 밖**(쓰기 7개,
  `$transaction` 0). 부분 실패 시 **orphan 고객** 잔존(P2002만 정리, 그 외 실패는 빈 고객 남김).
  → 앞서 정리한 빈 마스킹 고객(`이*영`)의 발생 경로일 가능성.
- booking 다수 시 per-booking 개별 create = N+1.

### 🟡 MEDIUM — `reservations.ts` PATCH
- 상태변경 `reservation.update` + `reservationHistory.create`가 트랜잭션 밖 → 이력 생성 실패 시
  상태만 바뀌고 이력 누락(경미).

### ✅ 안전/이미 처리
- customers/services/designers 저장(트랜잭션+createMany), account merge/delete/unmerge(트랜잭션).

## 범위 / 결정사항 (감사 후속)

- **2·3(naver-sync 트랜잭션, PATCH 트랜잭션)**: 작고 안전 → 우선 처리 가능.
- **1(무제한 GET)**: 아키텍처 변경(페이징/날짜범위/lazy 이력)이라 **별도 합의 필요**.
  클라(calendar가 전체 reservationMap 사용)도 같이 손봐야 함. 이번 범위에서 분리.

## 구현 항목 (감사 후속)

### 서버
- ✅ `naver-booking-sync.ts`(`createReservationFromBooking`): **customer+reservation만**
  `prisma.$transaction`으로 묶어 원자화. 예약 실패 시 고객까지 자동 롤백 → orphan(빈 고객) 0.
  기존 best-effort `customer.delete`(P2002, `.catch` 무음) 제거(불필요).
  - **designer/service 자동생성은 트랜잭션에서 제외**(plan 원안과 다름). 이유: 생성 직후
    인메모리 맵(`designerMap`/`serviceMap`)에 등록돼 같은 실행의 다음 booking이 재사용하는데,
    트랜잭션에 넣었다 롤백되면 맵에 DB에 없는 id가 남아 다음 booking이 **FK 위반 연쇄 실패**.
    또 이들은 '예약 없이 존재해도 정상'인 참조 데이터라 orphan 고객 같은 손상이 아님(다음 실행
    DB 재조회로 정상 재사용). orphan 원인인 고객만 묶는 것이 정확·안전.
- `reservations.ts` PATCH: `reservation.update` + `reservationHistory.create`를 한 트랜잭션으로.
- (후속) `reservations.ts`/`customers.ts` GET: 날짜범위·페이징 도입, 이력 lazy 로드.

### 클라이언트
- (후속) GET 페이징/날짜범위에 맞춰 calendar/고객 로딩 조정.

## 리스크 / 주의 (감사 후속)
- naver-sync 트랜잭션화: 인터랙티브 트랜잭션 길어지지 않게 booking 단위로만 묶기(전체 묶으면
  타임아웃 위험). 외부 Gmail fetch는 트랜잭션 밖에 유지.
- GET 페이징은 클라 동작(달력 범위 이동 시 추가 fetch) 변경이 동반 → 별도 작업·검증 필요.
- 운영 DB 마이그레이션 불필요(스키마 변경 없음).

## 진행 현황 (감사 후속)
- 🟠 naver-sync orphan 방지: **✅ 완료·배포(8e1741c)** — 고객+예약 트랜잭션, 정적 검증 OK.
  (덤: Slack 환경별 채널 분리도 같이 — `slack.ts` 운영/로컬 webhook 분기)
- 🟡 reservations PATCH 트랜잭션: **✅ 완료·커밋(b03f759)** — 로컬 DB 런타임 검증(성공·롤백·원복) 통과. 미푸시.
- 🔴 updateService 폭주: ✅ **완료** — 서버 일괄 PUT 단일 트랜잭션 + 클라 단일 fetch. 슬랙 0회.
- 🔴 무제한 GET 페이징: ⏳ **보류(③)** — 아키텍처 변경, 설계부터 합의 필요.

## 우선순위 (확정)

**① `reservations.ts` PATCH 트랜잭션화 — ✅ 완료·커밋(b03f759, 미푸시)**
- naver-sync와 동일 패턴: `reservation.update` + `reservationHistory.create`를 한 `$transaction`으로 묶음(interactive tx, Slack 알림은 tx 밖).
- **서버 모든 쓰기 경로가 원자적** → "비트랜잭션 쓰기" 카테고리 완결.
- 검증: 타입체크 클린 + 로컬 DB 실데이터로 성공경로(둘 다 커밋)·롤백경로(부분커밋 없음)·원복 확인.
- 스키마/마이그레이션 변경 없음.

**② `updateService` 폭주 — ✅ 완료**
- (과거) `client/store/calendarStore.ts`: 카탈로그 수정이 영향 예약마다 **개별 PUT 동시 발사**
  (await·배치 없음, `.catch(()=>{})` 무음). 서버 PUT은 건당 트랜잭션 + **슬랙 웹훅**.
  → 인기 서비스 수정 한 번에 N개 동시 트랜잭션(풀 고갈) + 슬랙 N회 + 일부 실패 시 무음 부분 유실.
- 조치: 서버 `/api/reservations` PUT에 `{updates:[{prev,updated}]}` 일괄 분기 추가
  (한 트랜잭션 N건 `serviceSummary/price/endTime` update + 이력, **슬랙 미발송**). 클라는 단일 fetch 1회 + 실패 로깅.
- 검증: tsc 0 errors + 로컬 DB 실데이터 35건으로 성공(전건 반영+이력 35)·롤백(부분커밋 0)·원복 확인.
- (후속) 확장성: N이 수백+ 되면 ⓐNext.js body 1MB, ⓑ단일 tx 2N statement, ⓒ클라 전체 메모리 적재(=③) 순으로 닿음.
  싼 개선 후보: 이력 `create×N`→`createMany`. 규모 대응: 청크 분할 또는 서버측 affected 조회(③와 함께).

**③ 무제한 GET 페이징 — 보류(독립 작업)**
- 서버(날짜범위·페이징·이력 lazy) + 클라(달력 전체 reservationMap 의존) 동시 개편 → 설계 합의 후.
- 현재 규모(예약 66/이력 4) 런웨이 김. 급하게 끼우면 회귀 위험 → 별도 일정.
