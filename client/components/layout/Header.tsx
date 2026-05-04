import styled from 'styled-components';

import {useRouter} from 'next/router';

import {useCalendarStore} from '../../store/calendarStore';
import {splitDesignersByStatus} from '../../utils/designers';
import {isCalendar} from '../../utils/router';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {formControlStyle} from '../ui/FormControls';

const PAGE_TITLES: Record<string, string> = {
    '/address': '주소록',
    '/mypage': '마이페이지',
    '/settings': '설정',
    '/logout': '로그아웃',
};

export const Header = () => {
    const router = useRouter();
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const currValue = useCalendarStore((s) => s.target);
    const designers = useCalendarStore((s) => s.designers);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);
    const setCalendarDesignerId = useCalendarStore((s) => s.setCalendarDesignerId);
    const pathSegments = router.asPath.split('?')[0].split('/');
    const isRootPath = pathSegments.join('').length === 0;
    const isCalendarPage = isRootPath || isCalendar(pathSegments);
    const pageTitle = PAGE_TITLES[router.pathname] ?? 'TAS';
    const {
        active: activeDesigners,
        onLeave: onLeaveDesigners,
        resigned: resignedDesigners
    } = splitDesignersByStatus(designers);

    return (
        <StyledHeader>
            <StyledAsideToggle type="button"
                              $open={aside.isVisible}
                              onClick={() => setAside({isVisible: !aside.isVisible})}
                              aria-label={aside.isVisible ? '사이드바 접기' : '사이드바 펼치기'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    {aside.isVisible
                        ? <polyline points="15,10 13,12 15,14" />
                        : <polyline points="13,10 15,12 13,14" />
                    }
                </svg>
            </StyledAsideToggle>
            {isCalendarPage && currValue.full !== null && <>
                <CalendarDirection />
                <CalendarHeading />
                <StyledDesignerFilter value={calendarDesignerId ?? ''}
                                      onChange={(e) => setCalendarDesignerId(e.target.value ? Number(e.target.value) : null)}
                                      aria-label="달력 디자이너 필터">
                    <option value="">전체보기</option>
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
            {!isCalendarPage && <StyledPageTitle>{pageTitle}</StyledPageTitle>}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 0 12px 0 0;
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

const StyledAsideToggle = styled.button<{ $open: boolean }>`
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
    cursor: pointer;
    
    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    @media (max-width: 640px) {
        position: fixed;
        bottom: 20px;
        left: ${(props) => props.$open ? 'calc(8px + var(--aside-width) + 8px)' : '16px'};
        z-index: 210;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: var(--aside-bg);
        color: var(--aside-text);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        opacity: .8;
        transition: left 0.25s ease, background-color 0.1s;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background-color: var(--aside-hover);
            }
        }
    }
`;

const StyledPageTitle = styled.h1`
    flex: 1;
    margin: 0;
    font-size: var(--big-font);
    font-weight: 700;
    text-align: center;
    color: var(--dark-gray-color);
`;

const StyledDesignerFilter = styled.select`
    min-width: 128px;
    margin-left: auto;
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
    }
`;
