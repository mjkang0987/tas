import {useMemo, useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import type {Customer} from '../../../utils/customers';
import type {Reservation, ReservationMap} from '../../../utils/reservations';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    useLayerInstanceId,
    scrollHintStyle,
    scrollContentStyle,
} from './ModalStyles';

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, getServiceColor, parseServiceString} from '../../../utils/services';
import {useCalendarStore} from '../../../store/calendarStore';

const PAGE_SIZE = 5;

interface CustomerDetailProps {
    customer: Customer;
    reservationMap: ReservationMap;
    onClose: () => void;
    onReservationClick?: (reservation: Reservation) => void;
}

export const CustomerDetail = ({customer, reservationMap, onClose, onReservationClick}: CustomerDetailProps) => {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('customer-detail');
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
    const designerNameMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = designer.name;
            return acc;
        }, {}),
        [designers]
    );

    const customerReservations = useMemo(() => {
        const list: Reservation[] = [];

        for (const items of Object.values(reservationMap)) {
            for (const r of items) {
                if (r.customerId === customer.id) {
                    list.push(r);
                }
            }
        }

        list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        return list;
    }, [reservationMap, customer.id]);

    const visibleList = customerReservations.slice(0, visibleCount);
    const hasMore = visibleCount < customerReservations.length;

    if (!modalRoot) return null;

    return createPortal(<StyledCustomerOverlay onClick={onClose}
                                               role="dialog"
                                               aria-modal="true"
                                               aria-label="고객 정보"
                                               id={layerId}
                                               data-layer-id={layerDataId}>
        <StyledCustomerDetail onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>{customer.name}</h3>
                <button type="button" onClick={onClose} aria-label="닫기">닫기</button>
            </StyledHeader>
            <StyledInfo>
                <dl>
                    <dt>연락처</dt>
                    <dd>{customer.tel}</dd>
                </dl>
            </StyledInfo>
            <StyledReservationSection>
                <StyledReservationScroll>
                <h4>예약 내역 ({customerReservations.length})</h4>
                <StyledReservationList>
                    {visibleList.map((r) => {
                        const designerColor = r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93';
                        const designerName = r.designerId ? (designerNameMap[r.designerId] ?? '미지정') : '미지정';
                        return (
                            <StyledReservationItem key={r.id}
                                                   type="button"
                                                   $clickable={!!onReservationClick}
                                                   $color={designerColor}
                                                   onClick={() => onReservationClick?.(r)}>
                                <StyledItemTop>
                                    <span className="date">{r.date}</span>
                                    <span className="time">{r.startTime}~{r.endTime}</span>
                                    <StyledServiceList>
                                        {parseServiceString(r.service).map((serviceName) => (
                                            <StyledServiceToken key={`${r.id}-${serviceName}`}>
                                                <StyledServiceDot $color={getServiceColor(serviceName, serviceColorMap)} />
                                                <span>{serviceName}</span>
                                            </StyledServiceToken>
                                        ))}
                                    </StyledServiceList>
                                </StyledItemTop>
                                <StyledMetaLine>
                                    <span>디자이너: {designerName}</span>
                                </StyledMetaLine>
                            </StyledReservationItem>
                        );
                    })}
                </StyledReservationList>
                {hasMore && <StyledMoreButton type="button"
                                              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                    더보기
                </StyledMoreButton>}
                </StyledReservationScroll>
            </StyledReservationSection>
        </StyledCustomerDetail>
    </StyledCustomerOverlay>, modalRoot);
};

const StyledCustomerOverlay = styled(StyledOverlay)`
  z-index: ${OVERLAY_Z_INDEX.childDetail};
`;

const StyledCustomerDetail = styled(StyledDetail)`
  width: 360px;
`;

const StyledInfo = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--light-gray-color);

  dl {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 4px 12px;
    margin: 0;
  }

  dt {
    font-size: 13px;
    color: var(--gray-color);
    font-weight: 500;
  }

  dd {
    margin: 0;
    font-size: 13px;
  }
`;

const StyledReservationSection = styled.div`
  flex: 1;
  ${scrollHintStyle};
`;

const StyledReservationScroll = styled.div`
  ${scrollContentStyle};
  padding: 12px 16px 30px;

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const StyledReservationList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledReservationItem = styled.button<{ $color: string; $clickable: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid ${props => props.$color};
  border-left-width: 4px;
  border-radius: 8px;
  background-color: ${props => `${props.$color}12`};
  color: var(--dark-gray-color);
  font-size: 12px;
  text-align: left;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  .date, .time {
    color: var(--dark-gray-color);
    opacity: 0.9;
  }

  &:hover {
    background-color: ${props => props.$clickable ? `${props.$color}1d` : `${props.$color}12`};
  }
`;

const StyledItemTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const StyledServiceList = styled.span`
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
  background-color: ${props => props.$color};
`;

const StyledMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: var(--tiny-font);
  color: var(--gray-color);
`;

const StyledMoreButton = styled.button`
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--light-gray-color);
  border-radius: 4px;
  background: none;
  font-size: 13px;
  color: var(--gray-color);
  cursor: pointer;

  &:hover {
    background-color: var(--black-color-10);
  }
`;
