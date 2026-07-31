// 횡단 규칙 1번 — 날짜 전용 컬럼(Reservation.date·StoreClosedDate.date 등) 왕복 규약.
//   저장: new Date(`${dateStr}T00:00:00`)  (서버 로컬 파싱)
//   읽기: toDateKey                        (로컬 컴포넌트 추출)
// `.toISOString().slice(0,10)`(UTC)로 읽으면 서버가 KST일 때 하루 밀려
// 휴업일이 공개 예약에서 누락된다. 그 회귀를 잡는 것이 이 파일의 목적이다.
//
// 운영 서버는 KST이므로 테스트도 KST에서 돈다.
// 주의: ESM 은 import 를 호이스팅하므로 이 줄은 아래 import 들이 평가된 "뒤"에 실행된다.
// 지금 import 하는 모듈들은 로드 시점에 Date 를 만들지 않아 문제가 없고,
// 실제로 적용됐는지는 아래 '환경 전제' 테스트가 지킨다. 그 테스트를 지우지 말 것.
process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {toDateKey as toDateKeyFromDate} from '../../../server/db/mappers';
import {toDateKey as toDateKeyFromParts} from './model';

// 오너가 입력한 달력일을 DB에 저장할 때 쓰는 형태
function store(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00`);
}

describe('환경 전제', () => {
    it('테스트는 KST(UTC+9)에서 돈다', () => {
        expect(new Date('2026-07-31T00:00:00Z').getHours()).toBe(9);
    });
});

describe('toDateKey(Date) — 서버 읽기 경로', () => {
    it('로컬 컴포넌트를 두 자리로 채워 반환한다', () => {
        expect(toDateKeyFromDate(new Date(2026, 6, 31))).toBe('2026-07-31');
        expect(toDateKeyFromDate(new Date(2026, 0, 1))).toBe('2026-01-01');
        expect(toDateKeyFromDate(new Date(2026, 11, 9))).toBe('2026-12-09');
    });

    it('저장 → 읽기 왕복이 오너가 입력한 달력일을 보존한다', () => {
        for (const d of ['2026-01-01', '2026-02-28', '2026-07-31', '2026-12-31']) {
            expect(toDateKeyFromDate(store(d))).toBe(d);
        }
    });

    it('금지된 UTC 읽기(.toISOString().slice(0,10))는 KST에서 하루 밀린다', () => {
        // 이 어긋남이 휴업일 누락 사고의 원인이었다. 규칙이 존재하는 이유를 고정한다.
        const saved = store('2026-07-31');
        expect(toDateKeyFromDate(saved)).toBe('2026-07-31');
        expect(saved.toISOString().slice(0, 10)).toBe('2026-07-30');
    });

    it('자정 직후·직전에도 로컬 달력일을 유지한다', () => {
        expect(toDateKeyFromDate(new Date('2026-07-31T00:00:00+09:00'))).toBe('2026-07-31');
        expect(toDateKeyFromDate(new Date('2026-07-31T23:59:59+09:00'))).toBe('2026-07-31');
    });
});

describe('toDateKey(year, month, date) — 클라이언트 조립 경로', () => {
    it('month는 0-based다 (Date 생성자 규칙)', () => {
        expect(toDateKeyFromParts(2026, 0, 1)).toBe('2026-01-01');
        expect(toDateKeyFromParts(2026, 6, 31)).toBe('2026-07-31');
    });

    it('범위를 넘는 값을 정규화한다', () => {
        expect(toDateKeyFromParts(2026, 12, 1)).toBe('2027-01-01'); // 13월 → 다음 해 1월
        expect(toDateKeyFromParts(2026, 0, 32)).toBe('2026-02-01'); // 1월 32일 → 2월 1일
        expect(toDateKeyFromParts(2026, 1, 29)).toBe('2026-03-01'); // 평년 2월 29일 → 3월 1일
    });

    it('윤년 2월 29일은 그대로 유지한다', () => {
        expect(toDateKeyFromParts(2028, 1, 29)).toBe('2028-02-29');
    });

    it('두 경로가 같은 달력일에 대해 같은 키를 낸다', () => {
        for (const [y, m, d] of [[2026, 0, 1], [2026, 6, 31], [2026, 11, 31]] as const) {
            expect(toDateKeyFromParts(y, m, d)).toBe(toDateKeyFromDate(new Date(y, m, d)));
        }
    });
});
