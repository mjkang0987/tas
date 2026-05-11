import {useMemo} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {isNewCustomerVisit} from '../../../utils/customers';
import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, getServiceColor, parseServiceString} from '../../../utils/services';

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
        if (r.status === 'completed') return 'completed';
        if (r.date < today) return 'completed';
        return 'booked';
    };

    const getStatusLabel = (r: Reservation) => {
        const type = getStatusType(r);
        if (type === 'booked') return '예약';
        if (type === 'completed') return '완료';
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
        <StyledListModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <StyledHeaderTitleGroup>
                    <h3>{title} 예약 ({reservations.length})</h3>
                    <p>예약을 누르면 상세 레이어가 열리고, 고객명은 바로 고객 상세로 이동합니다.</p>
                </StyledHeaderTitleGroup>
                <CloseIconButton onClick={handleClose} />
            </StyledHeader>
            <StyledListBody><StyledListBodyInner>
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
                                                <StyledTopMeta>
                                                    <StyledBadge $type={statusType}>{getStatusLabel(r)}</StyledBadge>
                                                    <StyledTime>{r.startTime}~{r.endTime}</StyledTime>
                                                </StyledTopMeta>
                                                <StyledPrice>{Number(r.price ?? 0).toLocaleString('ko-KR')}원</StyledPrice>
                                            </StyledItemTop>
                                            <StyledService>
                                                {parseServiceString(r.service).map((serviceName) => (
                                                    <StyledServiceToken key={`${r.id}-${serviceName}`}>
                                                        <StyledServiceText $color={getServiceColor(serviceName, serviceColorMap)}>{serviceName}</StyledServiceText>
                                                    </StyledServiceToken>
                                                ))}
                                            </StyledService>
                                            <StyledMetaLine>
                                                <StyledDesigner>
                                                    <StyledDesignerSwatch $color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#D1D5DB'} />
                                                    <span>{designerName}</span>
                                                </StyledDesigner>
                                                <StyledCustomer>
                                                    <StyledCustomerLabel>고객</StyledCustomerLabel>
                                                    {isNewCustomerVisit(customer?.firstVisitDate, r.date) && <NewCustomerBadge>NEW</NewCustomerBadge>}
                                                    <StyledCustomerButton
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!customer) return;
                                                            openCustomerDetail(customer.id);
                                                        }}
                                                    >
                                                        {customer?.name ?? '-'}
                                                    </StyledCustomerButton>
                                                </StyledCustomer>
                                            </StyledMetaLine>
                                        </StyledItem>
                                    );
                                })}
                            </StyledList>
                        </StyledDateGroup>
                    ))
                )}
            </StyledListBodyInner></StyledListBody>
            <StyledFooter>
                <StyledFooterSummary>
                    <span>총 {reservations.length}건</span>
                </StyledFooterSummary>
                <StyledActionButton type="button" onClick={handleClose}>닫기</StyledActionButton>
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
    gap: 8px;
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
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.96) 100%);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
`;

const StyledItem = styled.li<{ $color: string; $inactive: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${(props) => `${props.$color}55`};
    border-left-width: 4px;
    border-radius: 14px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.94) 0%, ${(props) => `${props.$color}10`} 100%);
    font-size: var(--small-font);
    cursor: pointer;
    opacity: ${(props) => props.$inactive ? 0.5 : 1};
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
    transition: transform 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(15, 23, 42, 0.09);
            background-color: ${(props) => `${props.$color}12`};
        }
    }
`;

const StyledItemTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledTopMeta = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const StyledService = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 500;
    line-height: 1.5;
`;

const StyledTime = styled.span`
    color: var(--dark-gray-color);
    font-weight: 600;
`;

const StyledPrice = styled.span`
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;

    @media (max-width: 640px) {
        width: 100%;
        text-align: right;
    }
`;

const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    min-width: 0;
`;

const StyledServiceText = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 999px;
    background-color: ${(props) => `${props.$color}18`};
    color: ${(props) => props.$color};
    font-size: 11px;
    font-weight: 600;
`;

const StyledCustomer = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    color: var(--dark-gray-color);
    min-width: 0;
`;

const StyledDesigner = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gray-color);
`;

const StyledMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    font-size: 11px;
    row-gap: 8px;
`;

const StyledDesignerSwatch = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: ${(props) => props.$color};
    flex-shrink: 0;
`;

const StyledCustomerLabel = styled.span`
    color: var(--dark-gray-color2);
    font-weight: 600;
`;

const StyledCustomerButton = styled.button`
    min-width: 0;
    max-width: 100%;
    border: 0;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
    color: #0f172a;
    white-space: normal;
    line-height: 1.35;
    word-break: keep-all;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
    }
`;

const StyledFooterSummary = styled.div`
    margin-right: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color2);
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
