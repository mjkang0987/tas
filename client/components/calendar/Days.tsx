import {ReactNode} from 'react';
import styled from 'styled-components';

import {
    ViewType,
    DAYS
} from '../../utils/constants';

import {useRecoilValue} from 'recoil';

import {
    targetStateState,
    viewState
} from '../../recoil/atoms';

interface DaysType {
    type: string | null;
    children: ReactNode;
}

const getDaysInRange = (day: number, type: string) => {
    const keys = Object.keys(DAYS);
    const start = type === ViewType.Three ? +day : 0;
    const end = type === ViewType.Three ? +day + 3 : 7;

    const result = keys.slice(start, end);

    if (result.length < 3) {
        return new Array(3 - result.length).fill(null).reduce((acc, _, i) => {
            return [...acc, keys[i]];
        }, [...result]);
    }

    return result;
};

export const DaysComponent = () => {
    const target = useRecoilValue(targetStateState);
    const {
        day,
    } = target;

    const view = useRecoilValue(viewState);
    const {type} = view;


    return (<StyledDays type={type}>
            {getDaysInRange(day, type).map((day: string) =>
                <StyledDay key={DAYS[day].id}>
                    {DAYS[day].ko}
                </StyledDay>)}
        </StyledDays>
    );
};

const StyledDays = styled.ul <DaysType>`
  display: grid;
  justify-content: center;
  width: 100%;
  background-color: var(--white-color-80);
  z-index: 1;
  
  ${props => (props.type !== ViewType.Month) && `
  position: sticky;
  top: 0;
  grid-row: 1 / 2;
      
  li {
    border: none;
  }
  `
}
`;

const StyledDay = styled.li<{children: ReactNode}>`
  flex: 1;
  color: var(--black-color);
  border-right: 1px solid var(--light-gray-color);
  box-sizing: border-box;
  text-align: center;

  @media (max-width: 767px) {
    height: 30px;
    padding: 6px 2px;
    font-size: var(--tiny-font);
  }
  @media (min-width: 768px) {
    height: 35px;
    padding: 10px 0 5px;
    font-size: var(--small-font);
  }

  &:nth-child(7) {
    border-right: none;
  }
`;