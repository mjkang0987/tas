// 예약 조회는 명시적 select만 쓴다(include= 전체 컬럼 SELECT 금지).
//
// 이유(재발 방지): Prisma의 include는 모델의 모든 스칼라 컬럼을 SELECT한다. 그래서 Reservation에
// 새 컬럼을 추가한 뒤 마이그레이션이 아직 실 DB에 적용되지 않은 채 코드가 배포되면
// "column does not exist"로 전체 예약 조회가 500난다(2026-07 온라인예약 publicToken 사고).
// 명시적 select는 여기 나열한 컬럼만 조회하므로, 새 컬럼을 추가해도 이 목록에 넣기 전까지는
// 배포를 깨뜨리지 않는다(코드 배포 ↔ 마이그레이션 순서 독립). 새 컬럼이 프런트에 필요해지면
// 그때 이 목록에 추가하고, 해당 마이그레이션이 선적용됐는지 확인한다.

// dbReservationToFrontend가 필요로 하는 스칼라 + 관계. id는 update/delete/이력 기록에 쓰인다.
export const reservationSelect = {
    id: true,
    legacyId: true,
    date: true,
    startTime: true,
    endTime: true,
    serviceSummary: true,
    customerId: true,
    assigneeId: true,
    status: true,
    price: true,
    memo: true,
    paymentCompleted: true,
    pointEarned: true,
    naverBookingId: true,
    naverBookingUrl: true,
    naverDeposit: true,
    channel: true,
    paymentEntries: {select: {method: true, amount: true}},
    customer: {select: {legacyId: true}},
    assignee: {select: {legacyId: true}},
} as const;

// 네이버 동기화 알림 등에서 고객/담당자 이름이 추가로 필요한 경우.
export const reservationSelectWithNames = {
    id: true,
    legacyId: true,
    date: true,
    startTime: true,
    endTime: true,
    serviceSummary: true,
    customerId: true,
    assigneeId: true,
    status: true,
    price: true,
    memo: true,
    paymentCompleted: true,
    pointEarned: true,
    naverBookingId: true,
    naverBookingUrl: true,
    naverDeposit: true,
    channel: true,
    paymentEntries: {select: {method: true, amount: true}},
    customer: {select: {legacyId: true, name: true}},
    assignee: {select: {legacyId: true, name: true}},
} as const;
