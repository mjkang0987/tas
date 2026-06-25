import styled from 'styled-components';
import type {ReactNode} from 'react';

import type {Assignee} from '../../../utils/assignees';
import {getAssigneeStatus, isAssigneeBookable, sortAssignees} from '../../../utils/assignees';
import type {ReservationChannel} from '../../../utils/reservations';
import type {CustomerMemoTag} from '../../../utils/customers';
import {ColorTag} from '../../ui/ColorTag';

import {
    StyledBody,
    StyledBodyInner,
    StyledDiffGrid,
    StyledDiffGridTerm,
    StyledDiffGridDesc,
    StyledDiffGridDel,
    StyledDiffGridIns,
    StyledError,
    StyledFieldRow,
    StyledFooter,
    StyledForm,
    StyledInlineError,
    StyledModalMessage,
    StyledPriceRow,
    StyledPriceRowInput,
    StyledPriceUnit,
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
    assigneeId: number;
    price: number;
    memo: string;
    channel: ReservationChannel;
}

export type ReservationErrorField = 'customer' | 'service' | 'assignee' | 'date' | 'time' | 'general';

export interface ReservationFieldError {
    field: ReservationErrorField;
    message: string;
}

interface ReservationFormFieldsProps {
    idPrefix: string;
    form: ReservationDetailFormState;
    priceInputValue?: string;
    activeAssignees: Assignee[];
    onLeaveAssignees: Assignee[];
    resignedAssignees: Assignee[];
    currentAssignee?: Assignee | null;
    selectedServices: string[];
    totalDuration: number;
    totalPrice: number;
    onServiceToggle: (serviceName: string) => void;
    onPriceChange: (value: string) => void;
    onAssigneeChange: (assigneeId: number) => void;
    onFieldChange: (field: keyof ReservationDetailFormState, value: string) => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    serviceErrorMessage?: string;
    assigneeErrorMessage?: string;
    dateErrorMessage?: string;
    timeErrorMessage?: string;
    children?: ReactNode;
}

export const ReservationFormFields = ({
    idPrefix,
    form,
    priceInputValue,
    activeAssignees,
    onLeaveAssignees,
    resignedAssignees,
    currentAssignee,
    selectedServices,
    totalDuration,
    totalPrice,
    onServiceToggle,
    onPriceChange,
    onAssigneeChange,
    onFieldChange,
    onStartTimeChange,
    onEndTimeChange,
    serviceErrorMessage,
    assigneeErrorMessage,
    dateErrorMessage,
    timeErrorMessage,
    children,
}: ReservationFormFieldsProps) => (
    <StyledForm>
        <StyledFieldRow role="group" aria-labelledby={`${idPrefix}-service-label`}>
            <strong id={`${idPrefix}-service-label`}>서비스</strong>
            <ServiceFields
                idPrefix={idPrefix}
                selectedServices={selectedServices}
                onServiceToggle={onServiceToggle}
                totalDuration={totalDuration}
                totalPrice={totalPrice}
            />
            {serviceErrorMessage && <StyledInlineError>{serviceErrorMessage}</StyledInlineError>}
        </StyledFieldRow>
        <label htmlFor={`${idPrefix}-price`}>
            <strong>가격</strong>
            <StyledPriceRow>
                <StyledPriceRowInput
                    id={`${idPrefix}-price`}
                    type="text"
                    inputMode="numeric"
                    value={priceInputValue ?? (form.price === 0 ? '' : String(form.price))}
                    onChange={(e) => onPriceChange(e.target.value)}
                />
                <StyledPriceUnit>원</StyledPriceUnit>
            </StyledPriceRow>
        </label>
        {(activeAssignees.length > 0 || currentAssignee) && (
            <label htmlFor={`${idPrefix}-assignee`}>
                <strong>담당자</strong>
                <select
                    id={`${idPrefix}-assignee`}
                    value={form.assigneeId}
                    onChange={(e) => onAssigneeChange(Number(e.target.value))}
                >
                    <option value={0}>미지정</option>
                    {currentAssignee && !isAssigneeBookable(currentAssignee) && (
                        <option value={currentAssignee.id}>
                            {currentAssignee.name} ({getAssigneeStatus(currentAssignee)} · 신규 선택 불가)
                        </option>
                    )}
                    {sortAssignees(activeAssignees).map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                    ))}
                </select>
                {(onLeaveAssignees.length > 0 || resignedAssignees.length > 0 || (currentAssignee && !isAssigneeBookable(currentAssignee))) && (
                    <StyledAssigneePolicyNotice>
                        예약 화면에서는 재직 담당자만 새로 선택할 수 있습니다.
                        {currentAssignee && !isAssigneeBookable(currentAssignee)
                            ? ` 현재 담당자는 ${getAssigneeStatus(currentAssignee)} 상태라 유지 가능하지만, 변경 후에는 다시 선택할 수 없습니다.`
                            : ''}
                    </StyledAssigneePolicyNotice>
                )}
                {assigneeErrorMessage && <StyledInlineError>{assigneeErrorMessage}</StyledInlineError>}
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
            {dateErrorMessage && <StyledInlineError>{dateErrorMessage}</StyledInlineError>}
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
        {timeErrorMessage && <StyledInlineError>{timeErrorMessage}</StyledInlineError>}
        <label htmlFor={`${idPrefix}-channel`}>
            <strong>예약경로</strong>
            <select
                id={`${idPrefix}-channel`}
                value={form.channel}
                onChange={(e) => onFieldChange('channel', e.target.value)}
            >
                <option value="전화예약">전화예약</option>
                <option value="현장방문">현장방문</option>
                <option value="네이버예약">네이버예약</option>
            </select>
        </label>
        <label htmlFor={`${idPrefix}-memo`}>
            <strong>요청사항</strong>
            <input
                id={`${idPrefix}-memo`}
                type="text"
                value={form.memo}
                onChange={(e) => onFieldChange('memo', e.target.value)}
                placeholder="예약 관련 요청사항"
            />
        </label>
        {children}
    </StyledForm>
);

interface ReservationEditSectionProps {
    form: ReservationDetailFormState;
    priceInputValue?: string;
    error: ReservationFieldError | null;
    customerMemoTags: CustomerMemoTag[];
    activeAssignees: Assignee[];
    onLeaveAssignees: Assignee[];
    resignedAssignees: Assignee[];
    currentAssignee?: Assignee | null;
    selectedServices: string[];
    totalDuration: number;
    totalPrice: number;
    onServiceToggle: (serviceName: string) => void;
    onPriceChange: (value: string) => void;
    onAssigneeChange: (assigneeId: number) => void;
    onFieldChange: (field: keyof ReservationDetailFormState, value: string) => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
}

export const ReservationEditSection = ({
    form,
    priceInputValue,
    error,
    customerMemoTags,
    activeAssignees,
    onLeaveAssignees,
    resignedAssignees,
    currentAssignee,
    selectedServices,
    totalDuration,
    totalPrice,
    onServiceToggle,
    onPriceChange,
    onAssigneeChange,
    onFieldChange,
    onStartTimeChange,
    onEndTimeChange,
}: ReservationEditSectionProps) => (
    <StyledBody><StyledBodyInner>
        {customerMemoTags.length > 0 && (
            <StyledMemoSection>
                <StyledMemoLabel>고객 메모</StyledMemoLabel>
                <StyledMemoTagList>
                    {customerMemoTags.map((tag) => (
                        <ColorTag key={`${tag.color}-${tag.text}`} $color={tag.color}>
                            {tag.text}
                        </ColorTag>
                    ))}
                </StyledMemoTagList>
            </StyledMemoSection>
        )}
        <ReservationFormFields
            idPrefix="edit"
            form={form}
            priceInputValue={priceInputValue}
            activeAssignees={activeAssignees}
            onLeaveAssignees={onLeaveAssignees}
            resignedAssignees={resignedAssignees}
            currentAssignee={currentAssignee}
            selectedServices={selectedServices}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onServiceToggle={onServiceToggle}
            onPriceChange={onPriceChange}
            onAssigneeChange={onAssigneeChange}
            onFieldChange={onFieldChange}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
            serviceErrorMessage={error?.field === 'service' ? error.message : ''}
            assigneeErrorMessage={error?.field === 'assignee' ? error.message : ''}
            dateErrorMessage={error?.field === 'date' ? error.message : ''}
            timeErrorMessage={error?.field === 'time' ? error.message : ''}
        />
        {error && error.field === 'general' && <StyledError>{error.message}</StyledError>}
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
                        <StyledDiffGridTerm>{diff.label}</StyledDiffGridTerm>
                        <StyledDiffGridDesc>
                            <StyledDiffGridDel>{diff.before}</StyledDiffGridDel>
                            <StyledDiffGridIns>{diff.after}</StyledDiffGridIns>
                        </StyledDiffGridDesc>
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
                    <StyledDiffGridTerm>{item.label}</StyledDiffGridTerm>
                    <StyledDiffGridDesc>{item.value}</StyledDiffGridDesc>
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

const StyledMemoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.9);
`;

const StyledMemoLabel = styled.strong`
    font-size: 12px;
    color: var(--dark-gray-color);
`;

const StyledMemoTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StyledAssigneePolicyNotice = styled.p`
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--caution-color);
`;

const StyledTimeRow = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
`;
