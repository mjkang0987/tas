// 설정 메뉴 게이팅 — aside와 `/menu`가 공유하는 판정.
// 두 방향 모두 사고다: 게스트에게 못 쓰는 항목을 보여주거나(켜도 401), 오너의 기능을 감추거나.

import {describe, expect, it} from 'vitest';

import {SETTINGS_SUBMENU, isSettingsMenuVisible, type SettingsMenuGate} from './settingsMenu';

// 기능 토글은 전부 켠 상태를 기본으로 둔다 — 토글이 아니라 '역할·모드'가 무엇을 가리는지 보기 위해.
const ALL_FEATURES_ON = {
    usePointSystem: true,
    useMembershipSystem: true,
    useCouponSystem: true,
    useOnlineBooking: true,
    naverBookingEnabled: true,
};

const OWNER: SettingsMenuGate = {isOwner: true, isLoggedInStaff: false, isGuest: false, ...ALL_FEATURES_ON};
const STAFF: SettingsMenuGate = {isOwner: false, isLoggedInStaff: true, isGuest: false, ...ALL_FEATURES_ON};
const GUEST: SettingsMenuGate = {isOwner: false, isLoggedInStaff: false, isGuest: true, ...ALL_FEATURES_ON};

function visibleTabs(gate: SettingsMenuGate): string[] {
    return SETTINGS_SUBMENU.filter((item) => isSettingsMenuVisible(item, gate)).map((item) => item.tab);
}

describe('isSettingsMenuVisible — 게스트(로컬 모드)', () => {
    it('서버가 있어야 동작하는 항목은 토글을 켜 뒀어도 감춘다', () => {
        // 예전에 켜 둔 로컬 값이 남아 있어도 보이면 안 된다 — 그래서 토글이 아니라 isGuest로 판정한다.
        const tabs = visibleTabs(GUEST);
        expect(tabs).not.toContain('membership');
        expect(tabs).not.toContain('coupon');
        expect(tabs).not.toContain('booking');
        expect(tabs).not.toContain('notice');
    });

    it('로컬로 쓸 수 있는 항목은 그대로 보인다', () => {
        const tabs = visibleTabs(GUEST);
        expect(tabs).toEqual(expect.arrayContaining(['revenue', 'store', 'point', 'service', 'assignee', 'customers', 'my']));
    });

    it('로그인이 필요한 관리 항목은 감춘다', () => {
        const tabs = visibleTabs(GUEST);
        expect(tabs).not.toContain('naver');
        expect(tabs).not.toContain('sns');
        expect(tabs).not.toContain('member');
    });

    it('적립금이 꺼져 있으면 적립금만 사라진다', () => {
        const tabs = visibleTabs({...GUEST, usePointSystem: false});
        expect(tabs).not.toContain('point');
        expect(tabs).toContain('store');
    });
});

describe('isSettingsMenuVisible — 오너(무회귀)', () => {
    it('기능을 켜 두면 전부 보인다', () => {
        expect(visibleTabs(OWNER)).toEqual(SETTINGS_SUBMENU.map((item) => item.tab));
    });

    it('기능 토글을 끄면 그 항목만 사라진다', () => {
        const tabs = visibleTabs({...OWNER, useCouponSystem: false});
        expect(tabs).not.toContain('coupon');
        expect(tabs).toContain('membership');
        expect(tabs).toContain('booking');
    });

    it('네이버예약 연동은 노출 대상 매장이 아니면 오너에게도 감춘다', () => {
        expect(visibleTabs({...OWNER, naverBookingEnabled: false})).not.toContain('naver');
    });
});

describe('isSettingsMenuVisible — 멤버(staff)', () => {
    it('고객 명단·계정 관리만 남는다', () => {
        expect(visibleTabs(STAFF)).toEqual(['customers', 'my']);
    });
});
