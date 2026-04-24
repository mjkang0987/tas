import {useMemo, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {Customer} from '../../utils/customers';
import {formatPrice} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';

const CUSTOM_OPTION = '__custom__';

type AddressCustomerRechargeProps = {
    customer: Customer;
};

export function AddressCustomerRecharge({customer}: AddressCustomerRechargeProps) {
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const [selectedValue, setSelectedValue] = useState('0');
    const [customAmount, setCustomAmount] = useState('');

    const rechargeOptions = useMemo(
        () => storeSettings.pointSettings.rechargeRules.map((rule, index) => ({
            value: String(index),
            label: `${formatPrice(rule.baseAmount)} + ${formatPrice(rule.bonusAmount)}`,
            total: rule.baseAmount + rule.bonusAmount,
        })),
        [storeSettings.pointSettings.rechargeRules]
    );

    if (!storeSettings.pointSettings.enableRecharge) {
        return null;
    }

    const handleCharge = () => {
        const amount = selectedValue === CUSTOM_OPTION
            ? (Number(customAmount.replace(/[^0-9]/g, '')) || 0)
            : (rechargeOptions.find((option) => option.value === selectedValue)?.total ?? 0);

        if (amount <= 0) return;

        updateCustomer(customer.id, {
            points: (customer.points ?? 0) + amount,
        }, {
            type: 'recharge',
            delta: amount,
            description: selectedValue === CUSTOM_OPTION ? '적립금 직접 충전' : '적립금 기준 충전',
        });
        setCustomAmount('');
        setSelectedValue('0');
    };

    return (
        <StyledRechargeWrap onClick={(e) => e.preventDefault()}>
            <StyledRechargeHeader>
                <strong>적립금 충전</strong>
                <span>현재 잔액 {formatPrice(customer.points ?? 0)}</span>
            </StyledRechargeHeader>
            <StyledRechargeControls>
                <StyledRechargeSelect
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                >
                    {rechargeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    <option value={CUSTOM_OPTION}>직접입력</option>
                </StyledRechargeSelect>
                {selectedValue === CUSTOM_OPTION && (
                    <StyledCustomAmountInput
                        type="text"
                        inputMode="numeric"
                        value={customAmount}
                        placeholder="충전금액"
                        onChange={(e) => setCustomAmount(e.target.value)}
                    />
                )}
                <StyledChargeButton type="button" onClick={handleCharge}>
                    충전
                </StyledChargeButton>
            </StyledRechargeControls>
        </StyledRechargeWrap>
    );
}

const StyledRechargeWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0 12px 12px;
    border-top: 1px dashed var(--light-gray-color);
`;

const StyledRechargeHeader = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;

    strong {
        font-size: 13px;
        color: var(--dark-gray-color);
    }

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }
`;

const StyledRechargeControls = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 240px) minmax(0, 140px) 84px;
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledRechargeSelect = styled.select`
    ${formControlStyle};
    padding: 0 10px;
`;

const StyledCustomAmountInput = styled.input`
    ${formControlStyle};
    width: 100%;
    padding: 0 10px;
`;

const StyledChargeButton = styled.button`
    height: 30px;
    width: 84px;
    padding: 0 12px;
    border: 1px solid var(--blue-color);
    border-radius: var(--radius-md);
    background: var(--blue-color);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
`;
