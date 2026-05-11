import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledOverlay,
    StyledBody,
    StyledBodyInner,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {formatPrice, getServiceColor, parseServiceString} from '../../../utils/services';
import type {Designer} from '../../../utils/designers';
import type {Reservation, ReservationMap} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {isNewCustomerVisit} from '../../../utils/customers';
import type {DailyRevenue} from '../../../utils/revenue';
import {
    StyledClickableRow,
    StyledColorSwatch,
    StyledCustomerName,
    StyledInlineCustomerButton,
    StyledList,
    StyledPrice,
    StyledRevenueEmpty,
    StyledRevenueMetaItem,
    StyledRevenueMetaLabel,
    StyledRevenueMetaList,
    StyledRevenueRowBody,
    StyledRevenueServiceChip,
    StyledRevenueServiceName,
    StyledRevenueServiceText,
    StyledSummary,
    StyledTime,
} from './revenue-styles';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

interface RevenueDailyDetailModalProps {
    dateKey: string;
    daily: DailyRevenue;
    reservationMap: ReservationMap;
    designerMap: Record<number, Designer>;
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onClose: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectCustomer: (customerId: number) => void;
}

export const RevenueDailyDetailModal = ({
    dateKey,
    daily,
    reservationMap,
    designerMap,
    customerMap,
    serviceColorMap,
    onClose,
    onSelectReservation,
    onSelectCustomer,
}: RevenueDailyDetailModalProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('revenue-daily');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    return createPortal(
        <StyledDailyOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`${formatDateLabel(dateKey)} 상세`}
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledDailyModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup><h3>{formatDateLabel(dateKey)} 상세</h3><p>하루 예약 매출과 예약별 상세 내역입니다.</p></StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledDailyBody>
                    <StyledDailyBodyInner>
                    {daily.count === 0 ? (
                        <StyledRevenueEmpty>예약 없음</StyledRevenueEmpty>
                    ) : (
                        <StyledList>
                            {daily.items.map((item) => {
                                const reservation = (reservationMap[dateKey] || []).find((r) => r.id === item.reservationId);
                                const accentColor = reservation?.designerId
                                    ? (designerMap[reservation.designerId]?.color ?? '#8E8E93')
                                    : '#D1D5DB';
                                return (
                                    <StyledClickableRow
                                        key={item.reservationId}
                                        $accentColor={accentColor}
                                        $showAccentBar
                                        onClick={() => {
                                            if (!reservation) return;
                                            onSelectReservation(reservation);
                                        }}
                                    >
                                        <StyledTime>{item.startTime}</StyledTime>
                                        <StyledRevenueRowBody>
                                            <StyledRevenueMetaList>
                                                <StyledRevenueMetaItem>
                                                    <StyledRevenueMetaLabel>
                                                        <StyledColorSwatch $color={accentColor} />
                                                        <span>{designerMap[reservation?.designerId ?? -1]?.name ?? '미지정'}</span>
                                                    </StyledRevenueMetaLabel>
                                                    <StyledCustomerName>
                                                        {reservation && isNewCustomerVisit(customerMap[reservation.customerId]?.firstVisitDate, reservation.date) && <NewCustomerBadge>NEW</NewCustomerBadge>}
                                                        <StyledInlineCustomerButton
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!reservation) return;
                                                                onSelectCustomer(reservation.customerId);
                                                            }}
                                                        >
                                                            {customerMap[reservation?.customerId ?? -1]?.name ?? '고객 미지정'}
                                                        </StyledInlineCustomerButton>
                                                    </StyledCustomerName>
                                                    <StyledRevenueServiceName>
                                                        {parseServiceString(item.service).map((service) => (
                                                            <StyledRevenueServiceChip key={`${item.reservationId}-${service}`}>
                                                                <StyledRevenueServiceText $color={getServiceColor(service, serviceColorMap)}>{service}</StyledRevenueServiceText>
                                                            </StyledRevenueServiceChip>
                                                        ))}
                                                    </StyledRevenueServiceName>
                                                </StyledRevenueMetaItem>
                                            </StyledRevenueMetaList>
                                        </StyledRevenueRowBody>
                                        <StyledPrice>{formatPrice(item.price)}</StyledPrice>
                                    </StyledClickableRow>
                                );
                            })}
                        </StyledList>
                    )}
                    </StyledDailyBodyInner>
                </StyledDailyBody>
                <StyledFooter>
                    <StyledSummary>
                        <span>{daily.count}건</span>
                        <strong>{formatPrice(daily.total)}</strong>
                    </StyledSummary>
                    <StyledActionButton type="button" onClick={onClose}>닫기</StyledActionButton>
                </StyledFooter>
            </StyledDailyModal>
        </StyledDailyOverlay>,
        modalRoot
    );
};

/* ── Styled ── */

const StyledDailyOverlay = styled(StyledOverlay)`
    z-index: 160;
`;

const StyledDailyModal = styled(StyledDetail)`
    width: min(100%, 480px);
    max-width: min(480px, 90vw);
`;

const StyledDailyBody = styled(StyledBody)`
    max-height: min(60vh, 560px);
`;

const StyledDailyBodyInner = styled(StyledBodyInner)`
    padding-top: 8px;
`;
