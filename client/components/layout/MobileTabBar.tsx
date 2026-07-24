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

// 데스크톱에선 숨기고 모바일(≤640px)에서만 하단 고정 탭바로 노출.
// LayoutComponent의 StyledContent 플렉스 자식이라 Main(내부 스크롤) 아래에 자연히 붙는다.
const StyledTabBar = styled.nav`
    display: none;

    @media (max-width: 640px) {
        flex-shrink: 0;
        display: flex;
        align-items: stretch;
        background-color: var(--white-color);
        border-top: 1px solid var(--light-gray-color);
        /* 상하 여백 균형(각 8px) — 하단은 홈 인디케이터(safe-area)까지 탭바 색으로 채움 */
        padding-top: 8px;
        padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
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
    padding: 4px 0;
    text-decoration: none;
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
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: inherit;
`;
