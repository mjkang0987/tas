import {ReactNode} from 'react';
import {
    useRecoilState,
    useRecoilValue
} from 'recoil';

import styled from 'styled-components';

import {
    asideState,
    targetState
} from '../../recoil/atoms';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {Icon} from './Icons';
import {ButtonText} from './ButtonText';

export const HeaderComponent = () => {
    const [aside, setAside] = useRecoilState(asideState);
    const currValue = useRecoilValue(targetState);

    return (
        <StyledHeader>
            <StyledButton type="button" onClick={() => setAside({isVisible: !aside.isVisible})}>
                <Icon iconType="hamburger"/>
                <ButtonText a11y={true}>보기 옵션 {aside.isVisible ? '닫기' : '열기'}</ButtonText>
            </StyledButton>
            {currValue !== null && <>
                <CalendarDirection/>
                <CalendarHeading/>
            </>}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 15px 7px;
  box-sizing: border-box;
  border-bottom: solid 1px var(--light-gray-color);

  @media (max-width: 767px) {
    gap: 8px;
  }
  @media (min-width: 768px) {
    gap: 20px;
  }
`;

const StyledButton = styled.button<{
    type: string;
    children: ReactNode;
    onClick?: () => void;
}>`
  width: 40px;
  height: 40px;
  border-radius: 100%;
  background-color: #fff;
  border: none;

  &:hover {
    background-color: rgba(0, 0, 0, .1);
  }
`;
