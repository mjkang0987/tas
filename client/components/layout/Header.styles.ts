import styled, {keyframes} from 'styled-components';

import {formControlStyle} from '../ui/FormControls';

const conflictSlideIn = keyframes`
    from { transform: translate(0, -8px); opacity: 0; }
    to   { transform: translate(0, 0);    opacity: 1; }
`;

export const StyledConflictBanner = styled.button`
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 4px;
    width: calc(100% - 8px);
    box-sizing: border-box;
    padding: 8px 14px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-lg);
    background: var(--danger-bg);
    color: var(--danger-color);
    box-shadow: var(--shadow-md);
    font-size: var(--small-font);
    cursor: pointer;
    text-align: left;
    animation: ${conflictSlideIn} 0.18s ease;

    .count { font-weight: 700; }

    .cta {
        font-weight: 600;
        white-space: nowrap;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { filter: brightness(0.97); }
    }

    @media (max-width: 640px) {
        top: 100px;
    }
`;

export const StyledHeader = styled.header<{ $stack?: boolean }>`
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    padding: 0 12px 0 0;
    min-height: 48px;
    box-sizing: border-box;
    background-color: var(--white-color);
    border-bottom: solid 1px var(--light-gray-color);
    flex-shrink: 0;
    @media (max-width: 640px) {
        /* 캘린더는 세로 스택(행 겹침 방지 — flex-wrap+flex:1 충돌 회피),
           비캘린더(타이틀+검색 한 줄)는 가로 유지. */
        flex-direction: ${(props) => props.$stack ? 'column' : 'row'};
        align-items: ${(props) => props.$stack ? 'stretch' : 'center'};
        gap: ${(props) => props.$stack ? '0' : '4px'};
        /* 상단 여백 + 실기기 노치(safe-area) 대응, 좌우 대칭 10px(＋예약이 우측 끝에 붙지 않게) */
        padding: max(env(safe-area-inset-top, 0px), 8px) 10px 2px;
    }
`;

export const StyledCalendarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
        width: 100%;
        flex: none;
        padding: 3px 0 5px;
    }
`;

export const StyledToolRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;

    @media (max-width: 640px) {
        width: 100%;
        padding: 4px 0;
    }
`;

export const StyledAsideToggle = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    .menu-label { display: none; }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    /* 모바일은 하단 탭바의 '설정'(→/menu)이 사이드바를 대체하므로 플로팅 토글을 숨긴다. */
    @media (max-width: 640px) {
        display: none;
    }
`;

// 모바일 캘린더 헤더 우측 고정 '＋예약' 버튼. 데스크톱은 aside의 예약추가를 쓰므로 숨김.
export const StyledMobileAddPill = styled.button`
    display: none;

    @media (max-width: 640px) {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
        margin-left: auto;
        padding: 7px 13px 7px 9px;
        border: none;
        border-radius: 999px;
        background-color: var(--brand-color);
        color: var(--white-color);
        font-size: var(--small-font);
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(101, 38, 217, 0.28);
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

export const StyledAsideToggleLabel = styled.span`
    font-size: var(--tiny-font);
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
`;

export const StyledPageTitle = styled.h1`
    flex: 1;
    margin: 0;
    font-size: var(--big-font);
    font-weight: 700;
    text-align: center;
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        text-align: left;
    }
`;

export const StyledAssigneeFilter = styled.select`
    min-width: 128px;
    margin-right: auto;
    ${formControlStyle};
    /* appearance 2단 선언: base-select 미지원 브라우저(Safari·Firefox)는 이 줄을 버리고 none을 유지한다.
       덕분에 어디서도 네이티브 화살표가 남지 않아 아래 SVG 화살표만 보인다. */
    appearance: none;
    appearance: base-select;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 28px 0 8px;
    cursor: pointer;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;

    @media (max-width: 640px) {
        min-width: 96px;
        margin-left: 0;
        padding: 0 26px 0 6px;
        background-position: right 8px center;
    }

    selectedcontent {
        display: inline-flex;
        align-items: center;
        min-width: 0;
    }

    /* Chrome(base-select)이 그리는 기본 화살표는 감추고 위 SVG로 통일 */
    &::picker-icon {
        display: none;
    }

    &::picker(select) {
        appearance: base-select;
        min-width: anchor-size(width);
        margin-top: 6px;
        padding: 6px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        background: var(--white-color);
        box-shadow: var(--shadow-md);
    }

    option {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background-color 0.12s ease;

        &::checkmark {
            display: none;
        }

        &[data-bg-color]::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            flex-shrink: 0;
            border-radius: 50%;
            background-color: attr(data-bg-color type(<color>), transparent);
        }
    }

    option:hover,
    option:focus {
        background: var(--gray-color2);
    }

    option:checked {
        background: var(--brand-color-bg);
        font-weight: 600;
    }

    optgroup {
        padding-top: 6px;
        font-size: var(--tiny-font);
        font-weight: 700;
        color: var(--dark-gray-color2);
    }
`;

export const StyledSyncWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

export const StyledSyncToast = styled.span`
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-md);
    background-color: var(--black-color);
    color: var(--white-color);
    font-size: var(--tiny-font);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
`;

export const StyledSyncButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    &:disabled {
        cursor: default;
        opacity: 0.5;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(:disabled):hover {
            background-color: var(--gray-color2);
        }
    }
`;

export const StyledSyncIcon = styled.svg<{ $syncing: boolean }>`
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    ${(props) => props.$syncing && 'animation: spin 1s linear infinite;'}
`;

export const StyledCustomerSearchButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }
`;

export const StyledSearchIcon = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

export const StyledTokenExpiredToast = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--toast-bg);
    color: var(--white-color);
    font-size: var(--medium-font);
    box-shadow: var(--modal-shadow);
    z-index: 10000;
    white-space: nowrap;
`;

export const StyledTokenReconnect = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--link-color-light);
    font-size: var(--medium-font);
    font-weight: 600;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

export const StyledTokenClose = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--muted-text);
    font-size: var(--font);
    line-height: 1;
`;
