import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {ViewType} from '../../../utils/constants';

import {Week} from './Week';

interface WeekType {
    type: string
}

export const WeekWrap = ({
    type
}: WeekType) => {
    const target = useCalendarStore((s) => s.target);
    const dates = useMemo(() => {
        if (!target.full) return [];

        const baseDate = new Date(target.full);

        if (type === ViewType.Week) {
            const startDate = new Date(baseDate);
            startDate.setDate(baseDate.getDate() - baseDate.getDay());

            return Array.from({length: 7}, (_, index) => {
                const nextDate = new Date(startDate);
                nextDate.setDate(startDate.getDate() + index);
                return nextDate;
            });
        }

        if (type === ViewType.Three) {
            return Array.from({length: 3}, (_, index) => {
                const nextDate = new Date(baseDate);
                nextDate.setDate(baseDate.getDate() + index);
                return nextDate;
            });
        }

        return [];
    }, [target, type]);

    return (<StyledWeeks>
            <Week dates={dates} />
        </StyledWeeks>
    );
};

const StyledWeeks = styled.ul`
  flex: 1;
  position: relative;
  display: grid;
  grid-row: 2 / 3;
  align-items: stretch;
`;
