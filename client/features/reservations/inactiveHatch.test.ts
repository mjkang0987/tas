// 취소와 노쇼를 가르는 건 이 빗금 색뿐이다 — 카드에서 상태 글자를 뺐기 때문이다.
// 색이 같아지거나 각도가 갈리면 두 상태가 화면에서 구별되지 않는다.

import {describe, expect, it} from 'vitest';

import {inactiveHatch} from './inactiveHatch';

describe('inactiveHatch', () => {
    it('취소와 노쇼는 색이 다르다', () => {
        expect(inactiveHatch(false)).not.toBe(inactiveHatch(true));
    });

    it('색만 다르고 줄무늬 각도·간격은 같다', () => {
        // 각도까지 갈리면 "같은 끝난 예약"으로 읽히지 않는다. 색을 뺀 나머지가 일치해야 한다.
        const stripOfColor = (value: string) => value.replace(/rgba\([^)]*\)/g, 'COLOR');

        expect(stripOfColor(inactiveHatch(true))).toBe(stripOfColor(inactiveHatch(false)));
        expect(inactiveHatch(false)).toContain('-45deg');
    });

    it('노쇼는 붉은 기운 — 매출이 빈 자리라 눈에 걸려야 한다', () => {
        expect(inactiveHatch(true)).toContain('rgba(201, 58, 48');
    });

    it('인자를 주지 않으면 취소와 같다 — 호출부가 플래그를 빠뜨려도 조용히 붉어지지 않는다', () => {
        expect(inactiveHatch()).toBe(inactiveHatch(false));
    });
});
