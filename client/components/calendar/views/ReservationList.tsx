import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {isNewCustomerVisit} from '../../../utils/customers';
import {buildDesignerColorMap} from '../../../utils/designers';
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
    const designers = useCalendarStore((s) => s.designers);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);

    return (<>
        <StyledList $variant={variant}>
            {reservations.map((r) => {
                const customer = customerMap[r.customerId];

                return (
                    <li key={r.id}>
                        <StyledItem type="button"
                                    $color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                    $inactive={r.status === 'cancelled' || r.status === 'noshow'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateReservationInitial(null);
                                        openReservationDetail(r);
                                    }}>
                            <StyledMeta>{variant === 'date' ? r.startTime : r.date.slice(5)}</StyledMeta>
                            <StyledServiceName>
                                <ServiceChipList service={r.service}
                                                 serviceColorMap={serviceColorMap}
                                                 keyPrefix={r.id}
                                                 textAs="strong" />
                            </StyledServiceName>
                            <StyledMeta>
                                {isNewCustomerVisit(customer?.firstVisitDate, r.date) &&
                                    <NewCustomerBadge>N</NewCustomerBadge>}
                                <span>{customer?.name ?? ''}</span>
                            </StyledMeta>
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
    font-size: 11px;
    text-align: left;
    ${(p) => p.$inactive && 'filter: grayscale(.5); opacity: 0.5;'};

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: ${(p) => `${p.$color}1d`};
        }
    }

    strong {
        font-weight: 600;
    }
`;

const StyledServiceName = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--gap-xs);
    min-width: 0;
`;


const StyledMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
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
