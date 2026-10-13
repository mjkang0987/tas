import {useMemo} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {isNewCustomerVisit} from '../../../utils/customers';
import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../../utils/assignees';
import {buildServiceColorMap} from '../../../utils/services';

import {EMPTY_TEXT, StyledEmpty as StyledEmptyBase} from '../../settings/settings-styles';
import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledFooter,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledHeaderTitleGroup,
    StyledHeaderTitleGroupText,
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
    cancelled: '취소',
    noshow: '노쇼',
    requested: '신청',
};

/**
 * @param inline 레이어로 띄우지 않고 **달력 아래 문서 흐름에** 그대로 붙인다.
 *   덮는 것이 없어 달력이 그대로 보이고, 페이지와 함께 스크롤된다.
 */
export const ReservationListModal = ({inline = false}: {inline?: boolean}) => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const filter = useCalendarStore((s) => s.reservationListFilter);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-list');
    const handleClose = () => setReservationListFilter(null);
    // 흐름에 붙을 때는 모달이 아니다 — 포커스를 가두지 않는다(Esc 로 닫는 것만 남는다).
    const dialogRef = useDialogAccessibility<HTMLDivElement>(handleClose, {trapFocus: !inline});
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const assigneeNameMap = useMemo(() => buildAssigneeNameMap(assignees, true), [assignees]);
    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);

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

        if (calendarAssigneeId != null) {
            list = list.filter((reservation) => (
                calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId
            ));
            const assigneeName = calendarAssigneeId === 0
                ? '미지정'
                : assignees.find((assignee) => assignee.id === calendarAssigneeId)?.name;
            if (assigneeName) {
                modalTitle = `${modalTitle} · ${assigneeName}`;
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
    }, [filter, reservationMap, calendarAssigneeId, assignees]);

    const getStatusType = (r: Reservation) => {
        if (r.status === 'cancelled') return 'cancelled';
        if (r.status === 'noshow') return 'noshow';
        if (r.status === 'requested') return 'requested';
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

    if (!inline && !modalRoot) return null;

    const body = (
        <StyledListModal ref={dialogRef}
                         $inline={inline}
                         tabIndex={-1}
                         onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <StyledHeaderTitleGroup>
                    <StyledHeaderTitle>{title} 예약 ({reservations.length})</StyledHeaderTitle>
                    <StyledHeaderTitleGroupText>예약을 누르면 상세 레이어가 열리고, 고객명은 바로 고객 상세로 이동합니다.</StyledHeaderTitleGroupText>
                </StyledHeaderTitleGroup>
                <CloseIconButton onClick={handleClose} />
            </StyledHeader>
            <StyledListBody>
                <StyledListBodyInner>
                    {reservations.length === 0 ? (
                        <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                    ) : (
                        grouped.map((group) => (
                            <StyledDateGroup key={group.date}>
                                <StyledDateTitle>{group.date} ({group.items.length})</StyledDateTitle>
                                <StyledList>
                                    {group.items.map((r) => {
                                        const customer = customerMap[r.customerId];
                                        const assigneeName = r.assigneeId ? (assigneeNameMap[r.assigneeId] ?? '미지정') : '미지정';
                                        return (
                                            <StyledItem key={r.id}>
                                                    <ReservationInfoCard
                                                        reservation={r}
                                                        serviceColorMap={serviceColorMap}
                                                        assigneeColor={r.assigneeId ? (assigneeColorMap[r.assigneeId] ?? '#8E8E93') : '#8E8E93'}
                                                        assigneeName={assigneeName}
                                                    customerName={customer?.name ?? '-'}
                                                    today={today}
                                                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, r.date)}
                                                    onClick={handleClick}
                                                    onCustomerClick={customer ? openCustomerDetail : undefined}
                                                    showDate={false}
                                                    showPrice
                                                    showStatus
                                                    timeMode="range"
                                                    accentColor={r.assigneeId ? (assigneeColorMap[r.assigneeId] ?? '#8E8E93') : '#8E8E93'}
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
    );

    if (inline) {
        return <StyledInlineRegion aria-label="예약 목록">{body}</StyledInlineRegion>;
    }

    return createPortal(<StyledListOverlay onClick={handleClose}
                                           role="dialog"
                                           aria-modal="true"
                                           aria-label="예약 목록"
                                           id={layerId}
                                           data-layer-id={layerDataId}>
        {body}
    </StyledListOverlay>, modalRoot!);
};

const StyledListOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.base};
`;

const StyledListModal = styled(StyledDetail)<{ $inline: boolean }>`
    max-width: 560px;
    width: 100%;

    ${(props) => props.$inline && `
    /* 흐름에 붙으므로 떠 있는 표면의 장식을 걷는다 — 그림자·둥근 모서리·높이 제한 없이
       달력 아래 이어지는 한 덩어리로 보이게 한다. */
    max-width: none;
    max-height: none;
    border-radius: 0;
    border-left: none;
    border-right: none;
    box-shadow: none;
    `}
`;

/* 달력 바로 아래 자리. section 이라 랜드마크로 읽히고, 모달이 아니라 포커스도 가두지 않는다. */
const StyledInlineRegion = styled.section`
    flex-shrink: 0;
    border-top: 1px solid var(--light-gray-color);
`;

const StyledListBody = styled(StyledBody)``;

const StyledListBodyInner = styled(StyledBodyInner)`
    padding: 6px 8px 18px;
`;

const StyledEmpty = styled(StyledEmptyBase)`
    padding: 24px;
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
    font-size: var(--small-font);
    font-weight: 700;
    color: #111;
    letter-spacing: -0.01em;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledItem = styled.li``;

const StyledFooterSummary = styled.div`
    margin-right: auto;
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color2);
`;
