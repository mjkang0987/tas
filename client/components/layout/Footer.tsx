import {useState, useRef, useEffect} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';
import Link from 'next/link';

import {useCalendarStore} from '../../store/calendarStore';
import {scrollHintStyle, scrollContentStyle} from '../calendar/overlays/ModalStyles';
import {formControlStyle} from '../ui/FormControls';

import {ButtonText} from '../ui/ButtonText';
import {CloseIconButton} from '../ui/CloseIconButton';

export const Footer = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <StyledFooter>
            <StyledSearchButton type="button" onClick={() => setIsSearchOpen(true)}>
                <FooterIcon icon="search"/>
                <ButtonText a11y={false}>고객검색</ButtonText>
            </StyledSearchButton>
            <StyledFooterLink href="/settings/revenue">
                <FooterIcon icon="settings"/>
                <span>설정</span>
            </StyledFooterLink>
            {isSearchOpen && <SearchLayer onClose={() => setIsSearchOpen(false)}/>}
        </StyledFooter>
    );
};

const FooterIcon = ({icon}: { icon: 'search' | 'settings' }) => {
    if (icon === 'search') {
        return (
            <StyledFooterIcon viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="5.5" />
                <path d="M15.2 15.2L19 19" />
            </StyledFooterIcon>
        );
    }

    return (
        <StyledFooterIcon viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.84V20.99A2 2 0 1 1 10.08 20.99V20.9A1.65 1.65 0 0 0 9 19.39A1.65 1.65 0 0 0 7.18 19.72L7.12 19.78A2 2 0 1 1 4.29 16.95L4.35 16.89A1.65 1.65 0 0 0 4.68 15.07A1.65 1.65 0 0 0 3.16 14.07H3.01A2 2 0 1 1 3.01 10.07H3.1A1.65 1.65 0 0 0 4.61 9A1.65 1.65 0 0 0 4.28 7.18L4.22 7.12A2 2 0 1 1 7.05 4.29L7.11 4.35A1.65 1.65 0 0 0 8.93 4.68A1.65 1.65 0 0 0 9.93 3.16V3.01A2 2 0 1 1 13.93 3.01V3.1A1.65 1.65 0 0 0 15 4.61A1.65 1.65 0 0 0 16.82 4.28L16.88 4.22A2 2 0 1 1 19.71 7.05L19.65 7.11A1.65 1.65 0 0 0 19.32 8.93A1.65 1.65 0 0 0 20.84 9.93H20.99A2 2 0 1 1 20.99 13.93H20.9A1.65 1.65 0 0 0 19.39 15Z" />
        </StyledFooterIcon>
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
                    <CloseIconButton onClick={onClose} />
                </StyledSearchHeader>
                <StyledResultListWrap><StyledResultList>
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
                </StyledResultList></StyledResultListWrap>
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

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--gray-color2);
        color: var(--black-color);
    }
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

const StyledFooterIcon = styled.svg`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
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

  > button:not([class]) {
    min-width: 44px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
      background-color: var(--black-color-10);
    }
    }
  }
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
