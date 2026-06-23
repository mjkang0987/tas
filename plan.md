# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

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
