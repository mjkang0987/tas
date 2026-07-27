import Link from 'next/link';

import styled from 'styled-components';

export const StyledAside = styled.aside<{ $isVisible: boolean }>`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: ${props => props.$isVisible ? 'auto' : '0'};
    min-height: 0;
    overflow: hidden;
    background-color: var(--aside-bg);
    transition: width 0.25s ease;
    box-sizing: border-box;

    @media (max-width: 640px) {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        /* 모달 대역(OVERLAY_Z_INDEX 100~190)보다 아래에 둔다.
           드로어 안에서 여는 모달(예: 게스트 로그아웃 확인)이 가려지지 않도록.
           페이지 콘텐츠(최대 z-index ~50)는 계속 덮는다. */
        z-index: 99;
        width: ${props => props.$isVisible ? 'auto' : '0'};
        box-shadow: ${props => props.$isVisible ? 'var(--shadow-md)' : 'none'};
        padding-left: 8px;
    }
`;

export const StyledBrandLink = styled(Link)`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 10px;
    min-width: var(--aside-width);
    box-sizing: border-box;
    font-size: 16px;
    font-weight: 700;
    color: var(--aside-text);
    letter-spacing: 1px;
    white-space: nowrap;
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

export const StyledBrandLogo = styled.img`
    height: 30px;
    width: auto;
    display: block;
`;

export const StyledGuestInfo = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 0 10px 10px;
    width: var(--aside-width);
    box-sizing: border-box;
`;

export const StyledStoreNameLink = styled(Link)`
    flex-shrink: 0;
    padding: 0 10px 6px;
    width: var(--aside-width);
    box-sizing: border-box;
    font-size: 11px;
    font-weight: 500;
    color: var(--aside-text);
    opacity: 0.6;
    word-break: break-all;
    line-height: 1.4;
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

export const StyledUserInfoLink = styled(Link)`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px 10px;
    width: var(--aside-width);
    box-sizing: border-box;
    border-bottom: 1px solid var(--aside-divider);
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

export const StyledUserName = styled.span`
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--aside-text);
    word-break: break-all;
    line-height: 1.4;
`;

export const StyledUserEmail = styled.span`
    font-size: 11px;
    color: var(--aside-text);
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const StyledScrollArea = styled.div`
    display: flex;
    flex-direction: column;
    min-width: var(--aside-width);
    height: 100%;
    overflow-y: auto;
`;

export const StyledNav = styled.nav`
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 2px;
    padding: 8px 10px 0 0;
    box-sizing: border-box;
`;

export const StyledDivider = styled.hr`
    border: none;
    border-top: 1px solid var(--aside-divider);
    margin: 8px 0;
`;

export const StyledNavLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 36px;
    flex-shrink: 0;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: ${(props) => props.$active ? 'var(--brand-color)' : 'transparent'};
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: ${(props) => props.$active ? 'var(--white-color)' : 'var(--aside-text)'};
    white-space: nowrap;
    opacity: ${(props) => props.$active ? 1 : 0.8};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

export const StyledMenuContent = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

export const StyledCreateButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 36px;
    flex-shrink: 0;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: var(--white-color);
    white-space: nowrap;
    transition: opacity 0.1s, filter 0.1s;

    span {
        color: var(--white-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            filter: brightness(1.18);
        }
    }
`;

export const StyledAccordionToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 36px;
    flex-shrink: 0;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    color: var(--aside-text);
    white-space: nowrap;
    transition: opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            filter: brightness(1.18);
        }
    }
`;

export const StyledAccordionContent = styled.div<{ $open: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
    max-height: ${props => props.$open ? '640px' : '0'};
    transition: max-height 0.2s ease;
`;

export const StyledSubNavLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 32px;
    flex-shrink: 0;
    padding: 0 8px 0 20px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: ${(props) => props.$active ? 'var(--brand-color)' : 'var(--aside-text)'};
    white-space: nowrap;
    opacity: ${(props) => props.$active ? 1 : 0.8};
    background-color: ${(props) => props.$active ? 'var(--brand-color)' : 'transparent'};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s, filter 0.1s;

    ${StyledMenuContent} {
        color: ${(props) => props.$active ? 'var(--white-color)' : 'inherit'};
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

export const StyledLogoutButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 10px;
    min-height: 36px;
    flex-shrink: 0;
    border: none;
    text-align: left;
    border-radius: var(--radius-md);
    background-color: transparent;
    box-sizing: border-box;
    font-size: var(--small-font);
    font-weight: 500;
    color: var(--aside-text);
    text-decoration: none;
    white-space: nowrap;
    opacity: 0.7;
    transition: background-color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

export const StyledHelpButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 10px;
    min-height: 36px;
    flex-shrink: 0;
    border: none;
    text-align: left;
    border-radius: var(--radius-md);
    background-color: transparent;
    box-sizing: border-box;
    font-size: var(--small-font);
    font-weight: 500;
    color: var(--aside-text);
    text-decoration: none;
    white-space: nowrap;
    opacity: 0.7;
    transition: background-color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

export const StyledInquiryLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 10px;
    min-height: 36px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    box-sizing: border-box;
    font-size: var(--small-font);
    font-weight: 500;
    color: ${(p) => p.$active ? 'var(--white-color)' : 'var(--aside-text)'};
    background-color: ${(p) => p.$active ? 'var(--brand-color)' : 'transparent'};
    text-decoration: none;
    white-space: nowrap;
    opacity: ${(p) => p.$active ? 1 : 0.7};
    transition: background-color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

export const StyledToggleIcon = styled.span<{ $collapsed: boolean }>`
    display: inline-flex;
    width: 16px;
    height: 16px;
    transform: ${props => props.$collapsed ? 'rotate(90deg)' : 'rotate(270deg)'};
    transition: transform 0.2s;
    flex-shrink: 0;
`;

export const StyledToggleSvg = styled.svg`
    width: 100%;
    height: 100%;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

export const StyledLegalLinks = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    flex-shrink: 0;
    padding: 6px 10px 2px;
    font-size: var(--tiny-font);
`;

export const StyledLegalLink = styled(Link)`
    color: var(--aside-text);
    text-decoration: none;
    opacity: 0.55;
    white-space: nowrap;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.9; text-decoration: underline; }
    }
`;
