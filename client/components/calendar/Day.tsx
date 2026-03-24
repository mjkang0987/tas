import {useMemo} from 'react';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {
    isTodayValue,
} from '../../utils/constants';

import {Timeline} from './Timeline';

export const Day = () => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target])!;

    const {
        fullYear,
        month,
        date,
    } = curr;

    return (<Timeline fullYear={fullYear}
                               month={month}
                               date={date}
                               isToday={isTodayValue(today, fullYear, month, date)}/>
    );
};