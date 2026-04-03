import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {buildServiceColorMap, getServiceColor} from '../../utils/services';

import type {Reservation} from '../../utils/reservations';

interface ReservationListProps {
    reservations: Reservation[];
    variant: 'date' | 'month';
    onViewAll: () => void;
    hideViewAll?: boolean;
}

export const ReservationList = ({reservations, variant, onViewAll, hideViewAll}: ReservationListProps) => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    return (<>
        <StyledList $variant={variant}>
            {reservations.map((r) => {
                const customer = customerMap[r.customerId];

                return (
                    <li key={r.id}>
                        <StyledItem type="button"
                                    $color={getServiceColor(r.service, serviceColorMap)}
                                    onClick={() => setSelectedReservation(r)}>
                            <span>{variant === 'date' ? r.startTime : r.date.slice(5)}</span>
                            <strong>{r.service}</strong>
                            <span>{customer?.name ?? ''}</span>
                        </StyledItem>
                    </li>
                );
            })}
        </StyledList>
        {!hideViewAll && (
            <StyledViewAllButton type="button"
                                 $variant={variant}
                                 onClick={onViewAll}>
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

const StyledItem = styled.button<{ $color: string }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    border: none;
    border-radius: 3px;
    background-color: ${(props) => props.$color};
    color: #fff;
    font-size: 11px;
    cursor: pointer;
    text-align: left;
    opacity: 0.85;

    &:hover {
        opacity: 1;
    }

    strong {
        font-weight: 600;
    }

    span {
        opacity: 0.9;
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
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
        background-color: var(--light-gray-color);
    }
`;
