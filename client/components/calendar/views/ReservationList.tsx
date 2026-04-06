import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, getServiceColor, parseServiceString} from '../../../utils/services';
import {StyledColorDot} from '../service/ServiceFields';

import type {Reservation} from '../../../utils/reservations';

interface ReservationListProps {
    reservations: Reservation[];
    variant: 'date' | 'month';
    onViewAll: () => void;
    hideViewAll?: boolean;
}

export const ReservationList = ({reservations, variant, onViewAll, hideViewAll}: ReservationListProps) => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = getDesignerColor(designer);
            return acc;
        }, {}),
        [designers]
    );

    return (<>
        <StyledList $variant={variant}>
            {reservations.map((r) => {
                const customer = customerMap[r.customerId];

                return (
                    <li key={r.id}>
                        <StyledItem type="button"
                                    $color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateReservationInitial(null);
                                        setSelectedReservation(r);
                                    }}>
                            <StyledMeta>{variant === 'date' ? r.startTime : r.date.slice(5)}</StyledMeta>
                            <StyledServiceName>
                                {parseServiceString(r.service).map((serviceName) => (
                                    <StyledServiceToken key={`${r.id}-${serviceName}`}>
                                        <StyledColorDot $color={getServiceColor(serviceName, serviceColorMap)}/>
                                        <strong>{serviceName}</strong>
                                    </StyledServiceToken>
                                ))}
                            </StyledServiceName>
                            <StyledMeta>{customer?.name ?? ''}</StyledMeta>
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

const StyledItem = styled.button<{ $color: string }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    border: 1px solid ${(p) => p.$color};
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    background-color: ${(p) => `${p.$color}12`};
    color: var(--dark-gray-color);
    font-size: 11px;
    cursor: pointer;
    text-align: left;

    &:hover {
        background-color: ${(p) => `${p.$color}1d`};
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

const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;

    strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const StyledMeta = styled.span`
    opacity: 0.9;
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
