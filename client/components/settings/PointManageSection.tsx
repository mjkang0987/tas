import {useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {PointHistoryEntry} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {formatPrice} from '../../utils/services';
import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {actionButtonStyle, StyledEditBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty} from './settings-styles';

const POINT_HISTORY_LABELS: Record<PointHistoryEntry['type'], string> = {
    manual_add: '수동 적립',
    manual_subtract: '수동 차감',
    recharge: '충전',
    payment_use: '결제 사용',
    payment_earn: '결제 적립',
    payment_adjust: '적립 조정',
};

type PointManageTab = 'history' | 'adjust' | 'settings';

export const PointManageSection = () => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const updateStorePointSettings = useCalendarStore((s) => s.updateStorePointSettings);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const [search, setSearch] = useState('');
    const [amountByCustomer, setAmountByCustomer] = useState<Record<number, string>>({});
    const [isEditingPolicy, setIsEditingPolicy] = useState(false);
    const [pointSettingsDraft, setPointSettingsDraft] = useState(storeSettings.pointSettings);
    const [activeTab, setActiveTab] = useState<PointManageTab>('history');

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
    const customersWithPoints = useMemo(
        () => customers
            .filter((customer) => (customer.points ?? 0) > 0)
            .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name, 'ko')),
        [customers]
    );
    useEffect(() => {
        if (!isEditingPolicy) {
            setPointSettingsDraft(storeSettings.pointSettings);
        }
    }, [storeSettings.pointSettings, isEditingPolicy]);

    const isPolicyDirty = JSON.stringify(pointSettingsDraft) !== JSON.stringify(storeSettings.pointSettings);

    const allReservations = useMemo<Reservation[]>(
        () => Object.values(reservationMap).flat(),
        [reservationMap]
    );

    const handlePointHistoryClick = (entry: PointHistoryEntry) => {
        console.log('[point-click] entry:', entry.type, 'relatedReservationId:', entry.relatedReservationId);
        if (!entry.relatedReservationId) return;
        const reservation = allReservations.find((r) => r.id === entry.relatedReservationId);
        console.log('[point-click] found reservation:', reservation?.id, reservation?.date);
        if (reservation) openReservationDetailFromCustomer(reservation);
    };

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

        updateCustomer(customerId, {points: nextPoints}, {
            type: direction === 'add' ? 'manual_add' : 'manual_subtract',
            delta: direction === 'add' ? amount : -amount,
            description: direction === 'add' ? '수동 적립' : '수동 차감',
        });
        setAmountByCustomer((prev) => ({...prev, [customerId]: ''}));
    };

    return (
        <StyledWrap>
            <PageHero eyebrow="POINT" title="적립금 관리" subtitle="고객 적립금 내역 조회, 수동 적립/차감, 적립 정책을 설정합니다." />
            <StyledStickyHeader>
                <StyledTopBar>
                    <StyledTabRow>
                        <StyledTabButton type="button" $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>내역</StyledTabButton>
                        <StyledTabButton type="button" $active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')}>적립</StyledTabButton>
                        <StyledTabButton type="button" $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>설정</StyledTabButton>
                    </StyledTabRow>
                    <StyledTotalBadge>
                        <span>전체 잔액</span>
                        <strong>{formatPrice(totalPoints)}</strong>
                    </StyledTotalBadge>
                </StyledTopBar>
            </StyledStickyHeader>
            {activeTab === 'history' && (
                <StyledHistorySection>
                    <StyledHistoryHeader>
                        <div>
                            <strong>현재 적립금 보유 고객 전체 내역</strong>
                            <span>현재 잔액이 남아있는 고객만 모아서 전체 적립/차감/충전 이력을 표시합니다.</span>
                        </div>
                        <em>{customersWithPoints.length}명</em>
                    </StyledHistoryHeader>
                    {customersWithPoints.length === 0 ? (
                        <StyledHistoryEmpty>현재 적립금이 남아있는 고객이 없습니다.</StyledHistoryEmpty>
                    ) : (
                        <StyledHistoryCustomerList>
                            {customersWithPoints.map((customer) => {
                                const histories = [...(customer.pointHistories ?? [])].reverse();

                                return (
                                    <StyledHistoryCustomerCard key={`point-history-${customer.id}`}>
                                    <StyledHistoryCustomerHead>
                                        <div>
                                            <StyledCustomerNameButton type="button" onClick={() => openCustomerDetail(customer.id)}>
                                                {customer.name}
                                            </StyledCustomerNameButton>
                                            <StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink>
                                        </div>
                                        <StyledHistoryPoint>{formatPrice(customer.points ?? 0)}</StyledHistoryPoint>
                                        </StyledHistoryCustomerHead>
                                        {histories.length === 0 ? (
                                            <StyledHistoryEmpty>적립금 이력이 없습니다.</StyledHistoryEmpty>
                                        ) : (
                                            <StyledHistoryList>
                                                {histories.map((history) => (
                                                    <StyledHistoryItem
                                                        key={history.id}
                                                        $clickable={!!history.relatedReservationId}
                                                        onClick={() => handlePointHistoryClick(history)}
                                                    >
                                                        <StyledHistoryTop>
                                                            <strong>{POINT_HISTORY_LABELS[history.type]}</strong>
                                                            <span>{history.delta > 0 ? '+' : ''}{formatPrice(history.delta)}</span>
                                                        </StyledHistoryTop>
                                                        <StyledHistoryMeta>
                                                            <span>{history.description}</span>
                                                            <span>잔액 {formatPrice(history.balance)}</span>
                                                            <span>{history.createdAt.slice(0, 16).replace('T', ' ')}</span>
                                                        </StyledHistoryMeta>
                                                    </StyledHistoryItem>
                                                ))}
                                            </StyledHistoryList>
                                        )}
                                    </StyledHistoryCustomerCard>
                                );
                            })}
                        </StyledHistoryCustomerList>
                    )}
                </StyledHistorySection>
            )}
            {activeTab === 'adjust' && (
                <>
                    <StyledSearchRow>
                        <StyledSearchInput
                            id="point-search"
                            type="search"
                            value={search}
                            placeholder="고객명 또는 연락처 검색"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </StyledSearchRow>
                    {filteredCustomers.length === 0 ? (
                        <StyledEmpty>내역이 없습니다.</StyledEmpty>
                    ) : (
                    <StyledCustomerList>
                        {filteredCustomers.map((customer) => (
                            <StyledCustomerCard key={customer.id}>
                                <StyledCustomerMeta>
                                    <StyledCustomerNameButton type="button" onClick={() => openCustomerDetail(customer.id)}>
                                        {customer.name}
                                    </StyledCustomerNameButton>
                                    <StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink>
                                </StyledCustomerMeta>
                                <StyledPointValue>{formatPrice(customer.points ?? 0)}</StyledPointValue>
                                <StyledAdjustRow>
                                    <StyledAmountInput
                                        id={`point-adjust-${customer.id}`}
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
                    )}
                </>
            )}
            {activeTab === 'settings' && (
                <>
                    <StyledPolicyCard>
                        <StyledPolicyHeader>
                            <div>
                                <strong>적립 방식</strong>
                                <p>적립금이 쌓이는 기본 방식을 설정합니다.</p>
                            </div>
                            {!isEditingPolicy && (
                                <StyledEditBtn
                                    type="button"
                                    onClick={() => {
                                        setPointSettingsDraft(storeSettings.pointSettings);
                                        setIsEditingPolicy(true);
                                    }}
                                >
                                    수정
                                </StyledEditBtn>
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
                                        <strong>서비스 금액 일정 퍼센트 적립</strong>
                                        <span>결제완료 시 적립금 결제를 제외한 금액 기준으로 자동 적립됩니다.</span>
                                    </div>
                                </StyledPolicyOption>
                                {pointSettingsDraft.enableServiceRate && (
                                    <StyledPolicyBody>
                                        <StyledRateRow>
                                            <label htmlFor="point-service-rate">적립 퍼센트</label>
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
                                            <em>%</em>
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
                                        <strong>충전하는 방식</strong>
                                        <span>고객별 적립/차감으로 직접 충전하고 관리합니다.</span>
                                    </div>
                                </StyledPolicyOption>
                            </StyledPolicyBlock>
                        </StyledPolicyOptions>
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
                    {pointSettingsDraft.enableRecharge && (
                        <StyledPolicyCard>
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
                                        <StyledRechargeField htmlFor={`point-recharge-${index}-base`}>
                                            <span>기준금액</span>
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
                                            <span>추가금</span>
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
            )}
        </StyledWrap>
    );
};

const StyledWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledStickyHeader = styled.div`
    position: sticky;
    top: 0;
    z-index: 12;
    margin: 0 -10px;
    padding: 10px 10px;
    border-bottom: 1px solid var(--light-gray-color);
    backdrop-filter: var(--sticky-backdrop);
`;


const StyledTopBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledTotalBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 14px;
    }
`;

const StyledSearchRow = styled.div``;

const StyledTabRow = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overscroll-behavior: auto;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        overflow-x: visible;
    }
`;

const StyledTabButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    flex-shrink: 0;
    min-width: 72px;
    border: 1px solid ${(props) => props.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    background: ${(props) => props.$active ? 'rgba(45, 127, 249, 0.1)' : 'var(--white-color)'};
    color: ${(props) => props.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(props) => props.$active ? 700 : 500};
`;

const StyledHistorySection = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: rgba(248, 250, 252, 0.88);
`;

const StyledHistoryHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;

    div {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    strong {
        font-size: 14px;
        color: var(--black-color);
    }

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
        line-height: 1.45;
    }

    em {
        flex-shrink: 0;
        font-style: normal;
        font-size: 12px;
        font-weight: 600;
        color: var(--blue-color);
        white-space: nowrap;
    }
`;

const StyledHistoryCustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledHistoryCustomerCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
`;

const StyledHistoryCustomerHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    div {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        @media (max-width: 640px) {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
        }
    }

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }
`;

const StyledHistoryPoint = styled.strong`
    flex-shrink: 0;
    font-size: 15px;
    color: var(--blue-color);
`;

const StyledHistoryList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const StyledHistoryItem = styled.li<{$clickable?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--gray-color2);
    cursor: ${(p) => p.$clickable ? 'pointer' : 'default'};

    ${(p) => p.$clickable && `
        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: var(--light-gray-color);
            }
        }
    `}
`;

const StyledHistoryTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    strong {
        font-size: 12px;
        color: var(--dark-gray-color);
    }

    span {
        font-size: 12px;
        font-weight: 700;
        color: var(--blue-color);
    }
`;

const StyledHistoryMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledHistoryEmpty = styled.div`
    padding: 12px 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

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

    span, em, label {
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
        grid-template-columns: minmax(0, 1fr) 16px minmax(0, 1fr);
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
    border-radius: 8px;
    background: var(--white-color);

    @media (max-width: 860px) {
        grid-template-columns: 1fr;
    }
`;

const StyledCustomerMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    span {
        color: var(--dark-gray-color2);
        font-size: 12px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
    }
`;

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledCustomerNameButton = styled.button`
    width: fit-content;
    padding: 0;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 700;
    color: var(--black-color);
    text-align: left;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
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
`;
