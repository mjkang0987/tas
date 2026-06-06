import {useMemo, useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {Customer, PointHistoryEntry} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {formatPrice} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';
import {CloseIconButton} from '../ui/CloseIconButton';
import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    scrollContentStyle,
} from '../calendar/overlays/ModalStyles';

const CUSTOM_OPTION = '__custom__';

const POINT_HISTORY_LABELS: Record<PointHistoryEntry['type'], string> = {
    manual_add: '수동 적립',
    manual_subtract: '수동 차감',
    recharge: '충전',
    payment_use: '결제 사용',
    payment_earn: '결제 적립',
    payment_adjust: '적립 조정',
};

type AddressCustomerRechargeProps = {
    customer: Customer;
    customerReservations: Reservation[];
    onReservationClick: (reservation: Reservation) => void;
};

export function AddressCustomerRecharge({customer, customerReservations, onReservationClick}: AddressCustomerRechargeProps) {
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const [selectedValue, setSelectedValue] = useState('0');
    const [customAmount, setCustomAmount] = useState('');
    const [isPointHistoryOpen, setIsPointHistoryOpen] = useState(false);

    const rechargeOptions = useMemo(
        () => storeSettings.pointSettings.rechargeRules.map((rule, index) => ({
            value: String(index),
            label: `${formatPrice(rule.baseAmount)} + ${formatPrice(rule.bonusAmount)}`,
            total: rule.baseAmount + rule.bonusAmount,
        })),
        [storeSettings.pointSettings.rechargeRules]
    );

    const enableRecharge = storeSettings.pointSettings.enableRecharge;
    const pointHistories = useMemo(
        () => [...(customer.pointHistories ?? [])].reverse(),
        [customer.pointHistories]
    );

    if (!enableRecharge && pointHistories.length === 0) {
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

    const handlePointHistoryClick = (entry: PointHistoryEntry) => {
        if (!entry.relatedReservationId) return;
        const reservation = customerReservations.find((r) => r.id === entry.relatedReservationId);
        if (reservation) onReservationClick(reservation);
    };

    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;

    return (
        <StyledRechargeWrap onClick={(e) => e.preventDefault()}>
            {enableRecharge && (
                <>
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
                </>
            )}
            {pointHistories.length > 0 && (
                <StyledPointSection>
                    <StyledPointSectionHeader>
                        <strong>적립금 이력 ({pointHistories.length})</strong>
                        {pointHistories.length > 1 && (
                            <StyledMoreButton type="button" onClick={() => setIsPointHistoryOpen(true)}>
                                더보기
                            </StyledMoreButton>
                        )}
                    </StyledPointSectionHeader>
                    <StyledPointList>
                        <StyledPointItem
                            $clickable={!!pointHistories[0].relatedReservationId}
                            onClick={() => handlePointHistoryClick(pointHistories[0])}
                        >
                            <StyledPointTop>
                                <strong>{POINT_HISTORY_LABELS[pointHistories[0].type]}</strong>
                                <span>{pointHistories[0].delta > 0 ? '+' : ''}{formatPrice(pointHistories[0].delta)}</span>
                            </StyledPointTop>
                            <StyledPointMeta>
                                <span>{pointHistories[0].description}</span>
                                <span>잔액 {formatPrice(pointHistories[0].balance)}</span>
                                <span>{pointHistories[0].createdAt.slice(0, 16).replace('T', ' ')}</span>
                            </StyledPointMeta>
                        </StyledPointItem>
                    </StyledPointList>
                </StyledPointSection>
            )}
            {isPointHistoryOpen && modalRoot && createPortal(
                <StyledHistoryOverlay onClick={() => setIsPointHistoryOpen(false)}>
                    <StyledHistoryModal onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <h3>적립금 이력 ({pointHistories.length})</h3>
                            <CloseIconButton onClick={() => setIsPointHistoryOpen(false)} />
                        </StyledHeader>
                        <StyledHistoryModalContent>
                            <StyledPointList>
                                {pointHistories.map((history) => (
                                    <StyledPointItem
                                        key={history.id}
                                        $clickable={!!history.relatedReservationId}
                                        onClick={() => handlePointHistoryClick(history)}
                                    >
                                        <StyledPointTop>
                                            <strong>{POINT_HISTORY_LABELS[history.type]}</strong>
                                            <span>{history.delta > 0 ? '+' : ''}{formatPrice(history.delta)}</span>
                                        </StyledPointTop>
                                        <StyledPointMeta>
                                            <span>{history.description}</span>
                                            <span>잔액 {formatPrice(history.balance)}</span>
                                            <span>{history.createdAt.slice(0, 16).replace('T', ' ')}</span>
                                        </StyledPointMeta>
                                    </StyledPointItem>
                                ))}
                            </StyledPointList>
                        </StyledHistoryModalContent>
                    </StyledHistoryModal>
                </StyledHistoryOverlay>,
                modalRoot
            )}
        </StyledRechargeWrap>
    );
}

const StyledRechargeWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0 12px;
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
`;

const StyledPointSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledPointSectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;

    strong {
        font-size: 13px;
        color: var(--dark-gray-color);
    }
`;

const StyledMoreButton = styled.button`
    border: none;
    background: none;
    font-size: 12px;
    color: var(--blue-color);
    font-weight: 600;
    padding: 0;
`;

const StyledPointList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledPointItem = styled.li<{$clickable?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    cursor: ${(p) => p.$clickable ? 'pointer' : 'default'};

    ${(p) => p.$clickable && `
        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: var(--gray-color2);
            }
        }
    `}
`;

const StyledPointTop = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;

    strong {
        font-size: 12px;
        font-weight: 600;
    }

    span {
        font-size: 12px;
        font-weight: 700;
        color: var(--blue-color);
    }
`;

const StyledPointMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

const StyledHistoryModal = styled(StyledDetail)`
    width: min(360px, 90vw);
    max-height: 70vh;
`;

const StyledHistoryModalContent = styled.div`
    ${scrollContentStyle};
    padding: 8px;
`;
