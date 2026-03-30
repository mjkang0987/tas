import {useMemo} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {getServiceColor} from '../../utils/services';

import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
} from './ModalStyles';

import type {Reservation} from '../../utils/reservations';

const STATUS_LABELS: Record<string, string> = {
    cancelled: '취소',
    noshow: '노쇼',
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#4285F4'},
    cancelled: {bg: '#F1F1F1', color: '#999'},
    completed: {bg: '#E6F4EA', color: '#34A853'},
    noshow: {bg: '#FCE8E6', color: '#EA4335'},
};

export const ReservationListModal = () => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const filter = useCalendarStore((s) => s.reservationListFilter);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);
    const modalRoot = document.getElementById('modal-root');

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const {title, reservations, grouped} = useMemo(() => {
        if (!filter) return {title: '', reservations: [] as Reservation[], grouped: [] as { date: string; items: Reservation[] }[]};

        let list: Reservation[];
        let modalTitle: string;

        if (filter.type === 'date') {
            list = (reservationMap[filter.dateKey] || [])
                .slice()
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
            modalTitle = filter.dateKey;
        } else {
            const pad = (n: number) => String(n + 1).padStart(2, '0');
            const prefix = `${filter.year}-${pad(filter.month)}`;
            list = [];

            for (const [key, rList] of Object.entries(reservationMap)) {
                if (key.startsWith(prefix)) {
                    list.push(...rList);
                }
            }

            list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
            modalTitle = `${filter.year}년 ${filter.month + 1}월`;
        }

        const groups: { date: string; items: Reservation[] }[] = [];
        for (const r of list) {
            const last = groups[groups.length - 1];
            if (last && last.date === r.date) {
                last.items.push(r);
            } else {
                groups.push({date: r.date, items: [r]});
            }
        }

        return {title: modalTitle, reservations: list, grouped: groups};
    }, [filter, reservationMap]);

    const getStatusType = (r: Reservation) => {
        if (r.status === 'cancelled') return 'cancelled';
        if (r.status === 'noshow') return 'noshow';
        if (r.date < today) return 'completed';
        return 'booked';
    };

    const getStatusLabel = (r: Reservation) => {
        const type = getStatusType(r);
        if (type === 'booked') return '예약';
        if (type === 'completed') return '완료';
        return STATUS_LABELS[type] || '예약';
    };

    const handleClose = () => setReservationListFilter(null);

    const handleClick = (r: Reservation) => {
        setSelectedReservation(r);
    };

    if (!modalRoot) return null;

    return createPortal(<StyledOverlay onClick={handleClose}
                                       role="dialog"
                                       aria-modal="true"
                                       aria-label="예약 목록">
        <StyledListModal onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>{title} 예약 ({reservations.length})</h3>
                <button type="button"
                        onClick={handleClose}
                        aria-label="닫기">&#x2715;</button>
            </StyledHeader>
            <StyledListBody>
                {reservations.length === 0 ? (
                    <StyledEmpty>예약이 없습니다.</StyledEmpty>
                ) : (
                    grouped.map((group) => (
                        <StyledDateGroup key={group.date}>
                            <StyledDateTitle>{group.date} ({group.items.length})</StyledDateTitle>
                            <StyledList>
                                {group.items.map((r) => {
                                    const customer = customerMap[r.customerId];
                                    const statusType = getStatusType(r);
                                    const isInactive = statusType === 'cancelled' || statusType === 'noshow';

                                    return (
                                        <StyledItem key={r.id}
                                                    $color={getServiceColor(r.service)}
                                                    $inactive={isInactive}
                                                    onClick={() => handleClick(r)}>
                                            <StyledTime>{r.startTime}~{r.endTime}</StyledTime>
                                            <StyledService>{r.service}</StyledService>
                                            <StyledCustomer>{customer?.name ?? '-'}</StyledCustomer>
                                            <StyledBadge $type={statusType}>{getStatusLabel(r)}</StyledBadge>
                                        </StyledItem>
                                    );
                                })}
                            </StyledList>
                        </StyledDateGroup>
                    ))
                )}
            </StyledListBody>
        </StyledListModal>
    </StyledOverlay>, modalRoot);
};

const StyledListModal = styled(StyledDetail)`
    max-width: 500px;
    width: 100%;
`;

const StyledListBody = styled(StyledBody)`
    padding: 12px;
`;

const StyledEmpty = styled.p`
    padding: 24px;
    text-align: center;
    font-size: var(--small-font);
    color: var(--gray-color);
`;

const StyledList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledDateGroup = styled.div`
    &:not(:first-child) {
        margin-top: 8px;
    }
`;

const StyledDateTitle = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 10px;
    background-color: var(--white-color);
    border-bottom: 1px solid var(--light-gray-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledItem = styled.li<{ $color: string; $inactive: boolean }>`
    display: grid;
    grid-template-columns: 100px 1fr 60px 44px;
    gap: 8px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 4px;
    border-left: 3px solid ${(props) => props.$color};
    background-color: var(--black-color-10);
    font-size: var(--small-font);
    cursor: pointer;
    opacity: ${(props) => props.$inactive ? 0.5 : 1};

    &:hover {
        background-color: var(--light-gray-color);
    }
`;

const StyledTime = styled.span`
    color: var(--dark-gray-color);
`;

const StyledService = styled.span`
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const StyledCustomer = styled.span`
    color: var(--dark-gray-color);
    text-align: center;
`;

const StyledBadge = styled.span<{ $type: string }>`
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: var(--tiny-font);
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
    background-color: ${(props) => STATUS_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => STATUS_BADGE_STYLES[props.$type]?.color || '#999'};
`;
