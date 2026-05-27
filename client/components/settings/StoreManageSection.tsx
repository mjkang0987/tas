import {useEffect, useState} from 'react';

import styled from 'styled-components';

import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty} from './settings-styles';

import {useCalendarStore} from '../../store/calendarStore';
import {formControlStyle} from '../ui/FormControls';

interface StoreManageSectionProps {
    formatDateLabel: (dateKey: string) => string;
}

export const StoreManageSection = ({formatDateLabel}: StoreManageSectionProps) => {
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateStoreBusinessHours = useCalendarStore((s) => s.updateStoreBusinessHours);
    const updateStoreClosedDates = useCalendarStore((s) => s.updateStoreClosedDates);
    const [businessHours, setBusinessHours] = useState(storeSettings.businessHours);
    const [closedDates, setClosedDates] = useState(storeSettings.closedDates);
    const [closedDateInput, setClosedDateInput] = useState('');
    const [closedDateError, setClosedDateError] = useState('');
    const [isEditingBusinessHours, setIsEditingBusinessHours] = useState(false);
    const [isEditingClosedDates, setIsEditingClosedDates] = useState(false);

    useEffect(() => {
        setBusinessHours(storeSettings.businessHours);
        setClosedDates(storeSettings.closedDates);
    }, [storeSettings]);

    const isBusinessHoursDirty = businessHours.start !== storeSettings.businessHours.start
        || businessHours.end !== storeSettings.businessHours.end;
    const isClosedDatesDirty = closedDates.join('|') !== storeSettings.closedDates.join('|');

    const handleSaveBusinessHours = () => {
        updateStoreBusinessHours(businessHours);
        setIsEditingBusinessHours(false);
    };

    const handleAddClosedDate = () => {
        if (!closedDateInput) {
            setClosedDateError('휴업일을 선택해 주세요.');
            return;
        }

        if (closedDates.includes(closedDateInput)) {
            setClosedDateError('이미 등록된 휴업일입니다.');
            return;
        }

        setClosedDates((prev) => [...prev, closedDateInput].sort());
        setClosedDateInput('');
        setClosedDateError('');
    };

    const handleSaveClosedDates = () => {
        updateStoreClosedDates(closedDates);
        setIsEditingClosedDates(false);
    };

    return (
        <StyledStoreSection>
            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>영업시간</StyledStoreCardTitle>
                    {!isEditingBusinessHours && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingBusinessHours(true)}>수정</StyledEditBtn>
                    )}
                </StyledStoreCardHeader>
                <StyledStoreFieldGrid>
                    <StyledRangeInputWrap>
                        <span>오픈</span>
                        <StyledDateInput
                            type="time"
                            value={businessHours.start}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, start: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                    <StyledRangeInputWrap>
                        <span>마감</span>
                        <StyledDateInput
                            type="time"
                            value={businessHours.end}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, end: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                </StyledStoreFieldGrid>
                {isEditingBusinessHours && (
                    <StyledStoreActionRow>
                        <StyledCancelBtn
                            type="button"
                            onClick={() => {
                                setBusinessHours(storeSettings.businessHours);
                                setIsEditingBusinessHours(false);
                            }}
                        >
                            취소
                        </StyledCancelBtn>
                        <StyledSaveBtn type="button" onClick={handleSaveBusinessHours} disabled={!isBusinessHoursDirty}>저장</StyledSaveBtn>
                    </StyledStoreActionRow>
                )}
            </StyledStoreCard>

            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>휴업일</StyledStoreCardTitle>
                    {!isEditingClosedDates && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingClosedDates(true)}>수정</StyledEditBtn>
                    )}
                </StyledStoreCardHeader>
                {isEditingClosedDates && (
                    <>
                        <StyledClosedDateAddRow>
                            <StyledDateInput
                                type="date"
                                value={closedDateInput}
                                onChange={(e) => {
                                    setClosedDateInput(e.target.value);
                                    setClosedDateError('');
                                }}
                            />
                            <StyledSaveBtn type="button" onClick={handleAddClosedDate}>추가</StyledSaveBtn>
                        </StyledClosedDateAddRow>
                        {closedDateError && <StyledAddNotice>{closedDateError}</StyledAddNotice>}
                    </>
                )}
                {closedDates.length === 0 ? (
                    <StyledEmpty>등록된 휴업일 없음</StyledEmpty>
                ) : (
                    <StyledClosedDateList>
                        {closedDates.map((date) => (
                            <StyledClosedDateItem key={date}>
                                <span>{formatDateLabel(date)}</span>
                                {isEditingClosedDates && (
                                    <StyledDeleteBtn
                                        type="button"
                                        onClick={() => setClosedDates((prev) => prev.filter((item) => item !== date))}
                                    >
                                        삭제
                                    </StyledDeleteBtn>
                                )}
                            </StyledClosedDateItem>
                        ))}
                    </StyledClosedDateList>
                )}
                {isEditingClosedDates && (
                    <StyledStoreActionRow>
                        <StyledCancelBtn
                            type="button"
                            onClick={() => {
                                setClosedDates(storeSettings.closedDates);
                                setClosedDateInput('');
                                setClosedDateError('');
                                setIsEditingClosedDates(false);
                            }}
                        >
                            취소
                        </StyledCancelBtn>
                        <StyledSaveBtn type="button" onClick={handleSaveClosedDates} disabled={!isClosedDatesDirty}>저장</StyledSaveBtn>
                    </StyledStoreActionRow>
                )}
            </StyledStoreCard>
        </StyledStoreSection>
    );
};


const StyledStoreSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
`;

const StyledStoreCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
`;

const StyledStoreCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledStoreCardTitle = styled.strong`
    font-size: 14px;
    color: var(--dark-gray-color);
`;

const StyledStoreFieldGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledStoreActionRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const StyledClosedDateAddRow = styled.div`
    display: flex;
    gap: 8px;

    @media (max-width: 640px) {
        flex-direction: column;
    }
`;

const StyledClosedDateList = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--black-color-10);
`;

const StyledClosedDateItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--black-color-10);
    font-size: 13px;
    color: var(--dark-gray-color);
`;

const StyledRangeInputWrap = styled.label`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDateInput = styled.input`
    width: 100%;
    appearance: none;
    ${formControlStyle};
    padding: 0 8px;
`;

const StyledAddNotice = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--red-color);
`;

