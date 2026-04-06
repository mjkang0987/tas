import styled from 'styled-components';
import type {ReactNode} from 'react';

import type {CustomerMap} from '../../../utils/customers';
import type {Reservation, ReservationHistoryEntry} from '../../../utils/reservations';
import type {Designer} from '../../../utils/designers';
import {formatPrice} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledBody,
    StyledDetail,
    StyledDiffGrid,
    StyledError,
    StyledFieldRow,
    StyledFooter,
    StyledForm,
    StyledHeader,
    StyledModalMessage,
    StyledOverlay,
    StyledPriceRow,
    StyledPriceUnit,
    StyledStatusBadge,
} from './ModalStyles';
import {ServiceFields} from '../service/ServiceFields';

export interface ReservationDetailFormState {
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    designerId: number;
    price: number;
    memo: string;
}

interface ReservationFormFieldsProps {
    idPrefix: string;
    form: ReservationDetailFormState;
    selectableDesigners: Designer[];
    activeDesigners: Designer[];
    onLeaveDesigners: Designer[];
    resignedDesigners: Designer[];
    selectedServices: string[];
    totalDuration: number;
    totalPrice: number;
    onServiceToggle: (serviceName: string) => void;
    onPriceChange: (value: string) => void;
    onDesignerChange: (designerId: number) => void;
    onFieldChange: (field: keyof ReservationDetailFormState, value: string) => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    children?: ReactNode;
}

export const ReservationFormFields = ({
    idPrefix,
    form,
    selectableDesigners,
    activeDesigners,
    onLeaveDesigners,
    resignedDesigners,
    selectedServices,
    totalDuration,
    totalPrice,
    onServiceToggle,
    onPriceChange,
    onDesignerChange,
    onFieldChange,
    onStartTimeChange,
    onEndTimeChange,
    children,
}: ReservationFormFieldsProps) => (
    <StyledForm>
        <StyledFieldRow role="group" aria-labelledby={`${idPrefix}-service-label`}>
            <strong id={`${idPrefix}-service-label`}>시술</strong>
            <ServiceFields
                idPrefix={idPrefix}
                selectedServices={selectedServices}
                onServiceToggle={onServiceToggle}
                totalDuration={totalDuration}
                totalPrice={totalPrice}
            />
        </StyledFieldRow>
        <label htmlFor={`${idPrefix}-price`}>
            <strong>가격</strong>
            <StyledPriceRow>
                <input
                    id={`${idPrefix}-price`}
                    type="text"
                    inputMode="numeric"
                    value={form.price.toLocaleString('ko-KR')}
                    onChange={(e) => onPriceChange(e.target.value)}
                />
                <StyledPriceUnit>원</StyledPriceUnit>
            </StyledPriceRow>
        </label>
        {selectableDesigners.length > 0 && (
            <label htmlFor={`${idPrefix}-designer`}>
                <strong>디자이너</strong>
                <select
                    id={`${idPrefix}-designer`}
                    value={form.designerId}
                    onChange={(e) => onDesignerChange(Number(e.target.value))}
                >
                    {activeDesigners.map((designer) => (
                        <option key={designer.id} value={designer.id}>{designer.name}</option>
                    ))}
                    {onLeaveDesigners.length > 0 && (
                        <optgroup label="휴직자">
                            {onLeaveDesigners.map((designer) => (
                                <option key={designer.id} value={designer.id}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                    {resignedDesigners.length > 0 && (
                        <optgroup label="퇴직자">
                            {resignedDesigners.map((designer) => (
                                <option key={designer.id} value={designer.id}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </label>
        )}
        <label htmlFor={`${idPrefix}-date`}>
            <strong>날짜</strong>
            <input
                id={`${idPrefix}-date`}
                type="date"
                value={form.date}
                onChange={(e) => onFieldChange('date', e.target.value)}
            />
        </label>
        <StyledTimeRow>
            <label htmlFor={`${idPrefix}-startTime`}>
                <strong>시작</strong>
                <input
                    id={`${idPrefix}-startTime`}
                    type="time"
                    value={form.startTime}
                    onChange={(e) => onStartTimeChange(e.target.value)}
                />
            </label>
            <label htmlFor={`${idPrefix}-endTime`}>
                <strong>종료</strong>
                <input
                    id={`${idPrefix}-endTime`}
                    type="time"
                    value={form.endTime}
                    onChange={(e) => onEndTimeChange(e.target.value)}
                />
            </label>
        </StyledTimeRow>
        <label htmlFor={`${idPrefix}-memo`}>
            <strong>메모</strong>
            <input
                id={`${idPrefix}-memo`}
                type="text"
                value={form.memo}
                onChange={(e) => onFieldChange('memo', e.target.value)}
                placeholder="특이사항, 요청사항 등"
            />
        </label>
        {children}
    </StyledForm>
);

interface ReservationViewSectionProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    displayPrice: number;
    displayDesignerName: string;
    displayDesignerColor: string;
    paymentCompleted: boolean;
    paymentLines: string[];
    historyCount: number;
    onCustomerClick: (customerId: number) => void;
    onOpenHistory: () => void;
}

export const ReservationViewSection = ({
    reservation,
    customerMap,
    displayPrice,
    displayDesignerName,
    displayDesignerColor,
    paymentCompleted,
    paymentLines,
    historyCount,
    onCustomerClick,
    onOpenHistory,
}: ReservationViewSectionProps) => {
    const customer = customerMap[reservation.customerId];
    const isCancelled = reservation.status === 'cancelled';
    const isNoshow = reservation.status === 'noshow';

    return (
        <StyledDetailBody>
            <dl>
                {isCancelled && (<>
                    <dt>상태</dt>
                    <dd><StyledStatusBadge $variant="danger">취소됨</StyledStatusBadge></dd>
                </>)}
                {isNoshow && (<>
                    <dt>상태</dt>
                    <dd><StyledStatusBadge $variant="warning">노쇼</StyledStatusBadge></dd>
                </>)}
                <dt>날짜</dt>
                <dd>{reservation.date}</dd>
                <dt>시간</dt>
                <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                <dt>가격</dt>
                <dd>{formatPrice(displayPrice)}</dd>
                <dt>결제</dt>
                <dd>
                    <StyledPaymentValue>
                        <StyledPaymentBadge $completed={paymentCompleted}>
                            {paymentCompleted ? '결제완료' : '미결제'}
                        </StyledPaymentBadge>
                        <StyledPaymentLineList>
                            {paymentLines.map((line) => <span key={line}>{line}</span>)}
                        </StyledPaymentLineList>
                    </StyledPaymentValue>
                </dd>
                <dt>고객명</dt>
                <dd>
                    <StyledCustomerButton type="button" onClick={() => onCustomerClick(reservation.customerId)}>
                        {customer?.name ?? '-'}
                    </StyledCustomerButton>
                </dd>
                <dt>연락처</dt>
                <dd>{customer?.tel ?? '-'}</dd>
                <dt>디자이너</dt>
                <dd>
                    <StyledDesignerValue>
                        <StyledDesignerDot $color={displayDesignerColor} />
                        <span>{displayDesignerName}</span>
                    </StyledDesignerValue>
                </dd>
            </dl>
            {historyCount > 0 && (
                <StyledHistorySection>
                    <StyledHistoryButton type="button" onClick={onOpenHistory}>
                        변경 이력 ({historyCount})
                    </StyledHistoryButton>
                </StyledHistorySection>
            )}
        </StyledDetailBody>
    );
};

interface ReservationEditSectionProps {
    form: ReservationDetailFormState;
    error: string;
    selectableDesigners: Designer[];
    activeDesigners: Designer[];
    onLeaveDesigners: Designer[];
    resignedDesigners: Designer[];
    selectedServices: string[];
    totalDuration: number;
    totalPrice: number;
    onServiceToggle: (serviceName: string) => void;
    onPriceChange: (value: string) => void;
    onDesignerChange: (designerId: number) => void;
    onFieldChange: (field: keyof ReservationDetailFormState, value: string) => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
}

export const ReservationEditSection = ({
    form,
    error,
    selectableDesigners,
    activeDesigners,
    onLeaveDesigners,
    resignedDesigners,
    selectedServices,
    totalDuration,
    totalPrice,
    onServiceToggle,
    onPriceChange,
    onDesignerChange,
    onFieldChange,
    onStartTimeChange,
    onEndTimeChange,
}: ReservationEditSectionProps) => (
    <StyledBody>
        <ReservationFormFields
            idPrefix="edit"
            form={form}
            selectableDesigners={selectableDesigners}
            activeDesigners={activeDesigners}
            onLeaveDesigners={onLeaveDesigners}
            resignedDesigners={resignedDesigners}
            selectedServices={selectedServices}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onServiceToggle={onServiceToggle}
            onPriceChange={onPriceChange}
            onDesignerChange={onDesignerChange}
            onFieldChange={onFieldChange}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
        />
        {error && <StyledError>{error}</StyledError>}
    </StyledBody>
);

interface ReservationDiffSectionProps {
    message: string;
    color?: string;
    diffs: {label: string; before: string; after: string}[];
}

export const ReservationDiffSection = ({message, color, diffs}: ReservationDiffSectionProps) => (
    <StyledBody>
        <StyledModalMessage $color={color}>{message}</StyledModalMessage>
        {diffs.length > 0 && (
            <StyledDiffList>
                {diffs.map((diff) => (
                    <StyledDiffGrid key={diff.label}>
                        <dt>{diff.label}</dt>
                        <dd>
                            <del>{diff.before}</del>
                            <ins>{diff.after}</ins>
                        </dd>
                    </StyledDiffGrid>
                ))}
            </StyledDiffList>
        )}
    </StyledBody>
);

interface ReservationStaticDiffSectionProps {
    message: string;
    color: string;
    items: Array<{label: string; value: string}>;
}

export const ReservationStaticDiffSection = ({message, color, items}: ReservationStaticDiffSectionProps) => (
    <StyledBody>
        <StyledModalMessage $color={color}>{message}</StyledModalMessage>
        <StyledDiffList>
            {items.map((item) => (
                <StyledDiffGrid key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                </StyledDiffGrid>
            ))}
        </StyledDiffList>
    </StyledBody>
);

interface ReservationHistoryLayerProps {
    history: ReservationHistoryEntry[];
    designerNameMap: Record<number, string>;
    getHistoryDiffs: (entry: ReservationHistoryEntry, designerNameMap: Record<number, string>) => {label: string; before: string; after: string}[];
    formatTimestamp: (iso: string) => string;
    isOpen: boolean;
    onClose: () => void;
}

export const ReservationHistoryLayer = ({
    history,
    designerNameMap,
    getHistoryDiffs,
    formatTimestamp,
    isOpen,
    onClose,
}: ReservationHistoryLayerProps) => {
    if (!isOpen) return null;

    return (
        <StyledHistoryOverlay onClick={onClose} role="dialog" aria-modal="true" aria-label="예약 변경 이력">
            <StyledHistoryPanel onClick={(e) => e.stopPropagation()} $width={400}>
                <StyledHeader>
                    <h3>변경 이력</h3>
                    <button type="button" onClick={onClose} aria-label="닫기">&#x2715;</button>
                </StyledHeader>
                <StyledBody>
                    <StyledHistoryDetailList>
                        {[...history].reverse().map((entry, index) => {
                            const diffs = getHistoryDiffs(entry, designerNameMap);
                            const isCancelEntry = entry.after.status === 'cancelled' && entry.before.status !== 'cancelled';
                            const isNoshowEntry = entry.after.status === 'noshow' && entry.before.status !== 'noshow';
                            const entryType = isCancelEntry ? 'cancelled' : isNoshowEntry ? 'noshow' : 'edit';

                            return (
                                <StyledHistoryDetailItem key={index} $type={entryType}>
                                    <StyledHistoryDetailHeader>
                                        <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                                        <StyledHistoryTypeBadge $type={entryType}>
                                            {isCancelEntry ? '예약취소' : isNoshowEntry ? '노쇼' : '변경'}
                                        </StyledHistoryTypeBadge>
                                    </StyledHistoryDetailHeader>
                                    <StyledHistoryDetailDiffs>
                                        {diffs.map((diff) => (
                                            <StyledHistoryDiffGrid key={diff.label}>
                                                <dt>{diff.label}</dt>
                                                <dd>
                                                    <del>{diff.before}</del>
                                                    <ins>{diff.after}</ins>
                                                </dd>
                                            </StyledHistoryDiffGrid>
                                        ))}
                                    </StyledHistoryDetailDiffs>
                                </StyledHistoryDetailItem>
                            );
                        })}
                    </StyledHistoryDetailList>
                </StyledBody>
            </StyledHistoryPanel>
        </StyledHistoryOverlay>
    );
};

interface ReservationFooterProps {
    actions: React.ReactNode;
}

export const ReservationFooter = ({actions}: ReservationFooterProps) => {
    if (!actions) return null;
    return <StyledFooter>{actions}</StyledFooter>;
};

const StyledDetailBody = styled(StyledBody)`
    > dl {
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 8px 12px;
        margin: 0;
    }

    dt {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 500;
    }

    dd {
        margin: 0;
        font-size: 13px;
    }
`;

const StyledCustomerButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;
    color: #4285F4;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
        color: #1a73e8;
    }
`;

const StyledDiffList = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    padding: 12px;
    background-color: var(--black-color-10);
    border-radius: var(--radius-md);
`;

const StyledTimeRow = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

const StyledDesignerValue = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledDesignerDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    flex-shrink: 0;
`;

const StyledPaymentValue = styled.span`
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledPaymentLineList = styled.span`
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledPaymentBadge = styled.span<{ $completed: boolean }>`
    display: inline-block;
    padding: 2px var(--gap-md);
    border-radius: var(--radius-sm);
    border: 1px solid ${(props) => props.$completed ? '#CDEAD6' : 'var(--light-gray-color)'};
    background-color: ${(props) => props.$completed ? '#E6F4EA' : 'var(--black-color-10)'};
    color: ${(props) => props.$completed ? '#137333' : 'var(--dark-gray-color2)'};
    font-size: var(--small-font);
    font-weight: 600;
`;

const StyledHistorySection = styled.div`
    margin-top: 16px;
    border-top: 1px solid var(--light-gray-color);
    padding-top: 12px;
`;

const StyledHistoryButton = styled.button`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 6px;
    background: var(--white-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: pointer;
    text-align: left;

    &::after {
        content: "\\203A";
        float: right;
        font-size: 16px;
        line-height: 1;
        color: var(--gray-color);
    }

    &:hover {
        background-color: var(--black-color-10);
    }
`;

const StyledHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.childDetail};
    background-color: rgba(0, 0, 0, 0.24);
`;

const StyledHistoryPanel = styled(StyledDetail)``;

const StyledHistoryDetailList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 320px;
    overflow-y: auto;
    overscroll-behavior: auto;
`;

const HISTORY_ITEM_STYLES: Record<string, { bg: string; border: string }> = {
    cancelled: {bg: 'var(--danger-bg)', border: 'var(--danger-border)'},
    noshow: {bg: 'var(--warning-bg)', border: 'var(--warning-border)'},
};

const StyledHistoryDetailItem = styled.div<{ $type: string }>`
    padding: var(--gap-lg);
    background-color: ${(props) => HISTORY_ITEM_STYLES[props.$type]?.bg || 'var(--black-color-10)'};
    border: 1px solid ${(props) => HISTORY_ITEM_STYLES[props.$type]?.border || 'transparent'};
    border-radius: var(--radius-md);
`;

const StyledHistoryDetailHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    > time {
        font-size: var(--xsmall-font);
        color: var(--dark-gray-color);
    }
`;

const HISTORY_BADGE_COLORS: Record<string, string> = {
    cancelled: 'var(--danger-color)',
    noshow: 'var(--warning-color)',
};

const StyledHistoryTypeBadge = styled.span<{ $type: string }>`
    display: inline-block;
    padding: 2px var(--gap-sm);
    border-radius: var(--radius-sm);
    font-size: var(--tiny-font);
    font-weight: 600;
    background-color: ${(props) => HISTORY_BADGE_COLORS[props.$type] || 'var(--blue-color)'};
    color: #fff;
`;

const StyledHistoryDetailDiffs = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--gap-xs);
`;

const StyledHistoryDiffGrid = styled(StyledDiffGrid)`
    display: flex;
    flex-wrap: wrap;

    dt {
        flex: 0 0 40px;
        font-size: var(--xsmall-font);
    }

    del, ins {
        font-size: var(--xsmall-font);
    }

    dd {
        gap: var(--gap-sm);
    }
`;
