import styled from 'styled-components';

import {useSession, signOut} from 'next-auth/react';

import {useCalendarStore} from '../../store/calendarStore';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {Icon} from '../ui/Icons';
import {ButtonText} from '../ui/ButtonText';

export const Header = () => {
    const {data: session} = useSession();
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
            {session?.user && (
                <StyledUserArea>
                    <StyledUserName>{session.user.name}</StyledUserName>
                    <StyledLogoutButton type="button" onClick={() => signOut({callbackUrl: '/login'})}>
                        로그아웃
                    </StyledLogoutButton>
                </StyledUserArea>
            )}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0 12px;
  height: 48px;
  box-sizing: border-box;
  background-color: var(--white-color);
  border-bottom: solid 1px var(--light-gray-color);
  flex-shrink: 0;
`;

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: transparent;
  border: none;
  color: var(--dark-gray-color);
  flex-shrink: 0;

  &:hover {
    background-color: var(--gray-color2);
  }
`;

const StyledUserArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const StyledUserName = styled.span`
  font-size: var(--small-font);
  color: var(--dark-gray-color2);

  @media (max-width: 640px) {
    display: none;
  }
`;

const StyledLogoutButton = styled.button`
  padding: 0 10px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--white-color);
  font-size: var(--small-font);
  color: var(--dark-gray-color);
  cursor: pointer;

  &:hover {
    background-color: var(--gray-color2);
    border-color: var(--gray-color);
  }
`;
