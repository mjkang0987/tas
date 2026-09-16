import Link from 'next/link';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {ViewType} from '../../utils/constants';

// 모바일 캘린더 상단 세그먼트 뷰 탭. aside의 뷰 전환(setChangeView/setAsPath) 로직을 그대로 재사용.
// 3일(three) 뷰는 모바일 탭에서 제외(일·주·월·년 4종).
const VIEW_TABS: Array<{ type: string; label: string }> = [
    {type: ViewType.Day, label: '일'},
    {type: ViewType.Week, label: '주'},
    {type: ViewType.Month, label: '월'},
    {type: ViewType.Year, label: '년'},
];

function todayMidnight(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// aside.setAsPath 와 동일 — 뷰별 URL 세그먼트 생성.
function buildViewPath(type: string): (string | number)[] {
    const routeDate = todayMidnight();

    if (type === ViewType.Week) {
        routeDate.setDate(routeDate.getDate() - routeDate.getDay());
    }

    const result: (string | number)[] = [type, routeDate.getFullYear()];

    if (type !== ViewType.Year) {
        result.push(routeDate.getMonth() + 1);
    }

    if (type === ViewType.Day || type === ViewType.Week || type === ViewType.Three) {
        result.push(routeDate.getDate());
    }

    return result;
}

export const MobileViewTabs = () => {
    const view = useCalendarStore((s) => s.view);
    const setView = useCalendarStore((s) => s.setView);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);

    const changeView = (type: string) => {
        setView({type});

        const today = todayMidnight();
        if (type === ViewType.Week) {
            today.setDate(today.getDate() - today.getDay());
        }
        setCurr(today);
    };

    return (
        <StyledSegment role="tablist" aria-label="캘린더 보기 전환">
            {VIEW_TABS.map((tab) => (
                <StyledSegmentTab key={tab.type}
                                  href={`/${buildViewPath(tab.type).join('/')}`}
                                  role="tab"
                                  aria-selected={view.type === tab.type}
                                  $active={view.type === tab.type}
                                  onClick={() => changeView(tab.type)}>
                    {tab.label}
                </StyledSegmentTab>
            ))}
        </StyledSegment>
    );
};

// 데스크톱 숨김, 모바일에서만 노출.
const StyledSegment = styled.div`
    display: none;

    @media (max-width: 640px) {
        display: flex;
        gap: 2px;
        /* 헤더가 좌우 10px 대칭 패딩을 주므로 콘텐츠 폭을 그대로 채워 행과 정렬 */
        width: 100%;
        margin: 2px 0 6px;
        padding: 3px;
        box-sizing: border-box;
        background-color: var(--gray-color2);
        /* 앱의 세그먼트 컨트롤과 모서리를 맞춘다 — 같은 위치·역할인데 한쪽만 각져 보였다.
           (앱은 .pickerStyle(.segmented) 단독이라 실제 모양은 실행 중인 OS 가 정한다.
            2026-09 iOS 26 시뮬레이터 대조 기준.) */
        border-radius: var(--chip-radius);
    }
`;

const StyledSegmentTab = styled(Link)<{ $active: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7px 0;
    /* 트랙이 캡슐이므로 선택 표시도 캡슐이어야 안쪽 여백(3px)과 나란히 맞는다. */
    border-radius: var(--chip-radius);
    font-size: var(--small-font);
    font-weight: 700;
    text-decoration: none;
    color: ${(props) => props.$active ? 'var(--brand-color)' : 'var(--dark-gray-color)'};
    background-color: ${(props) => props.$active ? 'var(--white-color)' : 'transparent'};
    box-shadow: ${(props) => props.$active ? 'var(--shadow-sm)' : 'none'};
    transition: background-color 0.15s, color 0.15s;
`;
