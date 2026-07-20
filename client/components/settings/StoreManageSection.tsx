import {useEffect, useState} from 'react';

import styled from 'styled-components';

import {EMPTY_TEXT, StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, StyledHeaderActions} from './settings-styles';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';
import {useToastStore} from '../../store/toastStore';
import {SHOP_INDUSTRIES, CATEGORY_NAMES, getPrimaryIndustry, type ShopCategory} from '../../features/store-settings/labels';
import {BookingManageSection} from './BookingManageSection';

interface StoreManageSectionProps {
    formatDateLabel: (dateKey: string) => string;
}

// 정기 휴무 요일 라벨 — 인덱스 0=월 … 6=일 (앱 공통 dayIndex 규칙).
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];


export const StoreManageSection = ({formatDateLabel}: StoreManageSectionProps) => {
    const toast = useToastStore((s) => s.show);
    const storeName = useCalendarStore((s) => s.storeName);
    const shopType = useCalendarStore((s) => s.shopType);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateStoreInfo = useCalendarStore((s) => s.updateStoreInfo);
    const updateStoreBusinessHours = useCalendarStore((s) => s.updateStoreBusinessHours);
    const updateStoreClosedDates = useCalendarStore((s) => s.updateStoreClosedDates);
    const updateStoreClosedWeekdays = useCalendarStore((s) => s.updateStoreClosedWeekdays);
    const usePointSystem = useCalendarStore((s) => s.usePointSystem);
    const useMembershipSystem = useCalendarStore((s) => s.useMembershipSystem);
    const useCouponSystem = useCalendarStore((s) => s.useCouponSystem);
    const useOnlineBooking = useCalendarStore((s) => s.useOnlineBooking);
    const updateStoreFeatures = useCalendarStore((s) => s.updateStoreFeatures);
    const [businessHours, setBusinessHours] = useState(storeSettings.businessHours);
    const [closedDates, setClosedDates] = useState(storeSettings.closedDates);
    const [closedDateInput, setClosedDateInput] = useState('');
    const [closedDateError, setClosedDateError] = useState('');
    const [closedWeekdays, setClosedWeekdays] = useState(storeSettings.closedWeekdays ?? []);
    const [isEditingBusinessHours, setIsEditingBusinessHours] = useState(false);
    const [isEditingClosedDates, setIsEditingClosedDates] = useState(false);
    const [isEditingClosedWeekdays, setIsEditingClosedWeekdays] = useState(false);
    const [isEditingStoreInfo, setIsEditingStoreInfo] = useState(false);
    const [editStoreName, setEditStoreName] = useState(storeName);
    const [editShopType, setEditShopType] = useState(getPrimaryIndustry(shopType)?.value ?? '');
    const [storeInfoError, setStoreInfoError] = useState('');

    const currentIndustry = getPrimaryIndustry(shopType);
    // optgroup 용: 카테고리 순서대로 업종 그룹화
    const industryGroups = (Object.keys(CATEGORY_NAMES) as ShopCategory[])
        .map((cat) => ({cat, items: SHOP_INDUSTRIES.filter((s) => s.category === cat)}))
        .filter((g) => g.items.length > 0);

    useEffect(() => {
        setBusinessHours(storeSettings.businessHours);
        setClosedDates(storeSettings.closedDates);
        setClosedWeekdays(storeSettings.closedWeekdays ?? []);
    }, [storeSettings]);

    useEffect(() => {
        setEditStoreName(storeName);
    }, [storeName]);

    useEffect(() => {
        setEditShopType(getPrimaryIndustry(shopType)?.value ?? '');
    }, [shopType]);

    const handleSaveStoreInfo = () => {
        if (!editStoreName.trim()) {
            setStoreInfoError('매장 이름을 입력해 주세요.');
            return;
        }
        updateStoreInfo(editStoreName.trim(), editShopType || null);
        setIsEditingStoreInfo(false);
        setStoreInfoError('');
        toast('매장 정보가 저장되었습니다.');
    };

    const isBusinessHoursDirty = businessHours.start !== storeSettings.businessHours.start
        || businessHours.end !== storeSettings.businessHours.end;
    const isClosedDatesDirty = closedDates.join('|') !== storeSettings.closedDates.join('|');
    const sortedClosedWeekdays = [...closedWeekdays].sort((a, b) => a - b);
    const isClosedWeekdaysDirty = sortedClosedWeekdays.join('|') !== [...(storeSettings.closedWeekdays ?? [])].sort((a, b) => a - b).join('|');

    const toggleClosedWeekday = (dayIndex: number) => {
        setClosedWeekdays((prev) => (
            prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
        ));
    };

    const handleSaveClosedWeekdays = () => {
        updateStoreClosedWeekdays(sortedClosedWeekdays);
        setIsEditingClosedWeekdays(false);
        toast('정기 휴무가 저장되었습니다.');
    };

    const handleSaveBusinessHours = () => {
        updateStoreBusinessHours(businessHours);
        setIsEditingBusinessHours(false);
        toast('영업시간이 저장되었습니다.');
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
        toast('휴업일이 저장되었습니다.');
    };

    return (
        <StyledStoreSection>
            <PageHero eyebrow="STORE" title="매장 관리" subtitle="영업시간과 휴업일을 설정합니다." />
            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>매장 정보</StyledStoreCardTitle>
                    {!isEditingStoreInfo ? (
                        <StyledEditBtn type="button" onClick={() => setIsEditingStoreInfo(true)}>수정</StyledEditBtn>
                    ) : (
                        <StyledHeaderActions>
                            <StyledCancelBtn
                                type="button"
                                onClick={() => {
                                    setEditStoreName(storeName);
                                    setEditShopType(getPrimaryIndustry(shopType)?.value ?? '');
                                    setStoreInfoError('');
                                    setIsEditingStoreInfo(false);
                                }}
                            >
                                취소
                            </StyledCancelBtn>
                            <StyledSaveBtn type="button" onClick={handleSaveStoreInfo}>저장</StyledSaveBtn>
                        </StyledHeaderActions>
                    )}
                </StyledStoreCardHeader>
                {isEditingStoreInfo ? (
                    <>
                        <StyledStoreFieldGrid>
                            <StyledRangeInputWrap htmlFor="store-edit-name">
                                <span>매장 이름</span>
                                <StyledDateInput
                                    id="store-edit-name"
                                    type="text"
                                    value={editStoreName}
                                    onChange={(e) => {
                                        setEditStoreName(e.target.value);
                                        setStoreInfoError('');
                                    }}
                                    placeholder="매장 이름을 입력하세요"
                                />
                                <FieldError variant="inline">{storeInfoError}</FieldError>
                            </StyledRangeInputWrap>
                            <StyledRangeInputWrap htmlFor="store-edit-industry">
                                <span>업종</span>
                                <StyledIndustrySelect
                                    id="store-edit-industry"
                                    value={editShopType}
                                    onChange={(e) => setEditShopType(e.target.value)}
                                >
                                    <option value="">선택 안 함</option>
                                    {industryGroups.map((g) => (
                                        <optgroup key={g.cat} label={CATEGORY_NAMES[g.cat]}>
                                            {g.items.map((s) => (
                                                <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </StyledIndustrySelect>
                            </StyledRangeInputWrap>
                        </StyledStoreFieldGrid>
                    </>
                ) : (
                    <StyledStoreInfoRow>
                        <StyledStoreInfoName>{storeName || <StyledInfoPlaceholder>매장 이름 없음</StyledInfoPlaceholder>}</StyledStoreInfoName>
                        <StyledIndustryBadge>
                            {currentIndustry
                                ? `${currentIndustry.emoji} ${currentIndustry.label}`
                                : <StyledInfoPlaceholder>업종 미설정</StyledInfoPlaceholder>}
                        </StyledIndustryBadge>
                    </StyledStoreInfoRow>
                )}
            </StyledStoreCard>
            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>영업시간</StyledStoreCardTitle>
                    {!isEditingBusinessHours ? (
                        <StyledEditBtn type="button" onClick={() => setIsEditingBusinessHours(true)}>수정</StyledEditBtn>
                    ) : (
                        <StyledHeaderActions>
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
                        </StyledHeaderActions>
                    )}
                </StyledStoreCardHeader>
                <StyledStoreFieldGrid>
                    <StyledRangeInputWrap htmlFor="store-bh-start">
                        <span>오픈</span>
                        <StyledDateInput
                            id="store-bh-start"
                            type="time"
                            value={businessHours.start}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, start: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                    <StyledRangeInputWrap htmlFor="store-bh-end">
                        <span>마감</span>
                        <StyledDateInput
                            id="store-bh-end"
                            type="time"
                            value={businessHours.end}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, end: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                </StyledStoreFieldGrid>
            </StyledStoreCard>

            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>정기 휴무</StyledStoreCardTitle>
                    {!isEditingClosedWeekdays ? (
                        <StyledEditBtn type="button" onClick={() => setIsEditingClosedWeekdays(true)}>수정</StyledEditBtn>
                    ) : (
                        <StyledHeaderActions>
                            <StyledCancelBtn
                                type="button"
                                onClick={() => {
                                    setClosedWeekdays(storeSettings.closedWeekdays ?? []);
                                    setIsEditingClosedWeekdays(false);
                                }}
                            >
                                취소
                            </StyledCancelBtn>
                            <StyledSaveBtn type="button" onClick={handleSaveClosedWeekdays} disabled={!isClosedWeekdaysDirty}>저장</StyledSaveBtn>
                        </StyledHeaderActions>
                    )}
                </StyledStoreCardHeader>
                <StyledWeekdayHint>매주 쉬는 요일을 선택하면 고객 예약 페이지에서 해당 요일은 예약할 수 없습니다.</StyledWeekdayHint>
                <StyledWeekdayRow role="group" aria-label="정기 휴무 요일">
                    {WEEKDAY_LABELS.map((label, dayIndex) => {
                        const checked = sortedClosedWeekdays.includes(dayIndex);
                        return (
                            <StyledWeekdayChip
                                key={dayIndex}
                                htmlFor={`closed-weekday-${dayIndex}`}
                                className={`${checked ? 'is-on' : ''}${isEditingClosedWeekdays ? '' : ' is-readonly'}`}
                            >
                                <input
                                    id={`closed-weekday-${dayIndex}`}
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!isEditingClosedWeekdays}
                                    onChange={() => toggleClosedWeekday(dayIndex)}
                                />
                                <span>{label}</span>
                            </StyledWeekdayChip>
                        );
                    })}
                </StyledWeekdayRow>
                {sortedClosedWeekdays.length === 0 && !isEditingClosedWeekdays && (
                    <StyledEmpty>정기 휴무 없음</StyledEmpty>
                )}
            </StyledStoreCard>

            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>휴업일</StyledStoreCardTitle>
                    {!isEditingClosedDates ? (
                        <StyledEditBtn type="button" onClick={() => setIsEditingClosedDates(true)}>수정</StyledEditBtn>
                    ) : (
                        <StyledHeaderActions>
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
                        </StyledHeaderActions>
                    )}
                </StyledStoreCardHeader>
                {isEditingClosedDates && (
                    <>
                        <StyledClosedDateAddRow>
                            <StyledDateInput
                                id="store-closed-date"
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
                    <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
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
            </StyledStoreCard>

            <StyledFeatureCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>기능 사용</StyledStoreCardTitle>
                </StyledStoreCardHeader>
                <StyledFeatureList>
                    <StyledFeatureItem htmlFor="feature-point">
                        <StyledFeatureCheckbox
                            id="feature-point"
                            type="checkbox"
                            checked={usePointSystem}
                            onChange={(e) => {
                                updateStoreFeatures({usePointSystem: e.target.checked});
                                toast(e.target.checked ? '적립금 시스템을 켰습니다.' : '적립금 시스템을 껐습니다.');
                            }}
                        />
                        <StyledFeatureText>
                            <StyledFeatureName>적립금 시스템 사용</StyledFeatureName>
                            <StyledFeatureDesc>결제 시 적립·선불 충전(선불금) 기능. 켜면 설정 메뉴에 ‘적립금 관리’가 나타납니다.</StyledFeatureDesc>
                        </StyledFeatureText>
                    </StyledFeatureItem>
                    <StyledFeatureItem htmlFor="feature-membership">
                        <StyledFeatureCheckbox
                            id="feature-membership"
                            type="checkbox"
                            checked={useMembershipSystem}
                            onChange={(e) => {
                                updateStoreFeatures({useMembershipSystem: e.target.checked});
                                toast(e.target.checked ? '회원권 시스템을 켰습니다.' : '회원권 시스템을 껐습니다.');
                            }}
                        />
                        <StyledFeatureText>
                            <StyledFeatureName>회원권 시스템 사용</StyledFeatureName>
                            <StyledFeatureDesc>횟수·기간 회원권 발급·차감 기능. 켜면 설정 메뉴에 ‘회원권 관리’가 나타납니다.</StyledFeatureDesc>
                        </StyledFeatureText>
                    </StyledFeatureItem>
                    <StyledFeatureItem htmlFor="feature-coupon">
                        <StyledFeatureCheckbox
                            id="feature-coupon"
                            type="checkbox"
                            checked={useCouponSystem}
                            onChange={(e) => {
                                updateStoreFeatures({useCouponSystem: e.target.checked});
                                toast(e.target.checked ? '쿠폰 시스템을 켰습니다.' : '쿠폰 시스템을 껐습니다.');
                            }}
                        />
                        <StyledFeatureText>
                            <StyledFeatureName>쿠폰 시스템 사용</StyledFeatureName>
                            <StyledFeatureDesc>정액·정률 할인 쿠폰 발급 기능. 켜면 설정 메뉴에 ‘쿠폰 관리’가 나타납니다.</StyledFeatureDesc>
                        </StyledFeatureText>
                    </StyledFeatureItem>
                    <StyledFeatureItem htmlFor="feature-booking">
                        <StyledFeatureCheckbox
                            id="feature-booking"
                            type="checkbox"
                            checked={useOnlineBooking}
                            onChange={(e) => {
                                updateStoreFeatures({useOnlineBooking: e.target.checked});
                                toast(e.target.checked ? '고객 예약 서비스를 켰습니다.' : '고객 예약 서비스를 껐습니다.');
                            }}
                        />
                        <StyledFeatureText>
                            <StyledFeatureName>고객 예약 서비스 사용</StyledFeatureName>
                            <StyledFeatureDesc>고객이 직접 예약하는 공개 예약 페이지. 켜면 아래에 예약 설정이 나타납니다.</StyledFeatureDesc>
                        </StyledFeatureText>
                    </StyledFeatureItem>
                </StyledFeatureList>
            </StyledFeatureCard>

            {useOnlineBooking && (
                <StyledBookingWrap>
                    <BookingManageSection />
                </StyledBookingWrap>
            )}
        </StyledStoreSection>
    );
};

const StyledBookingWrap = styled.div`
    grid-column: 1 / -1;
    margin-top: 24px;
    min-width: 0;
`;


const StyledStoreSection = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    /* PC: PageHero만 전체 폭. 매장정보+영업시간 / 정기휴무+휴업일이 각각 한 줄 2열로 나란히. */
    > :first-child { grid-column: 1 / -1; }

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

const StyledIndustrySelect = styled.select`
    ${formControlStyle};
`;

const StyledIndustryBadge = styled.span`
    font-size: 13px;
    color: var(--dark-gray-color);
    background: var(--gray-color2);
    padding: 3px 10px;
    border-radius: var(--chip-radius);
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

const StyledFeatureCard = styled(StyledStoreCard)`
    grid-column: 1 / -1;
`;

const StyledFeatureList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledFeatureItem = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 4px;
    cursor: pointer;

    & + & {
        border-top: 1px solid var(--black-color-10);
    }
`;

const StyledFeatureCheckbox = styled.input`
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
    cursor: pointer;
`;

const StyledFeatureText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledFeatureName = styled.strong`
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledFeatureDesc = styled.em`
    font-style: normal;
    font-size: 12px;
    color: var(--dark-gray-color2);
    line-height: 1.5;
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

const StyledWeekdayHint = styled.em`
    font-style: normal;
    font-size: 12px;
    color: var(--dark-gray-color2);
    line-height: 1.5;
`;

const StyledWeekdayRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const StyledWeekdayChip = styled.label`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding: 8px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--chip-radius);
    background: var(--white-color);
    color: var(--black-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    /* 네이티브 체크박스는 시각적으로 숨기되 접근성 유지(라벨 클릭·키보드 토글 동작) */
    input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }

    &.is-on {
        border-color: var(--brand-color);
        background: var(--brand-color);
        color: var(--white-color);
    }

    &.is-readonly {
        cursor: default;
    }
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


