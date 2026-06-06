import {useMemo} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {isNewCustomerVisit} from '../../../utils/customers';
import {buildDesignerColorMap, buildDesignerNameMap} from '../../../utils/designers';
import {buildServiceColorMap} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledFooter,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledBody,
    StyledBodyInner,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {ReservationInfoCard} from '../../ui/ReservationInfoCard';

import type {Reservation} from '../../../utils/reservations';
import {hasCompletedPayment} from '../../../utils/reservations';

const STATUS_LABELS: Record<string, string> = {
    cancelled: '예약취소',
    noshow: '노쇼',
};

export const ReservationListModal = () => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const filter = useCalendarStore((s) => s.reservationListFilter);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-list');
    const handleClose = () => setReservationListFilter(null);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(handleClose);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerNameMap = useMemo(() => buildDesignerNameMap(designers, true), [designers]);
    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const {title, reservations, grouped} = useMemo(() => {
        if (!filter) return {
            title: '',
            reservations: [] as Reservation[],
            grouped: [] as { date: string; items: Reservation[] }[]
        };

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
            list = list.filter((reservation) => (
                calendarDesignerId === 0 ? !reservation.designerId : reservation.designerId === calendarDesignerId
            ));
            const designerName = calendarDesignerId === 0
                ? '미지정'
                : designers.find((designer) => designer.id === calendarDesignerId)?.name;
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
        if (hasCompletedPayment(r)) return 'paid';
        return 'booked';
    };

    const getStatusLabel = (r: Reservation) => {
        const type = getStatusType(r);
        if (type === 'paid') return '결제완료';
        if (type === 'booked') return '예약';
        return STATUS_LABELS[type] || '예약';
    };

    const handleClick = (r: Reservation) => {
        openReservationDetail(r);
    };

    if (!modalRoot) return null;

    return createPortal(<StyledListOverlay onClick={handleClose}
                                           role="dialog"
                                           aria-modal="true"
                                           aria-label="예약 목록"
                                           id={layerId}
                                           data-layer-id={layerDataId}>
        <StyledListModal ref={dialogRef}
                         tabIndex={-1}
                         onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <StyledHeaderTitleGroup>
                    <h3>{title} 예약 ({reservations.length})</h3>
                    <p>예약을 누르면 상세 레이어가 열리고, 고객명은 바로 고객 상세로 이동합니다.</p>
                </StyledHeaderTitleGroup>
                <CloseIconButton onClick={handleClose} />
            </StyledHeader>
            <StyledListBody>
                <StyledListBodyInner>
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
                                        return (
                                            <StyledItem key={r.id}>
                                                    <ReservationInfoCard
                                                        reservation={r}
                                                        serviceColorMap={serviceColorMap}
                                                        designerColor={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                                        designerName={designerName}
                                                    customerName={customer?.name ?? '-'}
                                                    today={today}
                                                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, r.date)}
                                                    onClick={handleClick}
                                                    onCustomerClick={customer ? openCustomerDetail : undefined}
                                                    showDate={false}
                                                    showPrice
                                                    showStatus
                                                    timeMode="range"
                                                    accentColor={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                                    accentBar
                                                />
                                            </StyledItem>
                                        );
                                    })}
                                </StyledList>
                            </StyledDateGroup>
                        ))
                    )}
                </StyledListBodyInner>
            </StyledListBody>
            <StyledFooter>
                <StyledFooterSummary>
                    <span>총 {reservations.length}건</span>
                </StyledFooterSummary>
                <StyledActionButton type="button"
                                    onClick={handleClose}>닫기</StyledActionButton>
            </StyledFooter>
        </StyledListModal>
    </StyledListOverlay>, modalRoot);
};

const StyledListOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.base};
`;

const StyledListModal = styled(StyledDetail)`
    max-width: 560px;
    width: 100%;
`;

const StyledListBody = styled(StyledBody)``;

const StyledListBodyInner = styled(StyledBodyInner)`
    padding: 6px 8px 18px;
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
    gap: 2px;
`;

const StyledDateGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    &:not(:first-child) {
        margin-top: 14px;
    }

    &:last-child {
        margin-bottom: 10px;
    }
`;

const StyledDateTitle = styled.div`
    position: sticky;
    top: -2px;
    z-index: 2;
    display: flex;
    align-items: center;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #111;
    letter-spacing: -0.01em;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledItem = styled.li``;

const StyledFooterSummary = styled.div`
    margin-right: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color2);
`;
