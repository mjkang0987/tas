import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {isNewCustomerVisit} from '../../../utils/customers';
import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../../utils/assignees';
import {buildServiceColorMap} from '../../../utils/services';

import {EMPTY_TEXT, StyledEmpty as StyledEmptyBase} from '../../settings/settings-styles';
import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledHeaderTitleGroup,
    StyledHeaderTitleGroupText,
    StyledBody,
    StyledBodyInner,
    useDialogAccessibility,
} from '../overlays/ModalStyles';
import {ReservationInfoCard} from '../../ui/ReservationInfoCard';

import type {Reservation} from '../../../utils/reservations';
import {hasCompletedPayment} from '../../../utils/reservations';

const STATUS_LABELS: Record<string, string> = {
    cancelled: '취소',
    noshow: '노쇼',
    requested: '신청',
};

/**
 * 월·년 뷰에서 고른 날짜/달의 예약 목록. **레이어가 아니라 달력 아래 영역이다** —
 * 덮는 것이 없어 달력이 그대로 보이고 페이지와 함께 스크롤된다.
 * 닫기 버튼이 없다. 다른 날짜를 고르면 그 날짜로 바뀌고, 뷰를 옮기면 스토어가 비운다(setView).
 */
export const ReservationListSection = () => {
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
    const handleClose = () => setReservationListFilter(null);
    // 영역이라 포커스를 가두지 않는다. Esc 로 비우는 것만 남긴다.
    const dialogRef = useDialogAccessibility<HTMLDivElement>(handleClose, {trapFocus: false});
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

    return (
        <StyledListSection aria-label="예약 목록">
        <StyledListPanel ref={dialogRef} tabIndex={-1}>
            <StyledHeader>
                <StyledHeaderTitleGroup>
                    <StyledHeaderTitle>{title} 예약 ({reservations.length})</StyledHeaderTitle>
                    <StyledHeaderTitleGroupText>예약을 누르면 상세 레이어가 열리고, 고객명은 바로 고객 상세로 이동합니다.</StyledHeaderTitleGroupText>
                </StyledHeaderTitleGroup>
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
        </StyledListPanel>
        </StyledListSection>
    );
};

/* 달력 바로 아래 자리. 랜드마크로 읽히고, 모달이 아니라 포커스도 가두지 않는다. */
const StyledListSection = styled.section`
    flex-shrink: 0;
    border-top: 1px solid var(--light-gray-color);
`;

const StyledListPanel = styled(StyledDetail)`
    /* 흐름에 붙으므로 떠 있는 표면의 장식(그림자·둥근 모서리·높이 제한)을 걷는다. */
    width: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
    border-left: none;
    border-right: none;
    box-shadow: none;
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
