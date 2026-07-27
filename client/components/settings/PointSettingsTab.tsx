import {type Dispatch, type SetStateAction} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {formControlStyle} from '../ui/FormControls';
import {StyledEditBtn, StyledSaveBtn, StyledCancelBtn, StyledHeaderActions} from './settings-styles';

type CalendarState = ReturnType<typeof useCalendarStore.getState>;
type StoreSettings = CalendarState['storeSettings'];
type PointSettings = StoreSettings['pointSettings'];

interface Props {
    pointSettingsDraft: PointSettings;
    setPointSettingsDraft: Dispatch<SetStateAction<PointSettings>>;
    isEditingPolicy: boolean;
    setIsEditingPolicy: (v: boolean) => void;
    storeSettings: StoreSettings;
    updateStorePointSettings: (s: PointSettings) => void;
    isPolicyDirty: boolean;
}

export const PointSettingsTab = ({pointSettingsDraft, setPointSettingsDraft, isEditingPolicy, setIsEditingPolicy, storeSettings, updateStorePointSettings, isPolicyDirty}: Props) => (
    <>
        <StyledPolicyCard>
            <StyledPolicyHeader>
                <div>
                    <StyledPolicyTitle>적립 방식</StyledPolicyTitle>
                    <StyledPolicyDesc>적립금이 쌓이는 기본 방식을 설정합니다.</StyledPolicyDesc>
                </div>
                {!isEditingPolicy ? (
                    <StyledEditBtn
                        type="button"
                        onClick={() => {
                            setPointSettingsDraft(storeSettings.pointSettings);
                            setIsEditingPolicy(true);
                        }}
                    >
                        수정
                    </StyledEditBtn>
                ) : (
                    <StyledHeaderActions>
                        <StyledCancelBtn
                            type="button"
                            onClick={() => {
                                setPointSettingsDraft(storeSettings.pointSettings);
                                setIsEditingPolicy(false);
                            }}
                        >
                            취소
                        </StyledCancelBtn>
                        <StyledSaveBtn
                            type="button"
                            onClick={() => {
                                updateStorePointSettings(pointSettingsDraft);
                                setIsEditingPolicy(false);
                            }}
                            disabled={!isPolicyDirty}
                        >
                            저장
                        </StyledSaveBtn>
                    </StyledHeaderActions>
                )}
            </StyledPolicyHeader>
            <StyledPolicyOptions>
                <StyledPolicyBlock $active={pointSettingsDraft.enableServiceRate}>
                    <StyledPolicyOption htmlFor="point-enable-service-rate">
                        <input
                            id="point-enable-service-rate"
                            type="checkbox"
                            checked={pointSettingsDraft.enableServiceRate}
                            disabled={!isEditingPolicy}
                            onChange={(e) => setPointSettingsDraft((prev) => ({...prev, enableServiceRate: e.target.checked}))}
                        />
                        <div>
                            <StyledPolicyOptionTitle>서비스 금액 일정 퍼센트 적립</StyledPolicyOptionTitle>
                            <StyledPolicyOptionDesc>결제완료 시 적립금 결제를 제외한 금액 기준으로 자동 적립됩니다.</StyledPolicyOptionDesc>
                        </div>
                    </StyledPolicyOption>
                    {pointSettingsDraft.enableServiceRate && (
                        <StyledPolicyBody>
                            <StyledRateRow>
                                <StyledRateLabel htmlFor="point-service-rate">적립 퍼센트</StyledRateLabel>
                                <StyledRateInput
                                    id="point-service-rate"
                                    type="text"
                                    inputMode="numeric"
                                    value={String(pointSettingsDraft.serviceRate)}
                                    disabled={!isEditingPolicy}
                                    onChange={(e) => {
                                        const nextValue = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                        setPointSettingsDraft((prev) => ({
                                            ...prev,
                                            serviceRate: Math.min(nextValue, 100),
                                        }));
                                    }}
                                />
                                <StyledRateUnit>%</StyledRateUnit>
                            </StyledRateRow>
                        </StyledPolicyBody>
                    )}
                </StyledPolicyBlock>
                <StyledPolicyBlock $active={pointSettingsDraft.enableRecharge}>
                    <StyledPolicyOption htmlFor="point-enable-recharge">
                        <input
                            id="point-enable-recharge"
                            type="checkbox"
                            checked={pointSettingsDraft.enableRecharge}
                            disabled={!isEditingPolicy}
                            onChange={(e) => setPointSettingsDraft((prev) => ({...prev, enableRecharge: e.target.checked}))}
                        />
                        <div>
                            <StyledPolicyOptionTitle>충전하는 방식</StyledPolicyOptionTitle>
                            <StyledPolicyOptionDesc>고객별 적립/차감으로 직접 충전하고 관리합니다.</StyledPolicyOptionDesc>
                        </div>
                    </StyledPolicyOption>
                </StyledPolicyBlock>
            </StyledPolicyOptions>
        </StyledPolicyCard>
        {pointSettingsDraft.enableRecharge && (
            <StyledPolicyCard>
                <StyledRechargeHeader>
                    <StyledRechargeTitle>충전 기준</StyledRechargeTitle>
                    <StyledAddRuleButton
                        type="button"
                        disabled={!isEditingPolicy}
                        onClick={() => setPointSettingsDraft((prev) => ({
                            ...prev,
                            rechargeRules: [
                                ...prev.rechargeRules,
                                {baseAmount: 0, bonusAmount: 0},
                            ],
                        }))}
                    >
                        기준 추가
                    </StyledAddRuleButton>
                </StyledRechargeHeader>
                <StyledRechargeList>
                    {pointSettingsDraft.rechargeRules.map((rule, index) => (
                        <StyledRechargeRow key={`recharge-rule-${index}`}>
                            <StyledRechargeField htmlFor={`point-recharge-${index}-base`}>
                                <StyledRechargeFieldLabel>기준금액</StyledRechargeFieldLabel>
                                <StyledRateInput
                                    id={`point-recharge-${index}-base`}
                                    type="text"
                                    inputMode="numeric"
                                    value={String(rule.baseAmount || '')}
                                    placeholder="기준금액"
                                    disabled={!isEditingPolicy}
                                    onChange={(e) => {
                                        const baseAmount = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                        setPointSettingsDraft((prev) => ({
                                            ...prev,
                                            rechargeRules: prev.rechargeRules.map((item, itemIndex) => (
                                                itemIndex === index ? {...item, baseAmount} : item
                                            )),
                                        }));
                                    }}
                                />
                            </StyledRechargeField>
                            <StyledRechargePlus>+</StyledRechargePlus>
                            <StyledRechargeField htmlFor={`point-recharge-${index}-bonus`}>
                                <StyledRechargeFieldLabel>추가금</StyledRechargeFieldLabel>
                                <StyledRateInput
                                    id={`point-recharge-${index}-bonus`}
                                    type="text"
                                    inputMode="numeric"
                                    value={String(rule.bonusAmount || '')}
                                    placeholder="추가금"
                                    disabled={!isEditingPolicy}
                                    onChange={(e) => {
                                        const bonusAmount = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                        setPointSettingsDraft((prev) => ({
                                            ...prev,
                                            rechargeRules: prev.rechargeRules.map((item, itemIndex) => (
                                                itemIndex === index ? {...item, bonusAmount} : item
                                            )),
                                        }));
                                    }}
                                />
                            </StyledRechargeField>
                            <StyledDeleteRuleButton
                                type="button"
                                disabled={!isEditingPolicy}
                                onClick={() => setPointSettingsDraft((prev) => ({
                                    ...prev,
                                    rechargeRules: prev.rechargeRules.length > 1
                                        ? prev.rechargeRules.filter((_, itemIndex) => itemIndex !== index)
                                        : [{baseAmount: 0, bonusAmount: 0}],
                                }))}
                            >
                                삭제
                            </StyledDeleteRuleButton>
                            <StyledRechargePercent>
                                추가 적립 {rule.baseAmount > 0 ? `${Math.round((rule.bonusAmount / rule.baseAmount) * 100)}%` : '0%'}
                            </StyledRechargePercent>
                        </StyledRechargeRow>
                    ))}
                </StyledRechargeList>
            </StyledPolicyCard>
        )}
    </>
);

const StyledPolicyCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
`;

const StyledPolicyHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
`;

const StyledPolicyTitle = styled.strong`
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
`;

const StyledPolicyDesc = styled.p`
    margin: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
`;

const StyledPolicyOptions = styled.div`
    display: grid;
    gap: 10px;
`;

const StyledPolicyBlock = styled.div<{$active?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid ${(p) => p.$active ? 'rgba(45, 127, 249, 0.35)' : 'var(--light-gray-color)'};
    border-radius: 10px;
    background: ${(p) => p.$active ? 'rgba(45, 127, 249, 0.06)' : 'var(--gray-color2)'};
    opacity: ${(p) => p.$active ? 1 : 0.6};
    transition: border-color 0.15s, background 0.15s, opacity 0.15s;
`;

const StyledPolicyOption = styled.label`
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 10px;
    align-items: start;
    cursor: pointer;
`;

const StyledPolicyOptionTitle = styled.strong`
    display: block;
    margin-bottom: 2px;
    font-size: 13px;
`;

const StyledPolicyOptionDesc = styled.span`
    color: var(--dark-gray-color2);
    font-size: 12px;
    line-height: 1.45;
`;

const StyledPolicyBody = styled.div`
    padding-left: 28px;

    @media (max-width: 640px) {
        padding-left: 0;
    }
`;

const StyledRateRow = styled.div`
    display: inline-grid;
    grid-template-columns: auto 72px auto;
    gap: 8px;
    align-items: center;
`;

const StyledRateLabel = styled.label`
    font-size: 12px;
    color: var(--dark-gray-color);
    font-style: normal;
`;

const StyledRateUnit = styled.em`
    font-size: 12px;
    color: var(--dark-gray-color);
    font-style: normal;
`;

const StyledRateInput = styled.input`
    ${formControlStyle};
    padding: 0 10px;
    text-align: right;
`;

const StyledRechargeHeader = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
`;

const StyledRechargeTitle = styled.strong`
    font-size: 13px;
`;

const StyledRechargeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledRechargeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 16px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: end;

    @media (max-width: 720px) {
        grid-template-columns: minmax(0, 1fr) 16px minmax(0, 1fr);
    }
`;

const StyledRechargeField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledRechargeFieldLabel = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledRechargePlus = styled.span`
    align-self: center;
    justify-self: center;
    font-size: 16px;
    color: var(--dark-gray-color2);
`;

const StyledAddRuleButton = styled.button`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: 12px;
    font-weight: 600;
`;

const StyledDeleteRuleButton = styled.button`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 12px;

    @media (max-width: 720px) {
        grid-column: 1 / -1;
    }
`;

const StyledRechargePercent = styled.span`
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--dark-gray-color2);
    line-height: 1.4;
`;

