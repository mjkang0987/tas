import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {isNewCustomerVisit} from '../../../utils/customers';
import {buildAssigneeColorMap} from '../../../utils/assignees';
import {buildServiceColorMap} from '../../../utils/services';
import {ServiceChipList} from '../../ui/ServiceChip';

import type {Reservation} from '../../../utils/reservations';

interface ReservationListProps {
    reservations: Reservation[];
    variant: 'date' | 'month';
    onViewAll: () => void;
    hideViewAll?: boolean;
}

export const ReservationList = ({
                                    reservations: rawReservations,
                                    variant,
                                    onViewAll,
                                    hideViewAll
                                }: ReservationListProps) => {
    const reservations = useMemo(
        () => [...rawReservations].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [rawReservations]
    );
    const customerMap = useCalendarStore((s) => s.customerMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);

    return (<>
        <StyledList $variant={variant}>
            {reservations.map((r) => {
                const customer = customerMap[r.customerId];
                const isInactive = r.status === 'cancelled' || r.status === 'noshow';

                return (
                    <li key={r.id}>
                        <StyledItem type="button"
                                    $color={r.assigneeId ? (assigneeColorMap[r.assigneeId] ?? '#8E8E93') : '#8E8E93'}
                                    $inactive={isInactive}
                                    $variant={variant}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateReservationInitial(null);
                                        openReservationDetail(r);
                                    }}>
                            <StyledTimeMeta $variant={variant}>{variant === 'date' ? r.startTime : r.date.slice(5)}</StyledTimeMeta>
                            <StyledServiceName $variant={variant}>
                                <ServiceChipList service={r.service}
                                                 serviceColorMap={serviceColorMap}
                                                 keyPrefix={r.id}
                                                 textAs="strong" />
                            </StyledServiceName>
                            <StyledCustomerMeta $variant={variant}>
                                {isNewCustomerVisit(customer?.firstVisitDate, r.date) &&
                                    <NewCustomerBadge>N</NewCustomerBadge>}
                                <StyledCustomerName className={isInactive ? 'strike' : undefined}>{customer?.name ?? ''}</StyledCustomerName>
                            </StyledCustomerMeta>
                        </StyledItem>
                    </li>
                );
            })}
        </StyledList>
        {!hideViewAll && (
            <StyledViewAllButton type="button"
                                 $variant={variant}
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     onViewAll();
                                 }}>
                {variant === 'date' ? '전체' : '전체보기'} ({reservations.length})
            </StyledViewAllButton>
        )}
    </>);
};

const StyledList = styled.ul<{ $variant: 'date' | 'month' }>`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.$variant === 'date' ? '2px' : '3px'};
    ${(props) => props.$variant === 'date' ? 'margin-top: 2px;' : ''}
    padding: ${(props) => props.$variant === 'date' ? '0' : '0 2px'};
    list-style: none;
    flex: 1;
    min-height: 0;
    ${(props) => props.$variant === 'date' ? '' : 'width: 100%;'}
    overflow-y: auto;
    overscroll-behavior: auto;
    box-sizing: border-box;
`;

/* 모바일 월별 셀(variant=date)은 폭이 약 55px뿐이라 시간·서비스까지 넣으면 칩 하나가 3줄로 접힌다.
   담당자 색(왼쪽 굵은 테두리) + 고객명만 남겨 1줄로 눕히고, 나머지는 날짜 탭 → 예약 목록 레이어에서 본다. */
const compactChipOnMobile = (variant: 'date' | 'month', css: string) => (
    variant === 'date' ? `@media (max-width: 640px) { ${css} }` : ''
);

const StyledItem = styled.button<{ $color: string; $inactive?: boolean; $variant: 'date' | 'month' }>`
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
    ${(p) => compactChipOnMobile(p.$variant, `
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

const StyledServiceName = styled.span<{ $variant: 'date' | 'month' }>`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--gap-xs);
    min-width: 0;
    ${(p) => compactChipOnMobile(p.$variant, 'display: none;')}
`;


const StyledMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledTimeMeta = styled(StyledMeta)<{ $variant: 'date' | 'month' }>`
    ${(p) => compactChipOnMobile(p.$variant, 'display: none;')}
`;

/* 신규고객 배지는 배지+간격만 18px — 남은 글자 폭의 절반을 먹는다. 모바일 셀에선 접고 레이어에서 확인. */
const StyledCustomerMeta = styled(StyledMeta)<{ $variant: 'date' | 'month' }>`
    ${(p) => compactChipOnMobile(p.$variant, `
        flex-wrap: nowrap;
        min-width: 0;

        ${NewCustomerBadge} { display: none; }
    `)}
`;

const StyledViewAllButton = styled.button<{ $variant: 'date' | 'month' }>`
    width: 100%;
    margin: ${(props) => props.$variant === 'date' ? '2px 0 0' : '4px auto 2px'};
    padding: ${(props) => props.$variant === 'date' ? '2px 0' : '3px 0'};
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    background-color: var(--white-color);
    font-size: ${(props) => props.$variant === 'date' ? '9px' : '10px'};
    font-weight: 600;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--light-gray-color);
        }
    }
`;
