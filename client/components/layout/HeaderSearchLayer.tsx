import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {formatTel} from '../../utils/customers';
import {formControlStyle} from '../ui/FormControls';
import {scrollHintStyle, scrollContentStyle} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';

interface Props {
    onClose: () => void;
}

export const HeaderSearchLayer = ({onClose}: Props) => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);

    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRoot = document.getElementById('modal-root');

    const customers = Object.values(customerMap).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    const filtered = query.trim()
        ? customers.filter((c) => c.name.includes(query) || c.tel.includes(query))
        : customers;

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSelect = (id: number) => {
        openCustomerDetail(id);
        onClose();
    };

    if (!modalRoot) return null;

    return createPortal(
        <StyledSearchOverlay onClick={onClose}
                             role="dialog"
                             aria-modal="true"
                             aria-label="고객 검색">
            <StyledSearchModal onClick={(e) => e.stopPropagation()}>
                <StyledSearchHeader>
                    <StyledSearchInput ref={inputRef}
                                       type="search"
                                       autoComplete="off"
                                       placeholder="고객명 또는 연락처 검색"
                                       value={query}
                                       onChange={(e) => setQuery(e.target.value)} />
                    <CloseIconButton onClick={onClose} />
                </StyledSearchHeader>
                <StyledResultListWrap><StyledResultList>
                    {query.trim() && filtered.length === 0 ? (
                        <StyledNoResult>검색 결과 없음</StyledNoResult>
                    ) : (
                        filtered.map((c) => (
                            <StyledResultItem key={c.id}
                                              onClick={() => handleSelect(c.id)}>
                                <span>{c.name}</span>
                                <span>{formatTel(c.tel)}</span>
                            </StyledResultItem>
                        ))
                    )}
                </StyledResultList></StyledResultListWrap>
            </StyledSearchModal>
        </StyledSearchOverlay>,
        modalRoot
    );
};

const StyledSearchOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-color: rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
`;

const StyledSearchModal = styled.div`
    width: 100%;
    max-width: 400px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background-color: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
`;

const StyledSearchHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledSearchInput = styled.input`
    flex: 1;
    ${formControlStyle};
    padding: 0 10px;

    &[type="search"]::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        margin-right: 4px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23999'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat center / contain;
    }
`;

const StyledResultListWrap = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

const StyledResultList = styled.ul`
    ${scrollContentStyle};
    padding: 4px 0 30px;
    list-style: none;
`;

const StyledResultItem = styled.li`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;

    > span:last-child {
        font-size: 12px;
        color: var(--gray-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

const StyledNoResult = styled.li`
    padding: 24px;
    font-size: 13px;
    color: var(--gray-color);
    text-align: center;
`;
