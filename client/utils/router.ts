import {ASIDE, ViewType} from './constants';

interface RouterType {
    type: string,
    year: number | null,
    month: number | null,
    date: number | null,
    router: any
}

export const isCalendar = (arrayPath: string[] = ['', '', '', '']) => {
    const findIndex = Object.keys(ASIDE).findIndex((aside) => aside.toLowerCase() === arrayPath[1]);
    return findIndex > -1;
};

export const setRouter = ({
    type,
    year,
    month,
    date,
    router
}: RouterType) => {
    const arrayDate = [year, month, date];
    const setLength = type === ViewType.Day ? arrayDate.length : 2;
    const index = type === ViewType.Year ? 1 : setLength;
    const isCalendarPath = isCalendar(['', type]);
    const resultPath = isCalendarPath ? `/${type}/${arrayDate.slice(0, index).join('/')}` : `/${type}`;
    if (router.asPath !== resultPath) {
        router.push(resultPath);
    }
};
