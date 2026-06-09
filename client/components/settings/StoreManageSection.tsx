import {useEffect, useState} from 'react';

import styled from 'styled-components';

import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty} from './settings-styles';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';

interface StoreManageSectionProps {
    formatDateLabel: (dateKey: string) => string;
}

const SHOP_TYPE_LABELS: Record<string, string> = {
    hair: '헤어샵',
    nail: '네일샵',
    waxing: '왁싱샵',
    lash: '속눈썹샵',
    skin: '피부관리실',
};

export const StoreManageSection = ({formatDateLabel}: StoreManageSectionProps) => {
    const storeName = useCalendarStore((s) => s.storeName);
    const shopType = useCalendarStore((s) => s.shopType);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateStoreInfo = useCalendarStore((s) => s.updateStoreInfo);
    const updateStoreBusinessHours = useCalendarStore((s) => s.updateStoreBusinessHours);
    const updateStoreClosedDates = useCalendarStore((s) => s.updateStoreClosedDates);
    const [businessHours, setBusinessHours] = useState(storeSettings.businessHours);
    const [closedDates, setClosedDates] = useState(storeSettings.closedDates);
    const [closedDateInput, setClosedDateInput] = useState('');
    const [closedDateError, setClosedDateError] = useState('');
    const [isEditingBusinessHours, setIsEditingBusinessHours] = useState(false);
    const [isEditingClosedDates, setIsEditingClosedDates] = useState(false);
    const [isEditingStoreInfo, setIsEditingStoreInfo] = useState(false);
    const [editStoreName, setEditStoreName] = useState(storeName);
    const [editShopType, setEditShopType] = useState<string | null>(shopType);
    const [storeInfoError, setStoreInfoError] = useState('');

    useEffect(() => {
        setBusinessHours(storeSettings.businessHours);
        setClosedDates(storeSettings.closedDates);
    }, [storeSettings]);

    useEffect(() => {
        setEditStoreName(storeName);
        setEditShopType(shopType);
    }, [storeName, shopType]);

    const handleSaveStoreInfo = () => {
        if (!editStoreName.trim()) {
            setStoreInfoError('매장 이름을 입력해 주세요.');
            return;
        }
        updateStoreInfo(editStoreName.trim(), editShopType);
        setIsEditingStoreInfo(false);
        setStoreInfoError('');
    };

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
            <PageHero eyebrow="STORE" title="매장 관리" subtitle="영업시간과 휴업일을 설정합니다." />
            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>매장 정보</StyledStoreCardTitle>
                    {!isEditingStoreInfo && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingStoreInfo(true)}>수정</StyledEditBtn>
                    )}
                </StyledStoreCardHeader>
                {isEditingStoreInfo ? (
                    <>
                        <StyledStoreFieldGrid>
                            <StyledRangeInputWrap>
                                <span>매장 이름</span>
                                <StyledDateInput
                                    type="text"
                                    value={editStoreName}
                                    onChange={(e) => {
                                        setEditStoreName(e.target.value);
                                        setStoreInfoError('');
                                    }}
                                    placeholder="매장 이름을 입력하세요"
                                />
                            </StyledRangeInputWrap>
                        </StyledStoreFieldGrid>
                        <StyledShopTypeGrid>
                            {Object.entries(SHOP_TYPE_LABELS).map(([type, label]) => (
                                <StyledShopTypeBtn
                                    key={type}
                                    type="button"
                                    $selected={editShopType === type}
                                    onClick={() => setEditShopType(type)}
                                >
                                    {label}
                                </StyledShopTypeBtn>
                            ))}
                        </StyledShopTypeGrid>
                        <FieldError variant="inline">{storeInfoError}</FieldError>
                        <StyledStoreActionRow>
                            <StyledCancelBtn
                                type="button"
                                onClick={() => {
                                    setEditStoreName(storeName);
                                    setEditShopType(shopType);
                                    setStoreInfoError('');
                                    setIsEditingStoreInfo(false);
                                }}
                            >
                                취소
                            </StyledCancelBtn>
                            <StyledSaveBtn type="button" onClick={handleSaveStoreInfo}>저장</StyledSaveBtn>
                        </StyledStoreActionRow>
                    </>
                ) : (
                    <StyledStoreInfoRow>
                        <StyledStoreInfoName>{storeName || <StyledInfoPlaceholder>매장 이름 없음</StyledInfoPlaceholder>}</StyledStoreInfoName>
                        {shopType && (
                            <StyledStoreInfoType>{SHOP_TYPE_LABELS[shopType] ?? shopType}</StyledStoreInfoType>
                        )}
                    </StyledStoreInfoRow>
                )}
            </StyledStoreCard>
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
                        <FieldError variant="inline">{closedDateError}</FieldError>
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    > :first-child,
    > :nth-child(2) { grid-column: 1 / -1; }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledStoreInfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const StyledStoreInfoName = styled.strong`
    font-size: 15px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledInfoPlaceholder = styled.span`
    font-size: 13px;
    font-weight: 400;
    color: var(--dark-gray-color2);
`;

const StyledStoreInfoType = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: var(--blue-color);
    background: rgba(45, 127, 249, 0.08);
    padding: 2px 8px;
    border-radius: 4px;
`;

const StyledShopTypeGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StyledShopTypeBtn = styled.button<{$selected: boolean}>`
    padding: 4px 10px;
    border: 1px solid ${(p) => p.$selected ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 16px;
    background: ${(p) => p.$selected ? 'rgba(45, 127, 249, 0.08)' : 'var(--white-color)'};
    color: ${(p) => p.$selected ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-size: 12px;
    font-weight: ${(p) => p.$selected ? '600' : '400'};
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;
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


