import {useState, useRef, useEffect} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';
import Link from 'next/link';

import {useCalendarStore} from '../../store/calendarStore';

import {Icon} from '../ui/Icons';
import {ButtonText} from '../ui/ButtonText';

export const Footer = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <StyledFooter>
            <StyledSearchButton type="button" onClick={() => setIsSearchOpen(true)}>
                <Icon iconType="search"/>
                <ButtonText a11y={false}>고객검색</ButtonText>
            </StyledSearchButton>
            <StyledFooterLink href="/address">고객명단</StyledFooterLink>
            <StyledFooterLink href="/settings">설정</StyledFooterLink>
            {isSearchOpen && <SearchLayer onClose={() => setIsSearchOpen(false)}/>}
        </StyledFooter>
    );
};

const SearchLayer = ({onClose}: { onClose: () => void }) => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);

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
        setSelectedCustomerId(id);
        onClose();
    };

    if (!modalRoot) return null;

    return createPortal(
        <StyledOverlay onClick={onClose}
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
                                       onChange={(e) => setQuery(e.target.value)}/>
                    <button type="button" onClick={onClose} aria-label="닫기">&#x2715;</button>
                </StyledSearchHeader>
                <StyledResultList>
                    {query.trim() && filtered.length === 0 ? (
                        <StyledNoResult>검색 결과 없음</StyledNoResult>
                    ) : (
                        filtered.map((c) => (
                            <StyledResultItem key={c.id} onClick={() => handleSelect(c.id)}>
                                <span>{c.name}</span>
                                <span>{c.tel}</span>
                            </StyledResultItem>
                        ))
                    )}
                </StyledResultList>
            </StyledSearchModal>
        </StyledOverlay>,
        modalRoot
    );
};

const StyledFooter = styled.footer`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    height: 48px;
    box-sizing: border-box;
    border-top: solid 1px var(--light-gray-color);
    background-color: var(--white-color);
    flex-shrink: 0;
`;

const navItemStyle = `
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    height: 32px;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color 0.1s;
    color: var(--dark-gray-color);

    &:hover {
        background-color: var(--gray-color2);
        color: var(--black-color);
    }
`;

const StyledSearchButton = styled.button`
    ${navItemStyle}
    background-color: transparent;
    border: none;
`;

const StyledFooterLink = styled(Link)`
    ${navItemStyle}
    text-decoration: none;
`;

const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
`;

const StyledSearchModal = styled.div`
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const StyledSearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--light-gray-color);

  > button {
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    color: var(--dark-gray-color);
  }
`;

const StyledSearchInput = styled.input`
  flex: 1;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--light-gray-color);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--blue-color);
  }

  &[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23999'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat center / contain;
    cursor: pointer;
  }
`;

const StyledResultList = styled.ul`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: auto;
  padding: 4px 0;
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

  &:hover {
    background-color: var(--black-color-10);
  }
`;

const StyledNoResult = styled.li`
  padding: 24px;
  font-size: 13px;
  color: var(--gray-color);
  text-align: center;
`;
