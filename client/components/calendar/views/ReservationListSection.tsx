import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {isNewCustomerVisit} from '../../../utils/customers';
import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../../utils/assignees';
import {buildServiceColorMap} from '../../../utils/services';

import {EMPTY_TEXT, StyledEmpty as StyledEmptyBase} from '../../settings/settings-styles';
import {getDailyRevenue, getMonthlyRevenue} from '../../../utils/revenue';
import {formatPrice} from '../../../utils/services';
import {
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledBody,
    StyledBodyInner,
} from '../overlays/ModalStyles';
import {ReservationInfoCard} from '../../ui/ReservationInfoCard';
import {ButtonAdd} from '../../ui/Buttons';

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
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
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
            const [, mm, dd] = filter.dateKey.split('-').map(Number);
            modalTitle = `${mm}월 ${dd}일`;
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

    // 합계는 연 뷰와 같은 기준(취소·노쇼 제외)으로 낸다. iOS daySummary 와도 같다.
    const total = useMemo(() => {
        if (!filter) return 0;
        return filter.type === 'date'
            ? getDailyRevenue(reservationMap, filter.dateKey, calendarAssigneeId ?? null, 'booked').total
            : getMonthlyRevenue(reservationMap, filter.year, filter.month, calendarAssigneeId ?? null, 'booked').total;
    }, [filter, reservationMap, calendarAssigneeId]);

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
        <StyledListPanel>
            <StyledListHeader>
                <StyledListTitle>{title}</StyledListTitle>
                {/* 0건일 때도 자리를 지킨다 — 빠지면 아래 추가 버튼이 제목 옆으로 붙는다. */}
                <StyledHeaderSummary>{reservations.length}건 · {formatPrice(total)}</StyledHeaderSummary>
                {/* 이 머리줄은 이미 날짜를 들고 있다. 헤더의 ＋예약 은 언제나 '오늘'로 열려
                    고른 날짜에 넣을 수 없다(모바일 칸에는 버튼을 둘 자리가 없다). */}
                {filter?.type === 'date' && (
                    <StyledHeaderAdd onClick={() => setCreateReservationInitial({date: filter.dateKey, startTime: '10:00'})}
                                     aria-label={`${title} 예약 추가`}/>
                )}
            </StyledListHeader>
            <StyledListBody>
                <StyledListBodyInner>
                    {reservations.length === 0 ? (
                        <StyledEmpty>{title} 예약이 없습니다.</StyledEmpty>
                    ) : (
                        grouped.map((group) => (
                            <StyledDateGroup key={group.date}>
                                {/* 날짜 목록은 그룹이 하나뿐이고, 바로 위 헤더가 이미 "10월 13일 · N건" 이다.
                                    좁은 모바일에서 같은 날짜를 두 번 적느라 32px 을 버릴 이유가 없다. */}
                                {filter?.type !== 'date' && (
                                    <StyledDateTitle>{group.date} ({group.items.length})</StyledDateTitle>
                                )}
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
/* 헤더 바 — iOS selectedDayList 의 머리줄(secondarySystemBackground, 가로 16 세로 6). */
const StyledListHeader = styled(StyledHeader)`
    align-items: center;
    padding: 6px 16px;
    border-bottom: none;
    background-color: var(--gray-color2);
`;

/* 이 머리줄의 날짜만 줄인다 — StyledHeaderTitle 은 모달 30여 곳이 공유해 공통값을 못 건드린다.
   레이어 제목이 아니라 달력에 붙은 영역의 머리줄이라 16px 은 과했다. */
const StyledListTitle = styled(StyledHeaderTitle)`
    font-size: var(--tiny-font);
`;

/* 오른쪽 요약 — iOS 는 caption/secondary 로 "N건 · 금액"을 둔다. */
const StyledHeaderSummary = styled.span`
    margin-left: auto;
    color: var(--dark-gray-color2);
    font-size: var(--small-font);
`;

const StyledHeaderAdd = styled(ButtonAdd)`
    margin-left: 6px;
    color: var(--brand-color);
`;

const StyledListSection = styled.section`
    /* 남은 세로 자리를 채우고, 스크롤은 제 안(StyledListBody)에서만 일어난다.
       min-height: 0 이 없으면 flex 자식이 내용만큼 늘어나 페이지가 밀린다. */
    flex: 1;
    min-height: 0;
    display: flex;
    border-top: 1px solid var(--light-gray-color);

    /* 데스크톱은 달력 오른쪽 기둥. 제 안에서 스크롤해 달력을 밀지 않는다. */
    @media (min-width: 641px) {
        flex: 0 0 auto;
        width: 340px;
        height: 100%;
        border-top: none;
        border-left: 1px solid var(--light-gray-color);
    }
`;

const StyledListPanel = styled(StyledDetail)`
    flex: 1;
    min-height: 0;
    /* 흐름에 붙으므로 떠 있는 표면의 장식(그림자·둥근 모서리·높이 제한)을 걷는다. */
    width: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
    /* 바깥 StyledListSection 이 경계를 긋는다(모바일 위, 데스크톱 왼쪽). 패널은 테두리를 두지 않는다. */
    border: none;
    box-shadow: none;
`;

const StyledListBody = styled(StyledBody)``;

const StyledListBodyInner = styled(StyledBodyInner)`
    /* 아래 여백은 8px — 바로 밑이 광고 배너라 더 비워도 빈 자리로만 보인다. */
    padding: 6px 8px 8px;
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

    /* 연 뷰 목록은 그룹이 여럿이라 이 여백이 누적된다 — 좁은 화면에서만 좁힌다. */
    @media (max-width: 640px) {
        gap: 4px;

        &:not(:first-child) {
            margin-top: 8px;
        }
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
