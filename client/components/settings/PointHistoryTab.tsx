import styled from 'styled-components';

import type {Customer, PointHistoryEntry} from '../../utils/customers';
import {formatTel, POINT_HISTORY_LABELS} from '../../utils/customers';
import {formatPrice} from '../../utils/services';

interface Props {
    customersWithPoints: Customer[];
    handlePointHistoryClick: (entry: PointHistoryEntry) => void;
    openCustomerDetail: (id: number) => void;
}

export const PointHistoryTab = ({customersWithPoints, handlePointHistoryClick, openCustomerDetail}: Props) => (
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
);

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

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;
