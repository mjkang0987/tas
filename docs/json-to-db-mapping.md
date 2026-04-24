# JSON to DB Mapping

## Scope

Current source data:

- `client/pages/api/customers.json`
- `client/pages/api/designers.json`
- `client/pages/api/services.json`
- `client/pages/api/store.json`
- `client/pages/api/reservations.json`

Target schema:

- `client/prisma/schema.prisma`

## Assumptions

- Start with a single default store during migration.
- Preserve existing numeric ids as `legacyId`.
- Generate new relational ids with Prisma defaults.
- Convert Korean enum strings into normalized DB enums during import.

## Store

### Source

- `store.businessHours`
- `store.closedDates`
- `store.pointSettings`

### Target

- `Store`
- `StoreBusinessHour`
- `StoreClosedDate`
- `StorePointSettings`

## Customers

### Source fields

- `id`
- `name`
- `tel`
- `points`
- `firstVisitDate`
- `memoTags`
- `allergyNote`
- `claimNote`
- `preferenceNote`
- `pointHistories`

### Target

- `Customer.legacyId`
- `Customer.name`
- `Customer.tel`
- `Customer.points`
- `Customer.firstVisitDate`
- `CustomerMemoTag`
- `Customer.allergyNote`
- `Customer.claimNote`
- `Customer.preferenceNote`
- `CustomerPointHistory`

### Notes

- `firstVisitDate` should be converted from `YYYY-MM-DD` to `DateTime`.
- `memoTags` becomes one row per tag in `CustomerMemoTag`.
- Current source data does not include a reservation reference inside `pointHistories`.
- `pointHistories.relatedReservationId` therefore remains `null` during the first import.
- If reservation-linked point history is required later, an additional reconciliation step or richer source export is needed.

## Designers

### Source fields

- `id`
- `name`
- `schedule[]`
- `status`
- `phone`
- `note`
- `color`

### Target

- `Designer.legacyId`
- `Designer.name`
- `Designer.status`
- `Designer.phone`
- `Designer.note`
- `Designer.color`
- `DesignerSchedule`

### Status mapping

- `재직` -> `active`
- `휴직` -> `on_leave`
- `퇴직` -> `resigned`

## Services

### Source fields

- `name`
- `category`
- `duration`
- `price`

### Target

- `Service.legacyName`
- `Service.name`
- `Service.category`
- `Service.duration`
- `Service.price`

## Reservations

### Source fields

- `id`
- `date`
- `startTime`
- `endTime`
- `service`
- `customerId`
- `designerId`
- `status`
- `price`
- `memo`
- `paymentCompleted`
- `paymentMethod`
- `paymentEntries`
- `pointEarned`

### Target

- `Reservation.legacyId`
- `Reservation.date`
- `Reservation.startTime`
- `Reservation.endTime`
- `Reservation.serviceSummary`
- `Reservation.customerId`
- `Reservation.designerId`
- `Reservation.status`
- `Reservation.price`
- `Reservation.memo`
- `Reservation.paymentCompleted`
- `Reservation.pointEarned`
- `ReservationPaymentEntry`

### Status mapping

- `active` -> `active`
- `completed` -> `completed`
- `cancelled` -> `cancelled`
- `noshow` -> `noshow`

### Payment method mapping

- `현금` -> `cash`
- `현금+현금영수증` -> `cash_receipt`
- `카드` -> `card`
- `네이버페이` -> `naver_pay`
- `지역화폐` -> `local_currency`
- `지역화폐+현금영수증` -> `local_currency_receipt`
- `상품권` -> `voucher`
- `적립금` -> `points`

### Notes

- If only `paymentMethod` exists and `paymentEntries` is empty, create one payment entry using reservation price.
- `date` should be stored as a date-normalized `DateTime`.

## Reservation History

### Source fields

- `reservationId`
- `before`
- `after`
- `timestamp`

### Target

- `ReservationHistory.reservationId`
- `ReservationHistory.beforeJson`
- `ReservationHistory.afterJson`
- `ReservationHistory.createdAt`

### Notes

- Keep `before` / `after` as JSON initially for safe migration.
- If needed later, split into domain event tables.

## Migration Order

1. create default `Store`
2. import `Designer`
3. import `Customer`
4. import `Service`
5. import `StoreSettings`
6. import `Reservation`
7. import `ReservationPaymentEntry`
8. import `ReservationHistory`
9. import `CustomerPointHistory` without reservation links from the current source snapshot

## Validation Checklist

- customer count matches source
- designer count matches source
- reservation count matches source
- reservation history count matches source
- payment entry totals match sampled reservations
- point balances match sampled customers
