import {useEffect, useMemo, useState} from 'react';

import styled, {css} from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {formatPrice} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';

export const PointManageSection = () => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const updateStorePointSettings = useCalendarStore((s) => s.updateStorePointSettings);
    const [search, setSearch] = useState('');
    const [amountByCustomer, setAmountByCustomer] = useState<Record<number, string>>({});
    const [isEditingPolicy, setIsEditingPolicy] = useState(false);
    const [pointSettingsDraft, setPointSettingsDraft] = useState(storeSettings.pointSettings);

    useEffect(() => {
        setPointSettingsDraft(storeSettings.pointSettings);
    }, [storeSettings.pointSettings]);

    const customers = useMemo(
        () => Object.values(customerMap).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
        [customerMap]
    );

    const filteredCustomers = useMemo(() => {
        const keyword = search.trim();
        if (!keyword) return customers;

        return customers.filter((customer) => (
            customer.name.includes(keyword) ||
            customer.tel.includes(keyword)
        ));
    }, [customers, search]);

    const totalPoints = useMemo(
        () => customers.reduce((sum, customer) => sum + (customer.points ?? 0), 0),
        [customers]
    );
    const isPolicyDirty = JSON.stringify(pointSettingsDraft) !== JSON.stringify(storeSettings.pointSettings);

    const applyPoints = (customerId: number, direction: 'add' | 'subtract') => {
        const raw = amountByCustomer[customerId] ?? '';
        const amount = Number(raw.replace(/[^0-9]/g, '')) || 0;
        if (amount <= 0) return;

        const customer = customerMap[customerId];
        if (!customer) return;

        const currentPoints = customer.points ?? 0;
        const nextPoints = direction === 'add'
            ? currentPoints + amount
            : Math.max(currentPoints - amount, 0);

        updateCustomer(customerId, {points: nextPoints});
        setAmountByCustomer((prev) => ({...prev, [customerId]: ''}));
    };

    return (
        <StyledWrap>
            <StyledTopBar>
                <div>
                    <h3>적립금 관리</h3>
                    <p>고객별 적립금 잔액을 확인하고 직접 적립 또는 차감할 수 있습니다.</p>
                </div>
                <StyledTotalCard>
                    <span>전체 적립금 잔액</span>
                    <strong>{formatPrice(totalPoints)}</strong>
                </StyledTotalCard>
            </StyledTopBar>
            <StyledPolicyCard>
                <StyledPolicyHeader>
                    <div>
                        <strong>적립 방식</strong>
                        <p>적립금이 쌓이는 기본 방식을 설정합니다.</p>
                    </div>
                    {!isEditingPolicy && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingPolicy(true)}>
                            수정
                        </StyledEditBtn>
                    )}
                </StyledPolicyHeader>
                <StyledPolicyOptions>
                    <StyledPolicyBlock>
                        <StyledPolicyOption>
                            <input
                                type="checkbox"
                                checked={pointSettingsDraft.enableServiceRate}
                                disabled={!isEditingPolicy}
                                onChange={(e) => setPointSettingsDraft((prev) => ({...prev, enableServiceRate: e.target.checked}))}
                            />
                            <div>
                                <strong>시술 시 시술 금액 퍼센트 적립</strong>
                                <span>결제완료 시 적립금 결제를 제외한 금액 기준으로 자동 적립됩니다.</span>
                            </div>
                        </StyledPolicyOption>
                        {pointSettingsDraft.enableServiceRate && (
                            <StyledPolicyBody>
                                <StyledRateRow>
                                    <span>적립 퍼센트</span>
                                    <StyledRateInput
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
                                    <em>%</em>
                                </StyledRateRow>
                            </StyledPolicyBody>
                        )}
                    </StyledPolicyBlock>
                    <StyledPolicyBlock>
                        <StyledPolicyOption>
                            <input
                                type="checkbox"
                                checked={pointSettingsDraft.enableRecharge}
                                disabled={!isEditingPolicy}
                                onChange={(e) => setPointSettingsDraft((prev) => ({...prev, enableRecharge: e.target.checked}))}
                            />
                            <div>
                                <strong>충전하는 방식</strong>
                                <span>고객별 적립/차감으로 직접 충전하고 관리합니다.</span>
                            </div>
                        </StyledPolicyOption>
                    </StyledPolicyBlock>
                </StyledPolicyOptions>
                {pointSettingsDraft.enableRecharge && (
                    <StyledPolicyBody>
                        <StyledRechargeSection>
                            <StyledRechargeHeader>
                                <strong>충전 기준</strong>
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
                                        <StyledRechargeField>
                                            <span>기준금액</span>
                                            <StyledRateInput
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
                                        <StyledRechargeField>
                                            <span>추가금</span>
                                            <StyledRateInput
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
                        </StyledRechargeSection>
                    </StyledPolicyBody>
                )}
                {isEditingPolicy && (
                    <StyledPolicyActionRow>
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
                    </StyledPolicyActionRow>
                )}
            </StyledPolicyCard>
            <StyledSearchRow>
                <StyledSearchInput
                    type="search"
                    value={search}
                    placeholder="고객명 또는 연락처 검색"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </StyledSearchRow>
            <StyledCustomerList>
                {filteredCustomers.map((customer) => (
                    <StyledCustomerCard key={customer.id}>
                        <StyledCustomerMeta>
                            <strong>{customer.name}</strong>
                            <span>{customer.tel}</span>
                        </StyledCustomerMeta>
                        <StyledPointValue>{formatPrice(customer.points ?? 0)}</StyledPointValue>
                        <StyledAdjustRow>
                            <StyledAmountInput
                                type="text"
                                inputMode="numeric"
                                value={amountByCustomer[customer.id] ?? ''}
                                placeholder="금액 입력"
                                onChange={(e) => setAmountByCustomer((prev) => ({
                                    ...prev,
                                    [customer.id]: e.target.value,
                                }))}
                            />
                            <StyledActionButton type="button" onClick={() => applyPoints(customer.id, 'add')}>
                                적립
                            </StyledActionButton>
                            <StyledActionButton type="button" $danger onClick={() => applyPoints(customer.id, 'subtract')}>
                                차감
                            </StyledActionButton>
                        </StyledAdjustRow>
                    </StyledCustomerCard>
                ))}
            </StyledCustomerList>
        </StyledWrap>
    );
};

const StyledWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;

    &:hover {
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

const StyledEditBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    font-size: 11px;
    color: var(--dark-gray-color);
`;

const StyledSaveBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--blue-color);
    background-color: var(--blue-color);
    color: #fff;
`;

const StyledCancelBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    color: var(--dark-gray-color);
`;

const StyledTopBar = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    flex-wrap: wrap;

    h3 {
        margin: 0 0 4px;
        font-size: 16px;
    }

    p {
        margin: 0;
        color: var(--dark-gray-color2);
        font-size: 12px;
    }
`;

const StyledTotalCard = styled.div`
    min-width: 180px;
    padding: 12px 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 12px;
    background: var(--white-color);

    span {
        display: block;
        margin-bottom: 6px;
        color: var(--dark-gray-color2);
        font-size: 12px;
    }

    strong {
        font-size: 18px;
    }
`;

const StyledSearchRow = styled.div``;

const StyledPolicyCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 12px;
    background: var(--white-color);
`;

const StyledPolicyHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;

    strong {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
    }

    p {
        margin: 0;
        color: var(--dark-gray-color2);
        font-size: 12px;
    }
`;

const StyledPolicyOptions = styled.div`
    display: grid;
    gap: 10px;
`;

const StyledPolicyBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--black-color-10);
    border-radius: 10px;
    background: #fafafa;
`;

const StyledPolicyOption = styled.label`
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 10px;
    align-items: start;
    cursor: pointer;

    strong {
        display: block;
        margin-bottom: 2px;
        font-size: 13px;
    }

    span {
        color: var(--dark-gray-color2);
        font-size: 12px;
        line-height: 1.45;
    }
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

    span, em {
        font-size: 12px;
        color: var(--dark-gray-color);
        font-style: normal;
    }
`;

const StyledRateInput = styled.input`
    ${formControlStyle};
    padding: 0 10px;
    text-align: right;
`;

const StyledRechargeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledRechargeHeader = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;

    strong {
        font-size: 13px;
    }
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
        grid-template-columns: 1fr;
    }
`;

const StyledRechargeField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }
`;

const StyledRechargePlus = styled.span`
    align-self: center;
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
    cursor: pointer;
`;

const StyledDeleteRuleButton = styled.button`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 12px;
    cursor: pointer;
`;

const StyledRechargePercent = styled.span`
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--dark-gray-color2);
    line-height: 1.4;
`;

const StyledPolicyActionRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const StyledSearchInput = styled.input`
    ${formControlStyle};
    width: min(100%, 320px);
    padding: 0 10px;
`;

const StyledCustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledCustomerCard = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(260px, 320px);
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 12px;
    background: var(--white-color);

    @media (max-width: 860px) {
        grid-template-columns: 1fr;
    }
`;

const StyledCustomerMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
        font-size: 14px;
    }

    span {
        color: var(--dark-gray-color2);
        font-size: 12px;
    }
`;

const StyledPointValue = styled.strong`
    font-size: 16px;
    white-space: nowrap;
`;

const StyledAdjustRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 72px;
    gap: 8px;
`;

const StyledAmountInput = styled.input`
    ${formControlStyle};
    padding: 0 10px;
`;

const StyledActionButton = styled.button<{ $danger?: boolean }>`
    height: 30px;
    border: 1px solid ${(props) => props.$danger ? 'var(--danger-border)' : 'var(--light-gray-color)'};
    border-radius: 8px;
    background: ${(props) => props.$danger ? 'var(--danger-bg)' : 'var(--white-color)'};
    color: ${(props) => props.$danger ? 'var(--danger-color)' : 'var(--dark-gray-color)'};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
`;
