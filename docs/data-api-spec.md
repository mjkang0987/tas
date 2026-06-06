# API / 데이터 명세서 — Take a Seat (TAS)

> 최종 수정: 2026-06-06

---

## 1. 공통 규칙

- 모든 API는 `/api/*` 경로
- 인증: NextAuth 세션 쿠키 (`getServerSession`)
- 미인증 요청 → `401 Unauthorized`
- 요청/응답 Content-Type: `application/json`
- 에러 응답 형식: `{ error: string }`
- storeId는 세션에서 자동 주입 (클라이언트 전송 불필요)

---

## 2. 타입 정의

### 2.1 Reservation

```typescript
type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'noshow';
type ReservationChannel = '네이버예약' | '현장방문' | '전화예약';
type PaymentMethod =
    | '현금' | '현금+현금영수증' | '카드' | '네이버페이'
    | '지역화폐' | '지역화폐+현금영수증' | '상품권'
    | '적립금' | '할인' | '네이버 예약금';

interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
}

interface Reservation {
    id: number;
    date: string;                   // 'YYYY-MM-DD'
    startTime: string;              // 'HH:mm'
    endTime: string;                // 'HH:mm'
    service: string;
    customerId: number;
    designerId?: number;
    status?: ReservationStatus;     // 기본: 'active'
    price?: number;
    memo?: string;
    paymentCompleted?: boolean;
    paymentMethod?: PaymentMethod;  // 단일 방법 (레거시)
    paymentEntries?: PaymentEntry[]; // 복합 결제
    pointEarned?: number;
    naverBookingId?: string;
    naverBookingUrl?: string;
    naverDeposit?: number;
    channel?: ReservationChannel;
}

interface ReservationHistoryEntry {
    reservationId: number;
    before: Reservation;
    after: Reservation;
    timestamp: string;              // ISO 8601
}

type ReservationMap = Record<string, Reservation[]>; // key: 'YYYY-MM-DD'
```

### 2.2 Customer

```typescript
interface Customer {
    id: number;
    name: string;
    tel: string;
    points?: number;
    firstVisitDate?: string | null;  // 'YYYY-MM-DD'
    pointHistories?: PointHistoryEntry[];
    memoTags?: CustomerMemoTag[];
    allergyNote?: string;
    claimNote?: string;
    preferenceNote?: string;
}

type PointHistoryType =
    | 'manual_add'      // 수동 추가
    | 'manual_subtract' // 수동 차감
    | 'recharge'        // 충전
    | 'payment_use'     // 결제 사용
    | 'payment_earn'    // 결제 적립
    | 'payment_adjust'; // 결제 조정 (취소 환급 등)

interface PointHistoryEntry {
    id: string;
    type: PointHistoryType;
    delta: number;       // 양수: 증가, 음수: 감소
    balance: number;     // 변경 후 잔액
    description: string;
    createdAt: string;   // ISO 8601
    relatedReservationId?: number;
}

interface CustomerMemoTag {
    id: string;
    text: string;
    createdAt: string;
}

type CustomerMap = Record<number, Customer>; // key: customer.id
```

### 2.3 Designer

```typescript
type DesignerStatus = '재직' | '휴직' | '퇴직';

interface DaySchedule {
    enabled: boolean;
    start: string;   // 'HH:mm'
    end: string;     // 'HH:mm'
}

interface Designer {
    id: number;
    name: string;
    schedule: DaySchedule[]; // 인덱스 0=월요일 ~ 6=일요일
    status?: DesignerStatus;
    phone?: string;
    note?: string;
    color?: string;          // hex 색상
}
```

### 2.4 Service

```typescript
interface ServiceItem {
    name: string;
    durationMinutes: number;
    category: string;
    price: number;
}
```

### 2.5 StoreSettings

```typescript
interface StoreSettings {
    businessHours: {
        start: string; // 'HH:mm'
        end: string;   // 'HH:mm'
    };
    closedDates: string[];  // 'YYYY-MM-DD'[]
    pointSettings: {
        enableServiceRate: boolean;
        enableRecharge: boolean;
        serviceRate: number;        // 1~100 (%)
        rechargeRules: Array<{
            baseAmount: number;     // 충전 기준금액
            bonusAmount: number;    // 보너스 금액
        }>;
    };
}
```

### 2.6 SyncNotification

```typescript
interface SyncNotification {
    id: string;
    bookingId: string;
    customerName: string;
    designerName: string;
    appointmentDate: string;  // 'YYYY-MM-DD'
    appointmentTime: string;  // 'HH:mm'
    reservationId: number;
    timestamp: Date;
    read: boolean;
    type?: 'sync' | 'cancel' | 'conflict';
    conflictKey?: string;     // '{newId}-{existingId}'
    conflictStatus?: 'pending' | 'deferred' | 'confirmed';
}
```

### 2.7 NextAuth Session 확장

```typescript
interface Session {
    user: {
        id: string;
        email: string;
        name?: string;
        image?: string;
        provider: 'google' | 'kakao' | 'naver';
        role?: 'owner' | 'manager' | 'staff';
        storeId?: string;
        onboarded?: boolean;
        loginError?: string;
    };
}
```

---

## 3. API 엔드포인트

### 3.1 예약 (`/api/reservations`)

#### `GET /api/reservations`

전체 예약 + 히스토리 조회.

**응답**
```typescript
{
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
}
```

---

#### `POST /api/reservations`

예약 생성.

**요청 바디**
```typescript
{
    date: string;        // 'YYYY-MM-DD'
    startTime: string;   // 'HH:mm'
    endTime: string;     // 'HH:mm'
    service: string;
    customerId: number;
    designerId?: number;
    memo?: string;
    channel?: ReservationChannel;
    price?: number;
}
```

**응답**
```typescript
{ reservation: Reservation }
```

---

#### `PUT /api/reservations`

예약 수정.

**요청 바디**
```typescript
{
    id: number;
    // 수정할 필드만 포함 (부분 업데이트)
    date?: string;
    startTime?: string;
    endTime?: string;
    service?: string;
    designerId?: number;
    status?: ReservationStatus;
    memo?: string;
    price?: number;
    paymentCompleted?: boolean;
    paymentEntries?: PaymentEntry[];
    pointEarned?: number;
}
```

**응답**
```typescript
{ reservation: Reservation }
```

---

#### `DELETE /api/reservations/:id`

예약 삭제.

**응답**
```typescript
{ success: true }
```

---

### 3.2 고객 (`/api/customers`)

#### `GET /api/customers`

전체 고객 조회.

**응답**
```typescript
{ customers: Customer[] }
```

---

#### `PUT /api/customers`

고객 정보 일괄 수정/생성.

**요청 바디**
```typescript
{ customers: Partial<Customer>[] }
```

**응답**
```typescript
{ customers: Customer[] }
```

---

#### `POST /api/customers/merge`

고객 병합. `sourceId` 고객의 예약·포인트·메모를 `targetId`로 이전 후 소스 삭제.

**요청 바디**
```typescript
{
    sourceId: number;
    targetId: number;
}
```

**응답**
```typescript
{ success: true; mergedCustomer: Customer }
```

---

#### `POST /api/customers/unmerge`

병합 취소.

**요청 바디**
```typescript
{ mergeHistoryId: string }
```

---

#### `GET /api/customers/merge-history`

병합 히스토리 목록.

**응답**
```typescript
{
    history: Array<{
        id: string;
        sourceId: number;
        targetId: number;
        mergedAt: string;
    }>
}
```

---

### 3.3 디자이너 (`/api/designers`)

#### `GET /api/designers`

**응답**: `{ designers: Designer[] }`

#### `POST /api/designers`

디자이너 생성.

**요청 바디**
```typescript
{
    name: string;
    schedule: DaySchedule[];
    phone?: string;
    note?: string;
    color?: string;
}
```

#### `PUT /api/designers`

**요청 바디**: `Partial<Designer> & { id: number }`

---

### 3.4 서비스 (`/api/services`)

#### `GET /api/services`

**응답**: `{ services: ServiceItem[] }`

#### `PUT /api/services`

서비스 카탈로그 전체 교체.

**요청 바디**: `{ services: ServiceItem[] }`

---

### 3.5 매장 설정 (`/api/store`)

#### `GET /api/store`

**응답**: `{ settings: StoreSettings }`

#### `PUT /api/store`

**요청 바디**: `Partial<StoreSettings>`

---

### 3.6 네이버 예약 동기화

#### `POST /api/naver-booking-sync`

Gmail API로 네이버 예약 메일 파싱 후 동기화.

**요청 바디**: 없음 (세션에서 Google 토큰 사용)

**응답**
```typescript
{
    synced: SyncedEntry[];       // 신규/업데이트 예약
    cancelled: CancelledEntry[]; // 취소된 예약
    conflicts: ConflictPair[];   // 충돌 감지 목록
}
```

---

#### `POST /api/naver-booking-fix-designer`

네이버 동기화 예약의 디자이너 자동 매핑.

**요청 바디**: `{ reservationId: number; designerId: number }`

---

### 3.7 팀원 관리 (`/api/members`, `/api/invites`)

#### `PUT /api/members`

팀원 역할 변경.

**요청 바디**: `{ userId: string; role: 'manager' | 'staff' }`

#### `GET /api/invites`

초대 코드 목록.

#### `POST /api/invites`

초대 코드 생성.

**요청 바디**: `{ role: 'manager' | 'staff'; expiresIn?: number }`

---

### 3.8 온보딩 (`/api/onboarding`)

#### `POST /api/onboarding`

초기 설정 완료 처리.

**요청 바디**
```typescript
{
    storeName: string;
    businessHours: { start: string; end: string };
    services: ServiceItem[];
    designers: Omit<Designer, 'id'>[];
}
```

---

## 4. Zustand Store 구조

파일: `client/store/calendarStore.ts`

### 4.1 주요 상태

```typescript
interface CalendarStore {
    // 날짜/뷰
    today: Date | null;
    target: DateType;
    view: { type: 'week' | 'month' | 'timeline' | 'year' | 'list' };
    time: { start: number; end: number; is12Hour: boolean };
    aside: { isVisible: boolean };

    // 데이터
    reservationMap: ReservationMap;
    customerMap: CustomerMap;
    serviceCatalog: ServiceItem[];
    categoryBaseColorMap: Record<string, string>;
    designers: Designer[];
    storeSettings: StoreSettings;

    // 선택 상태
    selectedReservation: number | null;
    selectedReservations: number[];
    selectedCustomerId: number | null;
    calendarDesignerId: number | null;

    // 히스토리 / 필터
    reservationHistory: ReservationHistoryEntry[];
    reservationListFilter: ListFilter;
    createReservationInitial: { date: string; startTime: string } | null;

    // 알림
    syncNotifications: SyncNotification[];
}
```

### 4.2 주요 액션

```typescript
// 예약
addReservation(r: Reservation): void
updateReservation(r: Reservation): void
cancelReservation(id: number): void

// 고객
updateCustomer(c: Customer): void
mergeCustomers(sourceId: number, targetId: number): void

// 서비스
addService(s: ServiceItem): void
updateService(s: ServiceItem): void
deleteService(name: string): void

// 디자이너
addDesigner(d: Designer): void
updateDesigner(d: Designer): void
deleteDesigner(id: number): void

// 매장 설정
updateBusinessHours(hours: {start: string; end: string}): void
addClosedDate(date: string): void
removeClosedDate(date: string): void
updatePointSettings(s: PointSettings): void

// 알림
addSyncNotification(n: SyncNotification): void
markNotificationRead(id: string): void
markAllNotificationsRead(): void
updateConflictNotificationStatus(
    conflictKey: string,
    status: 'pending' | 'deferred' | 'confirmed'
): void

// 동기화 (API → Store)
syncReservationState(): Promise<void>
syncCustomerSettings(): Promise<void>
syncDesignerSettings(): Promise<void>
syncServiceSettings(): Promise<void>
syncStoreSettings(): Promise<void>
```

---

## 5. localStorage 키 명세

| 키 | 타입 | 설명 |
|----|------|------|
| `sync-notifications` | `SyncNotification[]` | 알림 목록. timestamp는 ISO string으로 직렬화 |
| `naver-sync-active-conflicts` | `ConflictPair[]` | 활성 충돌 쌍 (`{newReservation, existingReservation}`) |
| `naver-sync-deferred-conflicts` | `string[]` | `conflictKey` 목록 (나중에 처리) |
| `naver-synced-entries` | `SyncedEntry[]` | 동기화된 예약 항목 |
| `customer-merge-reviewed` | `string[]` | 검토 완료한 병합 쌍 키 (`${sourceId}-${targetId}`) |
| `use-local-db` | `'true' \| null` | 로컬 DB 모드 활성화 여부 |

### ConflictPair 구조

```typescript
interface ConflictPair {
    newReservation: Reservation;
    existingReservation: Reservation;
}

// conflictKey 생성 규칙
function conflictKey(pair: ConflictPair): string {
    return `${pair.newReservation.id}-${pair.existingReservation.id}`;
}
```

---

## 6. 데이터베이스 스키마 (Prisma)

### 주요 테이블

| 테이블 | 주요 컬럼 |
|--------|----------|
| `Store` | `id`, `name`, `onboarded: boolean`, `categoryBaseColorsJson: string` |
| `User` | `id`, `email`, `nickname`, `name`, `image`, OAuth 토큰 |
| `Membership` | `userId`, `storeId`, `role: owner\|manager\|staff` |
| `Customer` | `id`, `legacyId`, `storeId`, `name`, `tel`, `points`, `firstVisitDate`, `allergyNote`, `claimNote`, `preferenceNote` |
| `Reservation` | `id`, `storeId`, `customerId`, `designerId`, `date`, `startTime`, `endTime`, `status`, `price`, `channel`, `naverBookingId`, `paymentEntries: JSON` |
| `Designer` | `id`, `storeId`, `name`, `status`, `phone`, `note`, `color` |
| `DesignerSchedule` | `designerId`, `dayIndex: 0-6`, `enabled`, `startTime`, `endTime` |
| `Service` | `id`, `storeId`, `name`, `category`, `duration`, `price` |
| `CustomerPointHistory` | `id`, `customerId`, `type`, `delta`, `balance`, `description`, `relatedReservationId` |
| `StoreBusinessHour` | `storeId`, `dayIndex`, `openTime`, `closeTime` |
| `StoreClosedDate` | `storeId`, `date` |
| `StorePointSettings` | `storeId`, `enableServiceRate`, `serviceRate`, `enableRecharge`, `rechargeRulesJson` |
| `Invite` | `storeId`, `code`, `role`, `expiresAt`, `usedAt`, `usedById` |
| `CustomerMergeHistory` | `id`, `storeId`, `sourceId`, `targetId`, `mergedAt` |
| `ReservationHistory` | `id`, `reservationId`, `before: JSON`, `after: JSON`, `timestamp` |

---

## 7. 인증 흐름

```
OAuth 로그인 (Google/Kakao/Naver)
→ NextAuth callbacks.signIn
  → syncAuthUser(profile)
    → DB User upsert
    → Membership 조회/생성
    → Google 토큰 저장 (Gmail API용)
    → Store.onboarded 조회
→ JWT 생성: { id, provider, role, storeId, onboarded }
→ Session 반환
```

### 미들웨어 (proxy.ts) 라우팅 규칙

```
storeId 있고 onboarded: false
  → /onboarding, /api/*, /login, /logout, /_next, /favicon.ico 외 모두 → /onboarding 리다이렉트

onboarded: true
  → /onboarding → / 리다이렉트
```

---

## 8. 서비스 기본 카탈로그

`SERVICE_CATALOG` 상수 (client/utils/services.ts).

기본 카테고리: `커트`, `펌`, `컬러`, `크리닉`, `드라이`, `기타`

각 서비스: `{ name: string, durationMinutes: number, category: string, price: number }`

---

## 9. 유틸리티 함수 참조

| 함수 | 파일 | 설명 |
|------|------|------|
| `toDateKey(y, m, d)` | `features/reservations/model.ts` | `Date → 'YYYY-MM-DD'` |
| `groupByDate(list)` | `features/reservations/model.ts` | `Reservation[] → ReservationMap` |
| `findOverlap(map, dateKey, start, end, excludeId?)` | 위 동일 | 시간 겹침 예약 탐색 |
| `hasCompletedPayment(reservation)` | 위 동일 | 결제 완료 여부 |
| `conflictKey(pair)` | `hooks/useNaverBookingSync.ts` | ConflictPair → string 키 |
| `syncCustomerFirstVisitDates(map)` | `features/customers/model.ts` | 첫 방문일 재계산 |
| `shouldUseLocalDb()` | `lib/local-db.ts` | localStorage 모드 여부 |
