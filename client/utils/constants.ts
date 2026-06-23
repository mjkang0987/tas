const MAGIC_NUMBER = {
    TIMELINE_DAY_TOP: 40,
    TIMELINE_TOP: 30,
    TIMELINE_HOUR_HEIGHT: 100
};

export const {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    TIMELINE_HOUR_HEIGHT
} = MAGIC_NUMBER;

// 타임라인 1시간 블록 높이에서 파생되는 값들. 시간축 눈금·예약 블록·현재시간 바·드래그/클릭 좌표가 모두 이 값을 공유한다.
export const TIMELINE_MINUTE_HEIGHT = TIMELINE_HOUR_HEIGHT / 60;
export const TIMELINE_HALF_HOUR_HEIGHT = TIMELINE_HOUR_HEIGHT / 2;

interface AsideElementType {
    id: number
    title: string,
    icon?: string
    move?: number
}

interface AsideType {
    [key: string]: AsideElementType;
}

export const ASIDE: AsideType = {
    DAY: {
        id: 1,
        title: '일별',
        icon: 'day',
        move: 1
    },
    THREE: {
        id: 2,
        title: '3일',
        icon: 'three',
        move: 3
    },
    WEEK: {
        id: 3,
        icon: 'week',
        title: '주별',
        move: 7
    },
    MONTH: {
        id: 4,
        title: '월별',
        icon: 'month',
    },
    YEAR: {
        id: 5,
        icon: 'year',
        title: '연별'
    }
};

interface DirectionType {
    [key: string]: string;
}

export const A11Y_DIRECTION: DirectionType = {
    day: '날짜',
    three: '3일',
    week: '주',
    month: '달',
    year: '년'
};

interface DaysElementType {
    id: number;
    ko: string;
    en: string;
}

interface DaysType {
    [key: string]: DaysElementType;
}

export const DAYS: DaysType = {
    SUN: {
        id: 1,
        ko: '일',
        en: 'SUNDAY'
    },
    MON: {
        id: 2,
        ko: '월',
        en: 'MONDAY'
    },
    TUE: {
        id: 3,
        ko: '화',
        en: 'TUESDAY'
    },
    WED: {
        id: 4,
        ko: '수',
        en: 'WEDNESDAY'
    },
    THUR: {
        id: 5,
        ko: '목',
        en: 'THURSDAY'
    },
    FRI: {
        id: 6,
        ko: '금',
        en: 'FRIDAY'
    },
    SAT: {
        id: 7,
        ko: '토',
        en: 'SATURDAY'
    }
};

export const enum ViewType {
    Year = 'year',
    Month = 'month',
    Week = 'week',
    Three = 'three',
    Day = 'day'
}

export const isTodayValue = (today: Date | null, fullYear: number, month: number, number: number = 0): boolean => {
    if (!today) return false;
    return [today.getFullYear(), today.getMonth(), today.getDate()].join(' ') === [fullYear, month, number].join(' ');
};
