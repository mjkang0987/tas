import Link from 'next/link';
import {useRouter} from 'next/router';

import styled from 'styled-components';

import {isCalendar} from '../../utils/router';
import {AsideMenuIcon} from './AsideMenuIcon';

type TabKey = 'calendar' | 'customers' | 'revenue' | 'settings';

interface TabDef {
    key: TabKey;
    label: string;
    href: string;
    icon: string;
}

// 아이콘은 기존 웹앱(AsideMenuIcon) 재사용
const TABS: TabDef[] = [
    {key: 'calendar', label: '캘린더', href: '/', icon: 'calendarManage'},
    {key: 'customers', label: '고객', href: '/address', icon: 'customers'},
    {key: 'revenue', label: '매출', href: '/settings/revenue', icon: 'revenue'},
    {key: 'settings', label: '설정', href: '/menu', icon: 'settings'},
];

function resolveActiveTab(pathname: string, asPath: string, tabQuery: string): TabKey | null {
    const segments = asPath.split('?')[0].split('/');
    const isRoot = segments.join('').length === 0;

    if (isRoot || isCalendar(segments)) return 'calendar';
    if (pathname === '/address') return 'customers';
    // 매출은 설정의 한 탭(/settings/revenue)이지만 하단 탭에선 독립 항목
    if ((pathname === '/settings' || pathname === '/settings/[tab]') && tabQuery === 'revenue') return 'revenue';
    if (pathname === '/menu'
        || pathname === '/mypage'
        || pathname === '/inquiry'
        || pathname === '/settings'
        || pathname === '/settings/[tab]') {
        return 'settings';
    }
    return null;
}

export const MobileTabBar = () => {
    const router = useRouter();
    const tabQuery = typeof router.query.tab === 'string' ? router.query.tab : '';
    const active = resolveActiveTab(router.pathname, router.asPath, tabQuery);

    return (
        <StyledTabBar aria-label="모바일 하단 내비게이션">
            {TABS.map((tab) => (
                <StyledTab key={tab.key}
                           href={tab.href}
                           $active={active === tab.key}
                           aria-current={active === tab.key ? 'page' : undefined}>
                    <AsideMenuIcon icon={tab.icon} />
                    <StyledTabLabel>{tab.label}</StyledTabLabel>
                </StyledTab>
            ))}
        </StyledTabBar>
    );
};

// 데스크톱에선 숨기고 모바일(≤640px)에서만 노출.
// LayoutComponent의 StyledMainArea(포지셔닝 기준) 안에서 콘텐츠 위에 떠 있는다.
// 그 영역이 광고 배너 위에서 끝나므로, 아래 bottom 값은 광고 높이를 알 필요가 없다.
// 광고보다 위에 두는 이유 — 반투명 뒤로 예약 카드가 비쳐야 유리 느낌이 산다.
// 광고 위에 띄우면 흰 배경만 비치고, 광고를 가려 조회가능성 문제도 생긴다.
const StyledTabBar = styled.nav`
    display: none;

    @media (max-width: 640px) {
        flex-shrink: 0;
        display: flex;
        align-items: stretch;
        /* 흐름 자식으로 두고 여백으로 띄운다. 콘텐츠 위에 겹치지 않으므로
           스크롤이 없는 화면(월 캘린더는 overflow:hidden 이다)에서도 무엇을 가리지 않는다. */
        margin: 0 12px max(env(safe-area-inset-bottom, 0px), 10px);
        padding: 4px;
        box-sizing: border-box;
        border-radius: var(--chip-radius);
        background-color: var(--glass-bg);
        border: 1px solid var(--white-color-60);
        box-shadow: var(--shadow-md);
        z-index: 40;
    }
`;

const StyledTab = styled(Link)<{ $active: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    /* 상하 여백을 탭바가 아니라 링크가 갖는다 — 여백까지 탭 영역.
       탭바가 화면 가장자리에서 떨어져 떠 있으므로 safe-area는 여기서 받지 않는다
       (이제 맨 아래에 놓이는 광고 배너가 받는다). */
    padding-top: 8px;
    padding-bottom: 8px;
    text-decoration: none;
    /* 선택 알약이 탭바의 둥근 모서리를 넘지 않게 한다. */
    border-radius: var(--chip-radius);
    background-color: ${(props) => props.$active ? 'var(--brand-color-bg)' : 'transparent'};
    color: ${(props) => props.$active ? 'var(--brand-color)' : 'var(--dark-gray-color2)'};

    svg {
        width: 22px;
        height: 22px;
        stroke-width: ${(props) => props.$active ? 2.1 : 1.8};
    }

    &:active {
        opacity: 0.6;
    }
`;

const StyledTabLabel = styled.span`
    font-size: var(--tiny-font);
    font-weight: 700;
    line-height: 1;
    color: inherit;
`;
