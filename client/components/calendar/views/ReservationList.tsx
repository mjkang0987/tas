import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {isNewCustomerVisit} from '../../../utils/customers';
import {buildAssigneeColorMap} from '../../../utils/assignees';

import type {Reservation} from '../../../utils/reservations';

interface ReservationListProps {
    reservations: Reservation[];
}

/** 월 칸 안의 예약 줄 — 시작시간 + 이름. 유일한 호출부가 Month 다. */
export const ReservationList = ({reservations: rawReservations}: ReservationListProps) => {
    const reservations = useMemo(
        () => [...rawReservations].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [rawReservations]
    );
    const customerMap = useCalendarStore((s) => s.customerMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const assignees = useCalendarStore((s) => s.assignees);
    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);

    return (<>
        <StyledList>
            {reservations.map((r) => {
                const customer = customerMap[r.customerId];
                const isInactive = r.status === 'cancelled' || r.status === 'noshow';

                return (
                    <li key={r.id}>
                        <StyledItem type="button"
                                    $color={r.assigneeId ? (assigneeColorMap[r.assigneeId] ?? '#8E8E93') : '#8E8E93'}
                                    $inactive={isInactive}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateReservationInitial(null);
                                        openReservationDetail(r);
                                    }}>
                            {/* 칸에는 시작시간 + 이름만. 시술은 왼쪽 색 막대가 담당자로 말하고,
                                좁은 칸에서 칩까지 넣으면 이름이 밀려 누가 오는지를 잃는다. */}
                            <StyledTimeMeta>{r.startTime}</StyledTimeMeta>
                            <StyledCustomerMeta>
                                {isNewCustomerVisit(customer?.firstVisitDate, r.date) &&
                                    <NewCustomerBadge>신규</NewCustomerBadge>}
                                <StyledCustomerName className={isInactive ? 'strike' : undefined}>{customer?.name ?? ''}</StyledCustomerName>
                            </StyledCustomerMeta>
                        </StyledItem>
                    </li>
                );
            })}
        </StyledList>
    </>);
};

const StyledList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 2px;
    padding: 0;
    list-style: none;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: auto;
    box-sizing: border-box;
`;

/* 모바일 월 셀은 폭이 약 48px뿐이라 시간까지 넣으면 이름이 밀린다.
   담당자 색(왼쪽 굵은 테두리) + 고객명만 남겨 1줄로 눕히고, 나머지는 날짜 탭 → 예약 목록 레이어에서 본다. */
const onMobile = (css: string) => `@media (max-width: 640px) { ${css} }`;

const StyledItem = styled.button<{ $color: string; $inactive?: boolean }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px;
    border: 1px solid ${(p) => p.$color};
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    background-color: ${(p) => `${p.$color}12`};
    color: var(--dark-gray-color);
    font-size: var(--xsmall-font);
    text-align: left;
    /* 이름 한 자라도 더 넣으려고 좌우 패딩·색바·폰트를 깎는다. 확보 폭 약 37px → 41px, 10px 폰트로 4자까지. */
    ${onMobile(`
        flex-wrap: nowrap;
        gap: 3px;
        padding: 2px 3px;
        border-left-width: 3px;
        font-size: var(--tiny-font);
    `)}
    ${(p) => p.$inactive && `
        border-color: var(--gray-color);
        border-left-color: var(--gray-color);
        background: repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 0 6px, transparent 6px 12px), var(--gray-color2);
    `};

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: ${(p) => (p.$inactive ? 'var(--gray-color2)' : `${p.$color}1d`)};
        }
    }

    strong {
        font-weight: 600;
    }
`;

const StyledCustomerName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.strike {
        text-decoration: line-through;
        text-decoration-color: var(--gray-color);
        text-decoration-thickness: 1.5px;
        color: var(--dark-gray-color2);
    }
`;


const StyledMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledTimeMeta = styled(StyledMeta)`
    ${onMobile('display: none;')}
`;

/* 신규고객 배지는 배지+간격만 18px — 남은 글자 폭의 절반을 먹는다. 모바일 셀에선 접고 레이어에서 확인. */
const StyledCustomerMeta = styled(StyledMeta)`
    ${onMobile(`
        flex-wrap: nowrap;
        min-width: 0;

        ${NewCustomerBadge} { display: none; }
    `)}
`;

