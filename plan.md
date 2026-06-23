# 작업 계획

> 진행 중인 작업의 배경·범위·구현 항목·리스크를 적는다. 완료되면 비운다.

## 배경 / 문제

서비스 저장 API(`server/api/services.ts` PUT)가 서비스 1개만 추가/수정해도
**매장 전체 서비스를 deleteMany로 전부 지운 뒤 `for...await create`로 한 개씩 재삽입**한다.
- N+1 insert: 서비스 수에 비례한 왕복.
- **트랜잭션 없음** → delete 후 create 중간에 실패하면 서비스가 통째로 날아갈 수 있음(데이터 유실).

최근 고객 PUT 비효율 제거(58111b8)와 같은 계열의 문제. 그중 데이터 유실 위험이 겸해 있는
서비스 서버부터 최소 변경으로 먼저 처리한다.

## 범위 / 결정사항

- 이번 작업 범위: **`server/api/services.ts` PUT 핸들러만**. 클라이언트(전체 카탈로그 전송)는
  이번에 건드리지 않는다(서비스 개수는 보통 수십 개라 페이로드는 수용 가능, 별도 작업으로 분리).
- 자연키는 `(storeId, name)`, 프론트 `ServiceItem`엔 id 없음. 예약은 서비스명을 **문자열**로
  저장(Service FK 없음) → Service row의 id/createdAt가 매번 바뀌어도 참조 무결성 깨지지 않음.
  따라서 "전체 삭제 후 재생성" 의미(semantic)는 유지해도 안전.
- 최소 변경 방침: diff 재작성 같은 큰 구조 변경 대신, **기존 delete-all + recreate를
  `$transaction`으로 감싸 원자화**하고, `for create` 루프를 **`createMany` 단일 호출**로 교체.
  → 쿼리 수: `1 deleteMany + N create + 1 update` → `1 deleteMany + 1 createMany + 1 update`(총 3).
  → 원자성 확보로 데이터 유실 위험 제거.

## 구현 항목

### 서버

- `server/api/services.ts` PUT (현재 71~89行):
  - `prisma.$transaction(async (tx) => { ... })`로 deleteMany·createMany·store.update를 묶는다.
  - `for (const service ...) create` → `tx.service.createMany({data: normalizedServices.map(...)})`.
  - 빈 배열일 때 createMany 생략(전체 삭제만).
  - 검증 로직(중복명/빈 값)·권한 체크는 트랜잭션 밖에 그대로 둔다.

### 클라이언트

- 변경 없음(이번 범위 아님).

## 리스크 / 주의

- `createMany`는 `@@unique([storeId, name])` 위반 시 한 번에 실패 → 기존 중복명 검증을
  트랜잭션 진입 전에 유지(이미 있음).
- Service의 `id`/`createdAt`가 매 저장마다 갱신되는 churn은 이번엔 그대로 둔다(참조 무결성
  영향 없음 확인됨). 식별자 보존이 필요해지면 후속 작업에서 diff 방식으로 전환.
- 운영 DB 마이그레이션 불필요(스키마 변경 없음).
