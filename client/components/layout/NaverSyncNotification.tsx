import {useState} from 'react';

import {useCalendarStore} from '../../store/calendarStore';
import {useStoreLabels} from '../../hooks/useStoreLabels';
import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import type {Reservation} from '../../utils/reservations';
import type {ReservationMap} from '../../features/reservations/model';
import type {Assignee} from '../../utils/assignees';
import {AssigneeLabel} from '../ui/AssigneeLabel';
import {ConflictResolutionDetailModal} from '../modals/ConflictResolutionDetailModal';

interface Props {
    notifications: SyncNotification[];
    markRead: (id: string) => void;
    reservationMap: ReservationMap;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
    /** 항목을 눌러 다른 화면(상세·충돌 모달)으로 갈 때 — 알림 목록을 닫는다 */
    onNavigate: () => void;
    /** 30일 기준 시각(ms) — 렌더 중 Date.now() 를 부르지 않게 부모가 넘긴다 */
    now: number;
}
const SEVEN_DAYS_MS  = 7  * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

function getAssigneeColor(assigneeName: string, assignees: Assignee[]): string {
    const assignee = assignees.find((d) => d.name === assigneeName);
    return assignee?.color ?? 'var(--unassigned-color)';
}

function getConflictStatusLabel(n: SyncNotification): string {
    if (n.conflictStatus === 'deferred') return '보류';
    if (n.conflictStatus === 'confirmed') return n.resolvedBy === 'auto' ? '자동 해소' : '처리완료';
    return '대기';
}

/** 목록에 보일 네이버 알림 — 미해결 중복예약(읽음·날짜 무관) + 30일 안의 안 읽은 일반 알림. */
export function naverPanelItems(notifications: SyncNotification[], now: number): SyncNotification[] {
    const pendingConflicts = notifications.filter(
        (n) => n.type === 'conflict' && n.conflictStatus !== 'confirmed',
    );
    const recentUnread = notifications.filter(
        (n) => n.type !== 'conflict' && !n.read && now - n.timestamp.getTime() <= THIRTY_DAYS_MS,
    );
    return [...pendingConflicts, ...recentUnread];
}

/**
 * 알림 목록의 '네이버 알림' 칸 — 미해결 중복예약 + 30일 안의 안 읽은 확정·취소.
 * 예전엔 따로 있던 네이버 벨이었는데 알림 종(NotificationCenter) 하나로 합쳤다(2026-10-22).
 * '모두 읽음'·'전체알림보기'는 칸 머리(NotificationCenter)에 있다.
 */
export const NaverSyncSection = ({
    notifications,
    markRead,
    reservationMap,
    onSelectReservation,
    onSelectConflict,
    onNavigate,
    now,
}: Props) => {
    const labels = useStoreLabels();
    const assignees = useCalendarStore((s) => s.assignees);
    const panelItems = naverPanelItems(notifications, now);

    const handleNotificationClick = (n: SyncNotification) => {
        markRead(n.id);
        if (n.type === 'conflict' && n.conflictKey) {
            onSelectConflict(n.conflictKey);
            onNavigate();
            return;
        }
        const dateReservations = Object.values(reservationMap).flat();
        const reservation = dateReservations.find((r) => r.id === n.reservationId);
        if (reservation) {
            onSelectReservation(reservation);
            onNavigate();
        }
    };

    return (
        <>
            {panelItems.length === 0 && (
                <StyledEmpty>새 알림이 없습니다</StyledEmpty>
            )}
            {panelItems.map((n) => (
                <StyledItem key={n.id}
                            type="button"
                            onClick={() => handleNotificationClick(n)}>
                    {n.type === 'conflict' ? (
                        <StyledConflictItemText>
                            <StyledUnreadDot />
                            <span className="message">
                                <span className="date">{formatDate(n.appointmentDate)}</span>{' '}
                                <span className="time">{n.appointmentTime}</span>{' '}
                                <span className="name">{n.customerName || '고객'}</span>{' '}
                                <span className="suffix">고객님</span>{' '}
                                <span className="name">{n.assigneeName || '미지정'}</span>{' '}
                                <span className="suffix">{labels.assignee}로 중복 예약 발생했습니다.</span>{' '}
                                <StyledConflictTag>중복예약</StyledConflictTag>{' '}
                                <StyledStatusTag $status={n.conflictStatus}>{getConflictStatusLabel(n)}</StyledStatusTag>
                            </span>
                        </StyledConflictItemText>
                    ) : (
                        <StyledItemText>
                            <StyledUnreadDot />
                            <span className="date">{formatDate(n.appointmentDate)}</span>
                            <span className="time">{n.appointmentTime}</span>
                            <span className="name">{n.customerName}</span>
                            <span className="suffix">고객님</span>
                            {n.type === 'cancel'
                                ? <StyledCancelTag>취소</StyledCancelTag>
                                : <><StyledNaverTag>네이버예약</StyledNaverTag><span className="suffix">확정</span></>
                            }
                        </StyledItemText>
                    )}
                    <StyledAssigneeMeta>
                        {/* 라벨 없이 색 배지와 이름만 — 예약 카드와 같은 규칙. */}
                        <AssigneeLabel color={getAssigneeColor(n.assigneeName, assignees)}
                                       name={n.assigneeName} />
                    </StyledAssigneeMeta>
                </StyledItem>
            ))}
        </>
    );
};

// ── Notification Modal (Full) ──

import {createPortal} from 'react-dom';

import {
    StyledHeader,
    StyledHeaderTitle,
    StyledHeaderTitleGroup,
    StyledBody,
    StyledFooter,
    StyledActionButton,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';
import {
    StyledSection,
    StyledSectionLabel,
    StyledUnreadDot,
    StyledFlag,
    StyledEmpty,
    StyledItem,
    StyledItemText,
    StyledConflictItemText,
    StyledNaverTag,
    StyledCancelTag,
    StyledConflictTag,
    StyledStatusTag,
    StyledAssigneeMeta,
    StyledModalOverlay,
    StyledModalDetail,
    StyledModalBodyInner,
    StyledModalItem,
} from './NaverSyncNotification.styles';

interface ModalProps {
    notifications: SyncNotification[];
    assignees: Assignee[];
    reservationMap: ReservationMap;
    markRead: (id: string) => void;
    markAllRead: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
    onClose: () => void;
}

export const NaverNotificationModal = ({notifications, assignees, reservationMap, markRead, markAllRead, onSelectReservation, onSelectConflict, onClose}: ModalProps) => {
    const labels = useStoreLabels();
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const [resolvedDetail, setResolvedDetail] = useState<SyncNotification | null>(null);

    const now = Date.now();
    // 중복예약: 미해결은 항상, 확인된 건 7일 이내
    const conflictNotifications = notifications.filter((n) =>
        n.type === 'conflict' && (
            n.conflictStatus !== 'confirmed' ||
            now - n.timestamp.getTime() <= SEVEN_DAYS_MS
        ),
    );
    // 안읽은 일반: 30일 이내
    const unreadNotifications = notifications.filter((n) =>
        !n.read && n.type !== 'conflict' && now - n.timestamp.getTime() <= THIRTY_DAYS_MS,
    );
    // 읽은 일반: 7일 이내
    const readNotifications = notifications.filter((n) =>
        n.read && n.type !== 'conflict' && now - n.timestamp.getTime() <= SEVEN_DAYS_MS,
    );
    const isEmpty = conflictNotifications.length === 0 && unreadNotifications.length === 0 && readNotifications.length === 0;

    const handleClick = (n: SyncNotification) => {
        markRead(n.id);
        if (n.type === 'conflict' && n.conflictKey) {
            // 이미 해결된(confirmed) 충돌은 읽기전용 내역으로, 미해결은 인터랙티브 해결 모달로.
            if (n.conflictStatus === 'confirmed') {
                setResolvedDetail(n);
                return;
            }
            onSelectConflict(n.conflictKey);
            onClose();
            return;
        }
        const dateReservations = Object.values(reservationMap).flat();
        const reservation = dateReservations.find((r) => r.id === n.reservationId);
        if (reservation) {
            onSelectReservation(reservation);
        }
    };

    const renderConflictItem = (n: SyncNotification) => (
        <StyledModalItem key={n.id}
                         $unread={n.conflictStatus !== 'confirmed'}
                         $isConflict
                         onClick={() => handleClick(n)}>
            <StyledConflictItemText>
                <span className="message">
                    <span className="date">{formatDate(n.appointmentDate)}</span>{' '}
                    <span className="time">{n.appointmentTime}</span>{' '}
                    <span className="name">{n.customerName || '고객'}</span>{' '}
                    <span className="suffix">고객님</span>{' '}
                    <span className="name">{n.assigneeName || '미지정'}</span>{' '}
                    <span className="suffix">{labels.assignee}로 중복 예약 발생했습니다.</span>{' '}
                    <StyledConflictTag>중복예약</StyledConflictTag>{' '}
                    <StyledStatusTag $status={n.conflictStatus}>{getConflictStatusLabel(n)}</StyledStatusTag>
                </span>
            </StyledConflictItemText>
            <StyledAssigneeMeta>
                <span>{labels.assignee}</span>
                <AssigneeLabel color={getAssigneeColor(n.assigneeName, assignees)} name={n.assigneeName} />
            </StyledAssigneeMeta>
        </StyledModalItem>
    );

    const renderRegularItem = (n: SyncNotification, flag: string) => (
        <StyledModalItem key={n.id}
                         $unread={!n.read}
                         onClick={() => handleClick(n)}>
            <StyledItemText>
                <span className="date">{formatDate(n.appointmentDate)}</span>
                <span className="time">{n.appointmentTime}</span>
                <span className="name">{n.customerName}</span>
                <span className="suffix">고객님</span>
                {n.type === 'cancel'
                    ? <StyledCancelTag>취소</StyledCancelTag>
                    : <><StyledNaverTag>네이버예약</StyledNaverTag><span className="suffix">확정</span></>
                }
            </StyledItemText>
            <StyledAssigneeMeta>
                <span>{labels.assignee}</span>
                <AssigneeLabel color={getAssigneeColor(n.assigneeName, assignees)} name={n.assigneeName} />
            </StyledAssigneeMeta>
            <StyledFlag>{flag}</StyledFlag>
        </StyledModalItem>
    );

    const modalRoot = typeof document !== 'undefined'
        ? document.getElementById('modal-root')
        : null;
    if (!modalRoot) return null;

    return (
        <>
            {createPortal(
                <StyledModalOverlay onClick={onClose} role="dialog" aria-modal="true">
                    <StyledModalDetail ref={dialogRef} onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <StyledHeaderTitleGroup>
                                <StyledHeaderTitle>전체 알림</StyledHeaderTitle>
                            </StyledHeaderTitleGroup>
                            {unreadNotifications.length > 0 && (
                                <button type="button" onClick={markAllRead}>모두 읽음</button>
                            )}
                        </StyledHeader>
                        <StyledBody>
                            <StyledModalBodyInner>
                                {isEmpty && (
                                    <StyledEmpty>알림이 없습니다</StyledEmpty>
                                )}

                                {conflictNotifications.length > 0 && (
                                    <StyledSection>
                                        <StyledSectionLabel>중복예약</StyledSectionLabel>
                                        {conflictNotifications.map(renderConflictItem)}
                                    </StyledSection>
                                )}

                                {unreadNotifications.length > 0 && (
                                    <StyledSection>
                                        <StyledSectionLabel>미확인 알람</StyledSectionLabel>
                                        {unreadNotifications.map((n) => renderRegularItem(n, '안읽음'))}
                                    </StyledSection>
                                )}

                                {readNotifications.length > 0 && (
                                    <StyledSection>
                                        <StyledSectionLabel>확인 알람</StyledSectionLabel>
                                        {readNotifications.map((n) => renderRegularItem(n, '읽음'))}
                                    </StyledSection>
                                )}
                            </StyledModalBodyInner>
                        </StyledBody>
                        <StyledFooter>
                            <StyledActionButton type="button" onClick={onClose}>닫기</StyledActionButton>
                        </StyledFooter>
                    </StyledModalDetail>
                </StyledModalOverlay>,
                modalRoot,
            )}
            {resolvedDetail && (
                <ConflictResolutionDetailModal notification={resolvedDetail}
                                               onClose={() => setResolvedDetail(null)} />
            )}
        </>
    );
};

// ── Styles ──

// Modal-specific styles
