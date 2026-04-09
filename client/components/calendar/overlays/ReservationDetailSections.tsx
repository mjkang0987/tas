import styled from 'styled-components';
import type {ReactNode} from 'react';

import type {Reservation, ReservationHistoryEntry} from '../../../utils/reservations';
import type {Designer} from '../../../utils/designers';

import {
    OVERLAY_Z_INDEX,
    StyledBody,
    StyledBodyInner,
    scrollContentStyle,
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
    scrollHintStyle,
} from './ModalStyles';
import {ServiceFields} from '../service/ServiceFields';
export {ReservationHistoryLayer} from './ReservationHistoryLayer';
export {ReservationViewSection} from './ReservationViewSection';
import type {ReservationDiffItem} from './reservationDetailTypes';

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
    <StyledBody><StyledBodyInner>
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
    </StyledBodyInner></StyledBody>
);

interface ReservationDiffSectionProps {
    message: string;
    color?: string;
    diffs: ReservationDiffItem[];
}

export const ReservationDiffSection = ({message, color, diffs}: ReservationDiffSectionProps) => (
    <StyledBody><StyledBodyInner>
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
    </StyledBodyInner></StyledBody>
);

interface ReservationStaticDiffSectionProps {
    message: string;
    color: string;
    items: Array<{label: string; value: string}>;
}

export const ReservationStaticDiffSection = ({message, color, items}: ReservationStaticDiffSectionProps) => (
    <StyledBody><StyledBodyInner>
        <StyledModalMessage $color={color}>{message}</StyledModalMessage>
        <StyledDiffList>
            {items.map((item) => (
                <StyledDiffGrid key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                </StyledDiffGrid>
            ))}
        </StyledDiffList>
    </StyledBodyInner></StyledBody>
);

interface ReservationFooterProps {
    actions: React.ReactNode;
}

export const ReservationFooter = ({actions}: ReservationFooterProps) => {
    if (!actions) return null;
    return <StyledFooter>{actions}</StyledFooter>;
};

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
