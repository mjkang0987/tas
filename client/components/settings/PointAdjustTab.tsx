import {type Dispatch, type SetStateAction} from 'react';

import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import {formatPrice} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';
import {EMPTY_TEXT, StyledEmpty} from './settings-styles';

interface Props {
    filteredCustomers: Customer[];
    search: string;
    setSearch: (v: string) => void;
    amountByCustomer: Record<number, string>;
    setAmountByCustomer: Dispatch<SetStateAction<Record<number, string>>>;
    applyPoints: (id: number, dir: 'add' | 'subtract') => void;
    openCustomerDetail: (id: number) => void;
}

export const PointAdjustTab = ({filteredCustomers, search, setSearch, amountByCustomer, setAmountByCustomer, applyPoints, openCustomerDetail}: Props) => (
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
            <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
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
);

const StyledSearchRow = styled.div``;

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
