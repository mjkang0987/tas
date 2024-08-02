import {ReactNode} from 'react';
import styled from 'styled-components';

import {
    ViewType
} from '../../utils/constants';

import {
    isTodayValue
} from '../../utils/utils';

import {
    useRecoilValue,
    useSetRecoilState
} from 'recoil';

import {
    targetState,
    targetStateState,
    todayState,
    viewState
} from '../../recoil/atoms';

import {Num} from './Num';

export const YearComponents = () => {
    const today = useRecoilValue(todayState);
    const currValue = useRecoilValue(targetState);
    const setCurr = useSetRecoilState(targetStateState);
    const setView = useSetRecoilState(viewState);

    const {
        fullYear
    } = currValue;

    const months = Array.from({length: 12}, (_, index) => index);

    return (<StyledYear>
            {today && months.map((m) =>
                <StyledMonth key={`${fullYear}_${m}`}>
                    <Num onClick={() => {
                        setCurr(new Date(fullYear, m, 1));
                        setView({type: ViewType.Month});
                    }} isToday={isTodayValue(today, +fullYear, m, today.getDate())}>{m + 1}</Num>
                </StyledMonth>
            )}
        </StyledYear>);
};

const StyledYear = styled.ul`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
`;

const StyledMonth = styled.li<{children: ReactNode}>`
  width: ${100 / 3}%;
  height: ${100 / 4}%;
`;
