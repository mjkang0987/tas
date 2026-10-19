import {useMemo} from 'react';

import styled from 'styled-components';

import {inactiveHatch} from '../../../features/reservations/inactiveHatch';

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
                                    $noshow={r.status === 'noshow'}
                                    // 보이는 글자(시간·신규·이름)가 이름에 다 들어가야 음성 조작으로 부를 수 있다(WCAG 2.5.3)
                                    aria-label={`${r.startTime} ${isNewCustomerVisit(customer?.firstVisitDate, r.date) ? '신규 ' : ''}${customer?.name ?? ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateReservationInitial(null);
                                        openReservationDetail(r);
                                    }}>
                            {/* 칸에는 시작시간 + 이름 한 줄 — 넘치면 이름이 말줄임으로 줄어든다(지시자 2026-10-19).
                                모바일(칸 약 48px)에서는 시간을 접고 이름만. 시술은 왼쪽 색 막대가 담당자로 대신한다. */}
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

const StyledItem = styled.button<{ $color: string; $inactive?: boolean; $noshow?: boolean }>`
    display: flex;
    /* 한 줄로 고정한다 — wrap 이면 이름이 시간 밑으로 떨어져 칸이 두 배로 높아진다.
       넘치는 이름은 줄바꿈이 아니라 말줄임으로 자른다(StyledCustomerName). */
    flex-wrap: nowrap;
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
        gap: 3px;
        padding: 2px 3px;
        border-left-width: 3px;
        font-size: var(--tiny-font);
    `)}
    ${(p) => p.$inactive && `
        border-color: var(--gray-color);
        border-left-color: var(--gray-color);
        background: ${inactiveHatch(p.$noshow)}, var(--gray-color2);
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
    /* 시간은 줄이지 않는다 — 줄어들 자리는 이름이 낸다(StyledCustomerName 말줄임). */
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;

    ${onMobile('display: none;')}
`;

/* 신규고객 배지는 배지+간격만 18px — 남은 글자 폭의 절반을 먹는다. 칸이 좁으면 접고 레이어에서 확인.
   110px 선: 시간 32 + 간격 6 + 패딩 8 + 이름 세 글자 33 = 79px 에 배지 30px 을 더한 값이다. */
const StyledCustomerMeta = styled(StyledMeta)`
    @container (max-width: 110px) {
        ${NewCustomerBadge} { display: none; }
    }

    /* flex 자식의 기본 min-width:auto 를 풀어야 안쪽 이름이 말줄임된다 — 안 풀면 넘쳐 나간다. */
    flex-wrap: nowrap;
    min-width: 0;

    ${onMobile(`

        ${NewCustomerBadge} { display: none; }
    `)}
`;

