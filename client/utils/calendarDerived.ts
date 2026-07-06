import type {DateType} from '../store/calendarStore';

export function computeTargetDerived(targetDate: DateType) {
    // full 이 Invalid Date 면 truthy 라 통과되지만 파생 계산이 NaN 으로 번져
    // new Array(NaN) 크래시를 낸다. fullYear 로 유효성을 한 번 더 방어한다.
    if (!targetDate.full || Number.isNaN(Number(targetDate.fullYear))) {
        return;
    }

    const {full, fullYear, month, date, day} = targetDate;

    const monthLastDate = new Date(+fullYear, +month + 1, 0);
    const monthFirstDate = new Date(+fullYear, +month, 1);
    const monthPrevLastDate = new Date(+fullYear, +month, 0);

    const monthFirstDay = monthFirstDate.getDay();
    const monthLastDay = monthLastDate.getDay();
    const monthLastNumber = monthLastDate.getDate();
    const monthPrevLastNumber = monthPrevLastDate.getDate();

    const weekLength = 7;

    const weekFirstDate = new Date(
        +fullYear,
        +month,
        +date - +day < 1
            ? 1
            : +date - +day
    );

    const weekFirstNumber = weekFirstDate.getDate();

    const weekLastDate = new Date(
        +fullYear,
        +month,
        +weekFirstNumber + 6 > monthLastNumber
            ? monthLastNumber
            : +date + (6 - +day)
    );

    const weekFirstDay = weekFirstDate.getDay();
    const weekLastDay = weekLastDate.getDay();
    const weekLastNumber = weekLastDate.getDate();

    const week = () => {
        return new Array(weekLastNumber + 1 - weekFirstNumber).fill(weekFirstNumber).reduce((acc, curr, index) => [...acc, curr + index], []);
    };

    const three = () => {
        return [date, +date + 1, +date + 2].filter((a) => +a <= monthLastNumber);
    };

    return {
        full,
        fullYear,
        month,
        date,
        day,
        monthLastDate,
        monthFirstDate,
        monthPrevLastDate,
        monthFirstDay,
        monthLastDay,
        monthLastNumber,
        monthPrevLastNumber,
        weekLength,
        weekFirstNumber,
        weekFirstDate,
        weekFirstDay,
        weekLastDate,
        weekLastDay,
        weekLastNumber,
        week,
        three
    };
}
