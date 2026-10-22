import styled from 'styled-components';

import {StyledBadge, StyledEmpty, StyledPanel, StyledSectionLabel} from './NaverSyncNotification.styles';

// 알림 종 하나(NotificationCenter) — 벨·패널 기본 모양은 예전 네이버 벨(NaverSyncNotification.styles)을 그대로 쓴다.

/** 곧 시작하는 예약만 있을 때의 보라 점 — 숫자 배지 자리. */
export const StyledDot = styled(StyledBadge)`
    top: 6px;
    right: 6px;
    min-width: 8px;
    width: 8px;
    height: 8px;
    padding: 0;
    background: var(--brand-color);
`;

export const StyledCenterPanel = styled(StyledPanel)`
    width: 360px;
    max-height: min(560px, calc(100dvh - 120px));

    /* 휴대폰: 종 아래 말풍선은 화면 왼쪽으로 잘린다 — 화면 폭에 맞춰 띄운다. */
    @media (max-width: 640px) {
        position: fixed;
        top: var(--notification-panel-top, 96px);
        left: 8px;
        right: 8px;
        width: auto;
        margin-top: 0;
        max-height: calc(100dvh - var(--notification-panel-top, 96px) - 72px);
    }
`;

export const StyledSectionHead = styled(StyledSectionLabel)`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

export const StyledSectionTitle = styled.h3`
    margin: 0;
    font: inherit;
`;

export const StyledSectionActions = styled.span`
    display: inline-flex;
    gap: 12px;
`;

export const StyledSectionAction = styled.button`
    background: none;
    border: none;
    padding: 0;
    color: var(--blue-color);
    font-size: var(--xsmall-font);
    font-weight: 600;
`;

export const StyledSectionList = styled.div`
    padding: 6px 8px 2px;
`;

export const StyledSectionEmpty = styled(StyledEmpty)`
    padding: 14px 12px;
`;

export const StyledPlainItem = styled.div<{$done?: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 4px;
    border-radius: var(--radius-md);
    background-color: ${({$done}) => $done ? 'transparent' : 'var(--notification-unread-bg)'};
    opacity: ${({$done}) => $done ? 0.6 : 1};
`;

export const StyledItemMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    font-size: var(--small-font);
    color: var(--black-color);
`;

export const StyledItemTop = styled.span`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
`;

export const StyledItemSub = styled.span`
    color: var(--dark-gray-color2);
    font-size: var(--xsmall-font);
`;

export const StyledNameButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
`;

export const StyledStrong = styled.span`
    font-weight: 700;
`;

export const StyledCallLink = styled.a`
    flex-shrink: 0;
    padding: 6px 10px;
    border: 1px solid var(--gray-color2);
    border-radius: var(--radius-md);
    color: var(--black-color);
    font-size: var(--xsmall-font);
    font-weight: 600;
    text-decoration: none;
    background: var(--white-color);
`;

export const StyledCheckLabel = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    min-height: 32px;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
    cursor: pointer;
`;
