// 회원권(membership) 프론트 타입. 적립금(금액)과 별개의 횟수·기간권.
// Phase 2b: 상품(카탈로그) CRUD. 고객 발급·차감은 후속 단계.

export interface MembershipProduct {
    id: string; // 서버 cuid
    name: string;
    totalCount: number | null; // 횟수 (null = 무제한/기간제)
    validDays: number | null;  // 발급일로부터 유효일수 (null = 무기한)
    price: number;
    status: 'active' | 'archived';
}

export interface CustomerMembership {
    id: string;
    customerId: number; // 고객 legacyId
    productId: string | null;
    name: string; // 발급 시점 상품명 스냅샷
    totalCount: number | null;
    remainingCount: number | null;
    issuedAt: string;
    expiresAt: string | null;
    status: 'active' | 'expired' | 'used_up' | 'cancelled';
}

export interface MembershipsPayload {
    products: MembershipProduct[];
    memberships: CustomerMembership[];
}
