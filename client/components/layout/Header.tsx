import styled from 'styled-components';

import {useSession, signOut} from 'next-auth/react';

import {useCalendarStore} from '../../store/calendarStore';
import {splitDesignersByStatus} from '../../utils/designers';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {Icon} from '../ui/Icons';
import {ButtonText} from '../ui/ButtonText';
import {formControlStyle} from '../ui/FormControls';


export const Header = () => {
    const {data: session} = useSession();
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const currValue = useCalendarStore((s) => s.target);
    const designers = useCalendarStore((s) => s.designers);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);
    const setCalendarDesignerId = useCalendarStore((s) => s.setCalendarDesignerId);
    const {
        active: activeDesigners,
        onLeave: onLeaveDesigners,
        resigned: resignedDesigners
    } = splitDesignersByStatus(designers);

    return (
        <StyledHeader>
            <StyledButton type="button"
                          onClick={() => setAside({isVisible: !aside.isVisible, isTransitionEnd: false})}>
                <Icon iconType="hamburger" />
                <ButtonText a11y={true}>보기 옵션 {aside.isVisible ? '닫기' : '열기'}</ButtonText>
            </StyledButton>
            {currValue.full !== null && <>
                <CalendarDirection />
                <CalendarHeading />
                <StyledDesignerFilter value={calendarDesignerId ?? ''}
                                      onChange={(e) => setCalendarDesignerId(e.target.value ? Number(e.target.value) : null)}
                                      aria-label="달력 디자이너 필터">
                    <option value="">필터</option>
                    <option value="0" data-bg-color="#8E8E93">미지정</option>
                    {activeDesigners.map((designer) => (
                        <option key={designer.id}
                                value={designer.id}
                                data-bg-color={designer.color}>
                            {designer.name}
                        </option>
                    ))}
                    {onLeaveDesigners.length > 0 && (
                        <optgroup label="휴직자">
                            {onLeaveDesigners.map((designer) => (
                                <option key={designer.id}
                                        value={designer.id}
                                        data-bg-color={designer.color}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                    {resignedDesigners.length > 0 && (
                        <optgroup label="퇴직자">
                            {resignedDesigners.map((designer) => (
                                <option key={designer.id}
                                        value={designer.id}
                                        data-bg-color={designer.color}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                </StyledDesignerFilter>
            </>}
            {session?.user && (
                <StyledUserArea>
                    <StyledUserName>{session.user.name}</StyledUserName>
                    <StyledLogoutButton type="button"
                                        onClick={() => signOut({callbackUrl: '/login'})}>
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
    @media (max-width: 640px) {
        justify-content: space-between;
        gap: 4px;
        padding: 0 4px;
    }
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

const StyledDesignerFilter = styled.select`
    min-width: 128px;
    margin-left: 4px;
    padding: 0 10px;
    ${formControlStyle};
    cursor: pointer;
    @media (max-width: 640px) {
        padding: 0 4px;
    }

    option {
        gap: 2px;
        
        &::checkmark {
            display: none;
        }
        &[value]:not([value=""]) {
            padding-left: 14px;
        }
        &[data-bg-color]::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 2px;
            border-radius: 50%;
            vertical-align: middle;
            background-color: attr(data-bg-color type(<color>), transparent);
        }
    }

    &,
    &::picker(select) {
        appearance: base-select;
        align-items: center;
        border: 1px solid #e0e0e0;
        border-radius: var(--radius-md);
        margin-top: 4px;
    }

    @media (max-width: 640px) {
        min-width: 96px;
        margin-left: auto;
    }
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
