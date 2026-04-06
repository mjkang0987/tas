import {useMemo} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, getServiceColor, parseServiceString} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
} from './ModalStyles';

import type {Reservation} from '../../../utils/reservations';

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
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);
    const modalRoot = document.getElementById('modal-root');
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerNameMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = designer.name;
            return acc;
        }, {0: '미지정'}),
        [designers]
    );
    const designerColorMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = getDesignerColor(designer);
            return acc;
        }, {}),
        [designers]
    );

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

        if (calendarDesignerId != null) {
            list = list.filter((reservation) => reservation.designerId === calendarDesignerId);
            const designerName = designers.find((designer) => designer.id === calendarDesignerId)?.name;
            if (designerName) {
                modalTitle = `${modalTitle} · ${designerName}`;
            }
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
    }, [filter, reservationMap, calendarDesignerId, designers]);

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

    return createPortal(<StyledListOverlay onClick={handleClose}
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
                                    const designerName = r.designerId ? (designerNameMap[r.designerId] ?? '미지정') : '미지정';
                                    const statusType = getStatusType(r);
                                    const isInactive = statusType === 'cancelled' || statusType === 'noshow';

                                    return (
                                        <StyledItem key={r.id}
                                                    $color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                                    $inactive={isInactive}
                                                    onClick={() => handleClick(r)}>
                                            <StyledItemTop>
                                                <StyledBadge $type={statusType}>{getStatusLabel(r)}</StyledBadge>
                                                <StyledTime>{r.startTime}~{r.endTime}</StyledTime>
                                                <StyledService>
                                                    {parseServiceString(r.service).map((serviceName) => (
                                                        <StyledServiceToken key={`${r.id}-${serviceName}`}>
                                                            <StyledServiceDot $color={getServiceColor(serviceName, serviceColorMap)} />
                                                            <span>{serviceName}</span>
                                                        </StyledServiceToken>
                                                    ))}
                                                </StyledService>
                                            </StyledItemTop>
                                            <StyledMetaLine>
                                                <StyledDesigner>디자이너: {designerName}</StyledDesigner>
                                                <StyledCustomer>고객: {customer?.name ?? '-'}</StyledCustomer>
                                            </StyledMetaLine>
                                        </StyledItem>
                                    );
                                })}
                            </StyledList>
                        </StyledDateGroup>
                    ))
                )}
            </StyledListBody>
        </StyledListModal>
    </StyledListOverlay>, modalRoot);
};

const StyledListOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.base};
`;

const StyledListModal = styled(StyledDetail)`
    max-width: 500px;
    width: 100%;
`;

const StyledListBody = styled(StyledBody)`
    padding: 0 12px;
    overscroll-behavior: auto;
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
    
    &:last-child {
        margin-bottom: 10px;
    }
`;

const StyledDateTitle = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 12px 10px;
    background-color: var(--white-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledItem = styled.li<{ $color: string; $inactive: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid ${(props) => props.$color};
    border-left-width: 4px;
    border-radius: 8px;
    background-color: ${(props) => `${props.$color}12`};
    font-size: var(--small-font);
    cursor: pointer;
    opacity: ${(props) => props.$inactive ? 0.5 : 1};

    &:hover {
        background-color: ${(props) => `${props.$color}1d`};
    }
`;

const StyledItemTop = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const StyledTime = styled.span`
    color: var(--dark-gray-color);
`;

const StyledService = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 500;
`;

const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const StyledServiceDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
`;

const StyledCustomer = styled.span`
    color: var(--dark-gray-color);
`;

const StyledDesigner = styled.span`
    color: var(--gray-color);
`;

const StyledMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: var(--tiny-font);
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
