const MAGIC_NUMBER = {
    TIMELINE_DAY_TOP: 40,
    TIMELINE_TOP    : 30
};

export const {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP
} = MAGIC_NUMBER;

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
    DAY  : {
        id   : 1,
        title: '📅 일별',
        move : 1
    },
    THREE: {
        id   : 2,
        title: '3️⃣ 일',
        move : 3
    },
    WEEK : {
        id   : 3,
        title: '주별',
        move : 7
    },
    MONTH: {
        id   : 4,
        title: '🗓️ 월별',
    },
    YEAR : {
        id   : 5,
        title: '연별'
    }
};

interface DirectionType {
    [key: string]: string;
}

export const A11Y_DIRECTION: DirectionType = {
    day  : '날짜',
    three: '3일',
    week : '주',
    month: '달',
    year : '년'
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
    SUN : {
        id: 1,
        ko: '일',
        en: 'SUNDAY'
    },
    MON : {
        id: 2,
        ko: '월',
        en: 'MONDAY'
    },
    TUE : {
        id: 3,
        ko: '화',
        en: 'TUESDAY'
    },
    WED : {
        id: 4,
        ko: '수',
        en: 'WEDNESDAY'
    },
    THUR: {
        id: 5,
        ko: '목',
        en: 'THURSDAY'
    },
    FRI : {
        id: 6,
        ko: '금',
        en: 'FRIDAY'
    },
    SAT : {
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

export const isTodayValue = (today: any, fullYear: number, month: number, number: number = 0): boolean => {
    return [today.getFullYear(), today.getMonth(), today.getDate()].join(' ') === [fullYear, month, number].join(' ');
};

