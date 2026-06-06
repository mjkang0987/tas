import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {
    StyledActionButton,
    StyledBody,
    StyledBodyInner,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {formatPrice} from '../../../utils/services';
import type {Designer} from '../../../utils/designers';
import type {Reservation} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {formatTel} from '../../../utils/customers';
import type {RevenueFilterMode} from '../../../utils/revenue';
import type {RevenueMetricKey} from './RevenueKpiGrid';
import {
    StyledCustomerInfoGrid,
    StyledCustomerName,
    StyledList,
    StyledRevenueEmpty,
} from './revenue-styles';
import {RevenueReservationList} from './RevenueReservationList';

export interface CustomerEntry {
    customer: {id: number; name: string; tel: string; points?: number | null};
    visitDate: string;
    prevVisitDate?: string;
}

interface MetricLayer {
    title: string;
    summary: string;
    reservations: Reservation[];
    customers: CustomerEntry[];
}

interface RevenueMetricModalProps {
    metricLayerKey: RevenueMetricKey;
    metricLayer: MetricLayer;
    revenueFilterMode: RevenueFilterMode;
    designerMap: Record<number, Designer>;
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onClose: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectCustomer: (customerId: number) => void;
}

function formatVisitGap(visitDate: string, prevVisitDate: string): string {
    const visit = new Date(visitDate + 'T00:00:00');
    const prev = new Date(prevVisitDate + 'T00:00:00');
    const diffMs = visit.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays < 7) return `${diffDays}일전`;
    if (diffDays < 28) return `${Math.floor(diffDays / 7)}주전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}달전`;
    return `${Math.floor(diffDays / 365)}년전`;
}

export const RevenueMetricModal = ({
    metricLayerKey,
    metricLayer,
    revenueFilterMode,
    designerMap,
    customerMap,
    serviceColorMap,
    onClose,
    onSelectReservation,
    onSelectCustomer,
}: RevenueMetricModalProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('revenue-metric');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    return createPortal(
        <StyledMetricOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={metricLayer.title}
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledMetricModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>{metricLayer.title}</h3>
                        {(metricLayerKey === 'new' || metricLayerKey === 'returning') && (
                            <StyledMetricSubtitle>
                                {metricLayerKey === 'new'
                                    ? `${revenueFilterMode === 'completed' ? '선택 기간 안에서 첫 예약완료가 발생한 고객 목록' : '선택 기간 안에서 첫 예약이 발생한 고객 목록'}`
                                    : `${revenueFilterMode === 'completed' ? '선택 기간 내 예약완료가 있고, 그 이전 예약완료 이력이 있는 고객 목록' : '선택 기간 내 예약이 있고, 그 이전 예약 이력이 있는 고객 목록'}`}
                            </StyledMetricSubtitle>
                        )}
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledMetricBody>
                    <StyledMetricBodyInner>
                    {metricLayerKey === 'new' || metricLayerKey === 'returning' ? (
                        metricLayer.customers.length === 0 ? (
                            <StyledRevenueEmpty>내역이 없습니다.</StyledRevenueEmpty>
                        ) : (
                            <StyledCustomerList>
                                {metricLayer.customers.map((item) => (
                                    <StyledCustomerRow
                                        key={`${metricLayerKey}-customer-${item.customer.id}`}
                                        onClick={() => onSelectCustomer(item.customer.id)}
                                    >
                                        <StyledCustomerRowHeader>
                                            <StyledCustomerName>
                                                {metricLayerKey === 'new' && <NewCustomerBadge>N</NewCustomerBadge>}
                                                <StyledCustomerTitle>{item.customer.name}</StyledCustomerTitle>
                                                {metricLayerKey === 'returning' && item.prevVisitDate && (
                                                    <StyledVisitGapBadge>{formatVisitGap(item.visitDate, item.prevVisitDate)}</StyledVisitGapBadge>
                                                )}
                                            </StyledCustomerName>
                                            <StyledCustomerVisitDate>{item.visitDate}</StyledCustomerVisitDate>
                                        </StyledCustomerRowHeader>
                                        <StyledCustomerInfoGrid>
                                            <span><strong>연락처</strong>{item.customer.tel ? <StyledTelLink href={`tel:${item.customer.tel}`}>{formatTel(item.customer.tel)}</StyledTelLink> : '-'}</span>
                                            <span><strong>적립금</strong>{formatPrice(item.customer.points ?? 0)}</span>
                                            <span><strong>최근 방문일</strong>{item.visitDate}</span>
                                            {metricLayerKey === 'returning' && item.prevVisitDate && (
                                                <span><strong>이전 방문</strong>{item.prevVisitDate}</span>
                                            )}
                                        </StyledCustomerInfoGrid>
                                    </StyledCustomerRow>
                                ))}
                            </StyledCustomerList>
                        )
                    ) : metricLayer.reservations.length === 0 ? (
                        <StyledRevenueEmpty>내역이 없습니다.</StyledRevenueEmpty>
                    ) : (
                        <RevenueReservationList
                            reservations={metricLayer.reservations}
                            designerMap={designerMap}
                            customerMap={customerMap}
                            serviceColorMap={serviceColorMap}
                            onSelectReservation={onSelectReservation}
                            onSelectCustomer={onSelectCustomer}
                            variant="compact"
                        />
                    )}
                    </StyledMetricBodyInner>
                </StyledMetricBody>
                <StyledFooter>
                    <span>{metricLayer.summary}</span>
                    <StyledActionButton type="button" onClick={onClose}>닫기</StyledActionButton>
                </StyledFooter>
            </StyledMetricModal>
        </StyledMetricOverlay>,
        modalRoot
    );
};

/* ── Styled ── */

const StyledMetricOverlay = styled(StyledOverlay)`
    z-index: 180;
`;

const StyledMetricModal = styled(StyledDetail)`
    width: min(100%, 720px);
    max-width: min(720px, 90vw);
`;

const StyledMetricBody = styled(StyledBody)`
    max-height: min(60vh, 560px);
`;

const StyledMetricBodyInner = styled(StyledBodyInner)`
    padding-top: 10px;
`;

const StyledMetricSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
    font-weight: 500;
`;

const StyledCustomerList = styled(StyledList)`
    gap: 12px;
`;

const StyledCustomerRow = styled.button`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 10px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
    text-align: left;
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: rgba(66, 133, 244, 0.28);
            box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
        }
    }
`;

const StyledCustomerRowHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;

    @media (max-width: 640px) {
        flex-direction: column;
    }
`;

const StyledCustomerTitle = styled.span`
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    white-space: normal;
    line-height: 1.35;
    word-break: keep-all;
`;

const StyledCustomerVisitDate = styled.span`
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color2);
`;

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledVisitGapBadge = styled.span`
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(45, 127, 249, 0.1);
    font-size: 11px;
    font-weight: 700;
    color: var(--blue-color);
`;
