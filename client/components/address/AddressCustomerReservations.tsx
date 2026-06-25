import React, {useMemo} from 'react';

import styled from 'styled-components';

import type {Reservation} from '../../utils/reservations';
import {EMPTY_TEXT, StyledEmptyCard} from '../settings/settings-styles';
import {CustomerReservationCards} from '../ui/CustomerReservationCards';

const STATUS_GROUPS = [
    {key: 'booked', label: '예약'},
    {key: 'completed', label: '완료'},
    {key: 'cancelled', label: '취소'},
    {key: 'noshow', label: '노쇼'},
] as const;

type AddressCustomerReservationsProps = {
    customerReservations: Reservation[];
    assigneeColorMap: Record<number, string>;
    assigneeNameMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    today: string;
    onReservationClick: (reservation: Reservation) => void;
};

function getEffectiveStatus(r: Reservation, today: string) {
    if (r.status === 'cancelled') return 'cancelled';
    if (r.status === 'noshow') return 'noshow';
    if (r.status === 'completed') return 'completed';
    if (r.date < today) return 'completed';
    return 'booked';
}

// 미래 → 과거 순 (날짜 내림차순, 시간 내림차순)
function sortFutureFirst(a: Reservation, b: Reservation) {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.startTime.localeCompare(a.startTime);
}

export function AddressCustomerReservations({
    customerReservations,
    assigneeColorMap,
    assigneeNameMap,
    serviceColorMap,
    today,
    onReservationClick,
}: AddressCustomerReservationsProps) {
    const grouped = useMemo(() => {
        const map: Record<string, Reservation[]> = {
            booked: [],
            completed: [],
            cancelled: [],
            noshow: [],
        };

        for (const r of customerReservations) {
            const status = getEffectiveStatus(r, today);
            map[status].push(r);
        }

        for (const key of Object.keys(map)) {
            map[key].sort(sortFutureFirst);
        }

        return map;
    }, [customerReservations, today]);

    const nonEmptyGroups = STATUS_GROUPS.filter((g) => grouped[g.key].length > 0);

    if (nonEmptyGroups.length === 0) {
        return <StyledEmptyCard>{EMPTY_TEXT}</StyledEmptyCard>;
    }

    return (
        <StyledGroupWrap>
            {nonEmptyGroups.map((group) => (
                <StyledGroup key={group.key}>
                    <StyledGroupLabel>{group.label} ({grouped[group.key].length})</StyledGroupLabel>
                    <CustomerReservationCards
                        reservations={grouped[group.key]}
                        assigneeColorMap={assigneeColorMap}
                        assigneeNameMap={assigneeNameMap}
                        serviceColorMap={serviceColorMap}
                        today={today}
                        onReservationClick={onReservationClick}
                    />
                </StyledGroup>
            ))}
        </StyledGroupWrap>
    );
}

const StyledGroupWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledGroupLabel = styled.p`
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;

