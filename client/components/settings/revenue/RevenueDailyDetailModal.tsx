import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitle,
    StyledHeaderTitleGroup,
    StyledHeaderTitleGroupText,
    StyledOverlay,
    StyledBody,
    StyledBodyInner,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {formatPrice} from '../../../utils/services';
import type {Assignee} from '../../../utils/assignees';
import type {Reservation, ReservationMap} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import type {DailyRevenue} from '../../../utils/revenue';
import {StyledSummary, StyledSummaryStrong} from './revenue-styles';
import {RevenueReservationList} from './RevenueReservationList';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

interface RevenueDailyDetailModalProps {
    dateKey: string;
    daily: DailyRevenue;
    reservationMap: ReservationMap;
    assigneeMap: Record<number, Assignee>;
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
    assigneeMap,
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
                    <StyledHeaderTitleGroup><StyledHeaderTitle>{formatDateLabel(dateKey)} 상세</StyledHeaderTitle><StyledHeaderTitleGroupText>하루 예약 매출과 예약별 상세 내역입니다.</StyledHeaderTitleGroupText></StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledDailyBody>
                    <StyledDailyBodyInner>
                    <RevenueReservationList
                        reservations={daily.items
                            .map((item) => (reservationMap[dateKey] || []).find((r) => r.id === item.reservationId))
                            .filter((reservation): reservation is Reservation => !!reservation)}
                        assigneeMap={assigneeMap}
                        customerMap={customerMap}
                        serviceColorMap={serviceColorMap}
                        onSelectReservation={onSelectReservation}
                        onSelectCustomer={onSelectCustomer}
                        emptyText="예약 없음"
                    />
                    </StyledDailyBodyInner>
                </StyledDailyBody>
                <StyledFooter>
                    <StyledSummary>
                        <span>{daily.count}건</span>
                        <StyledSummaryStrong>{formatPrice(daily.total)}</StyledSummaryStrong>
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
