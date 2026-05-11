import type {NextRouter} from 'next/router';

import {ASIDE, ViewType} from './constants';

interface RouterType {
    type: string,
    year: number | null,
    month: number | null,
    date: number | null,
    router: NextRouter
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
    const shouldIncludeDate = type === ViewType.Day || type === ViewType.Week || type === ViewType.Three;
    const index = type === ViewType.Year ? 1 : shouldIncludeDate ? arrayDate.length : 2;
    const isCalendarPath = isCalendar(['', type]);
    const resultPath = isCalendarPath ? `/${type}/${arrayDate.slice(0, index).join('/')}` : `/${type}`;
    if (router.asPath !== resultPath) {
        router.push(resultPath);
    }
};
