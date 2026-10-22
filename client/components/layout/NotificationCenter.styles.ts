import styled from 'styled-components';

import {LabelBadge} from '../ui/LabelBadge';

import {StyledBadge, StyledEmpty, StyledModalDetail, StyledSectionLabel} from './NaverSyncNotification.styles';

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

/** 칸 제목 — 목록 줄(연한 파랑)과 구분되게 회색 띠 + 진한 글씨. 스크롤해도 위에 붙어 있다. */
export const StyledSectionHead = styled(StyledSectionLabel)`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    font-size: var(--small-font);
    color: var(--black-color);
    letter-spacing: 0;
    background: var(--gray-color2);
    border-top: 1px solid var(--light-gray-color);
    border-bottom: 1px solid var(--light-gray-color);
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
    text-align: left;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            text-decoration: underline;
            text-underline-offset: 2px;
        }
    }
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

/** '15분 후' — 네이버 줄의 태그(StyledNaverTag)와 같은 크기, 보라(곧 시작 점과 같은 색). */
export const StyledUntilTag = styled(LabelBadge).attrs({
    $tone: 'purple',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: var(--tiny-font);
`;

/** 칸 제목 옆 건수 — 처리할 것만 센다. */
export const StyledSectionCount = styled.span`
    margin-left: 2px;
    color: var(--brand-color);
`;

/**
 * 알림 종류 탭 — 네이티브 라디오(숨김 .a11y) + 라벨. 캘린더 보기 탭(MobileViewTabs)과 같은 세그먼트 모양:
 * 회색 트랙 위 고른 칸만 흰 바탕. 건수는 빨간 배지 대신 글자 옆 숫자로 조용히.
 */
export const StyledTabs = styled.fieldset`
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    min-width: 0; /* fieldset 기본 min-width:min-content 라 안 줄면 가로 스크롤 대신 시트 밖으로 넘친다 */
    margin: 10px 12px;
    padding: 3px;
    border: 0;
    border-radius: var(--chip-radius);
    background-color: var(--gray-color2);
    overflow-x: auto;
    scrollbar-width: none;
`;

export const StyledTab = styled.label<{$active: boolean}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex: 1 0 auto;
    min-height: 30px;
    padding: 0 10px;
    border-radius: var(--chip-radius);
    background-color: ${({$active}) => $active ? 'var(--white-color)' : 'transparent'};
    box-shadow: ${({$active}) => $active ? 'var(--shadow-sm)' : 'none'};
    color: ${({$active}) => $active ? 'var(--brand-color)' : 'var(--dark-gray-color)'};
    font-size: var(--small-font);
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;

    &:has(.a11y:focus-visible) {
        outline: 2px solid var(--brand-color);
        outline-offset: 1px;
    }
`;

export const StyledTabCount = styled.span`
    font-weight: 600;
    opacity: 0.7;
`;

/** 알림 레이어 — 탭이 한 줄에 들어가게 데스크톱 폭만 조금 넓힌다(휴대폰 시트는 ModalStyles 가 전체 폭으로 덮는다). */
export const StyledCenterDetail = styled(StyledModalDetail).attrs({$width: 480})`
    max-width: min(480px, 92vw);
`;
