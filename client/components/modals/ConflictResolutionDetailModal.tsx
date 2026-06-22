import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import {ConfirmDialog} from '../ui/ConfirmDialog';
import {ReservationStaticDiffSection} from '../calendar/overlays/ReservationDetailSections';

interface Props {
    notification: SyncNotification;
    onClose: () => void;
}

function formatDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

function formatResolvedAt(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const ConflictResolutionDetailModal = ({notification, onClose}: Props) => {
    const isAuto = notification.resolvedBy === 'auto';

    const items: Array<{label: string; value: string}> = [
        {label: '일시', value: `${formatDate(notification.appointmentDate)} ${notification.appointmentTime}`},
        {label: '고객', value: notification.customerName || '고객'},
        {label: '디자이너', value: notification.designerName || '미지정'},
        {label: '처리시각', value: formatResolvedAt(notification.resolvedAt)},
    ];
    if (!isAuto) {
        items.push({label: '사유', value: notification.resolutionReason || '-'});
        if (notification.resolutionMemo) {
            items.push({label: '메모', value: notification.resolutionMemo});
        }
    }

    return (
        <ConfirmDialog title="중복예약 해결 내역"
                       hideCancel
                       confirmLabel="닫기"
                       confirmVariant="primary"
                       ariaLabel="중복예약 해결 내역"
                       layerKey="conflict-resolution-detail"
                       onConfirm={onClose}
                       onClose={onClose}>
            <ReservationStaticDiffSection
                message={isAuto ? '예약 취소·삭제로 자동 해소됨' : '처리완료'}
                color={isAuto ? 'var(--cancelled-color)' : 'var(--success-color)'}
                items={items}
            />
        </ConfirmDialog>
    );
};
