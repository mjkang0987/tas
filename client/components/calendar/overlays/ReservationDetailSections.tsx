import styled from 'styled-components';
import type {ReactNode} from 'react';

import type {Designer} from '../../../utils/designers';
import {getDesignerStatus, isDesignerBookable, sortDesigners} from '../../../utils/designers';
import type {ReservationChannel} from '../../../utils/reservations';
import type {CustomerMemoTag} from '../../../utils/customers';
import {ColorTag} from '../../ui/ColorTag';

import {
    StyledBody,
    StyledBodyInner,
    StyledDiffGrid,
    StyledError,
    StyledFieldRow,
    StyledFooter,
    StyledForm,
    StyledInlineError,
    StyledModalMessage,
    StyledPriceRow,
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
    designerId: number;
    price: number;
    memo: string;
    channel: ReservationChannel;
}

interface ReservationFormFieldsProps {
    idPrefix: string;
    form: ReservationDetailFormState;
    priceInputValue?: string;
    activeDesigners: Designer[];
    onLeaveDesigners: Designer[];
    resignedDesigners: Designer[];
    currentDesigner?: Designer | null;
    selectedServices: string[];
    totalDuration: number;
    totalPrice: number;
    onServiceToggle: (serviceName: string) => void;
    onPriceChange: (value: string) => void;
    onDesignerChange: (designerId: number) => void;
    onFieldChange: (field: keyof ReservationDetailFormState, value: string) => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    serviceErrorMessage?: string;
    children?: ReactNode;
}

export const ReservationFormFields = ({
    idPrefix,
    form,
    priceInputValue,
    activeDesigners,
    onLeaveDesigners,
    resignedDesigners,
    currentDesigner,
    selectedServices,
    totalDuration,
    totalPrice,
    onServiceToggle,
    onPriceChange,
    onDesignerChange,
    onFieldChange,
    onStartTimeChange,
    onEndTimeChange,
    serviceErrorMessage,
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
                <input
                    id={`${idPrefix}-price`}
                    type="text"
                    inputMode="numeric"
                    value={priceInputValue ?? (form.price === 0 ? '' : String(form.price))}
                    onChange={(e) => onPriceChange(e.target.value)}
                />
                <StyledPriceUnit>원</StyledPriceUnit>
            </StyledPriceRow>
        </label>
        {(activeDesigners.length > 0 || currentDesigner) && (
            <label htmlFor={`${idPrefix}-designer`}>
                <strong>디자이너</strong>
                <select
                    id={`${idPrefix}-designer`}
                    value={form.designerId}
                    onChange={(e) => onDesignerChange(Number(e.target.value))}
                >
                    <option value={0}>미지정</option>
                    {currentDesigner && !isDesignerBookable(currentDesigner) && (
                        <option value={currentDesigner.id}>
                            {currentDesigner.name} ({getDesignerStatus(currentDesigner)} · 신규 선택 불가)
                        </option>
                    )}
                    {sortDesigners(activeDesigners).map((designer) => (
                        <option key={designer.id} value={designer.id}>{designer.name}</option>
                    ))}
                </select>
                {(onLeaveDesigners.length > 0 || resignedDesigners.length > 0 || (currentDesigner && !isDesignerBookable(currentDesigner))) && (
                    <StyledDesignerPolicyNotice>
                        예약 화면에서는 재직 디자이너만 새로 선택할 수 있습니다.
                        {currentDesigner && !isDesignerBookable(currentDesigner)
                            ? ` 현재 담당자는 ${getDesignerStatus(currentDesigner)} 상태라 유지 가능하지만, 변경 후에는 다시 선택할 수 없습니다.`
                            : ''}
                    </StyledDesignerPolicyNotice>
                )}
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
    error: string;
    customerMemoTags: CustomerMemoTag[];
    activeDesigners: Designer[];
    onLeaveDesigners: Designer[];
    resignedDesigners: Designer[];
    currentDesigner?: Designer | null;
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
    priceInputValue,
    error,
    customerMemoTags,
    activeDesigners,
    onLeaveDesigners,
    resignedDesigners,
    currentDesigner,
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
        {customerMemoTags.length > 0 && (
            <StyledMemoSection>
                <strong>고객 메모</strong>
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
            activeDesigners={activeDesigners}
            onLeaveDesigners={onLeaveDesigners}
            resignedDesigners={resignedDesigners}
            currentDesigner={currentDesigner}
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

const StyledMemoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.9);

    > strong {
        font-size: 12px;
        color: var(--dark-gray-color);
    }
`;

const StyledMemoTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StyledDesignerPolicyNotice = styled.p`
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
