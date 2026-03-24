import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {Icon} from './Icons';
import {ButtonText} from './ButtonText';

export const Header = () => {
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const currValue = useCalendarStore((s) => s.target);

    return (
        <StyledHeader>
            <StyledButton type="button" onClick={() => setAside({isVisible: !aside.isVisible, isTransitionEnd: false})}>
                <Icon iconType="hamburger"/>
                <ButtonText a11y={true}>보기 옵션 {aside.isVisible ? '닫기' : '열기'}</ButtonText>
            </StyledButton>
            {currValue.full !== null && <>
                <CalendarDirection/>
                <CalendarHeading/>
            </>}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 8px 15px 7px;
  box-sizing: border-box;
  border-bottom: solid 1px var(--light-gray-color);
`;

const StyledButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 100%;
  background-color: #fff;
  border: none;

  &:hover {
    background-color: rgba(0, 0, 0, .1);
  }
`;
