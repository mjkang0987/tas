import {useRef, type ComponentPropsWithoutRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent} from 'react';

import styled, {css} from 'styled-components';

// 공개 예약(영화관식) 선택 UI 컴포넌트. 디자인 토큰 준수(색·radius·font 전부 전역 토큰).
// 선택 가능 항목은 채워진 브랜드색, 비활성은 흐리게(마감/휴무/불가) — 좌석 선택 UX.

// 가로 스크롤 줄(디자이너·날짜). 스크롤 스냅으로 셀 단위로 부드럽게 멈춘다.
const StyledScrollRow = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px 2px 8px;
    margin: 0 -2px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scroll-snap-type: x proximity;
    scroll-padding-left: 2px;
    /* 마우스 드래그 스크롤 시 텍스트/셀 선택 방지 + 잡기 커서 */
    user-select: none;
    cursor: grab;
    &:active { cursor: grabbing; }
`;

// 가로 스크롤 줄 + 마우스 드래그(스와이프) 스크롤. 데스크탑에선 휠·스크롤바가 아니라
// 마우스로 끌어 가로 이동할 수 있게 한다. 터치/펜은 네이티브 스크롤을 그대로 쓴다.
// 드래그로 판정되면(임계 넘김) 밑의 날짜·칩 클릭을 억제해 오선택을 막는다.
export function PickerScrollRow({onClick, ...rest}: ComponentPropsWithoutRef<'div'>) {
    const ref = useRef<HTMLDivElement>(null);
    const drag = useRef({active: false, startX: 0, startLeft: 0, moved: false});

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return; // 터치/펜은 네이티브 스크롤
        const el = ref.current;
        if (!el) return;
        drag.current = {active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false};
    };
    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        const el = ref.current;
        if (!d.active || !el) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 4) {
            d.moved = true;
            el.setPointerCapture?.(e.pointerId); // 드래그 확정 후에만 캡처(탭은 그대로 클릭되게)
        }
        el.scrollLeft = d.startLeft - dx;
    };
    const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current.active) return;
        drag.current.active = false;
        ref.current?.releasePointerCapture?.(e.pointerId);
    };
    // 드래그였다면 자식(날짜·칩) 클릭 억제.
    const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
        }
    };

    return (
        <StyledScrollRow
            ref={ref}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onClickCapture={onClickCapture}
            onClick={onClick}
            {...rest}
        />
    );
}

const selectableBase = css<{$on: boolean}>`
    flex: 0 0 auto;
    border: 1px solid ${(p) => (p.$on ? 'var(--brand-color)' : 'var(--light-gray-color)')};
    background: ${(p) => (p.$on ? 'var(--brand-color)' : 'var(--white-color)')};
    color: ${(p) => (p.$on ? 'var(--white-color)' : 'var(--black-color)')};
    cursor: pointer;
    transition: border-color 0.12s ease, background-color 0.12s ease, color 0.12s ease;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

// 단일 선택 알약 칩(디자이너·상관없음)
export const PillChip = styled.button<{$on: boolean}>`
    ${selectableBase};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border-radius: 999px;
    font-size: var(--small-font);
    font-weight: 600;
    white-space: nowrap;
    scroll-snap-align: start;
`;

// 날짜 셀(요일 + 일자)
export const DateCell = styled.button<{$on: boolean; $weekend: boolean}>`
    ${selectableBase};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 52px;
    padding: 8px 6px;
    border-radius: var(--radius-lg);
    scroll-snap-align: start;
    color: ${(p) => (p.$on ? 'var(--white-color)' : p.$weekend ? 'var(--danger-color)' : 'var(--black-color)')};

    .dow { font-size: var(--xsmall-font); opacity: 0.85; }
    .day { font-size: var(--big-font); font-weight: 800; }
`;

// 시술 선택 칩(이름 + 소요·가격). 선택 시 소프트 브랜드 배경.
export const ServiceChoiceChip = styled.button<{$on: boolean}>`
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 14px;
    border: 1px solid ${(p) => (p.$on ? 'var(--brand-color)' : 'var(--light-gray-color)')};
    border-radius: var(--radius-lg);
    background: ${(p) => (p.$on ? 'var(--brand-color-bg)' : 'var(--white-color)')};
    cursor: pointer;
    text-align: left;

    &:disabled { opacity: 0.4; cursor: not-allowed; }

    .nm { font-size: var(--small-font); font-weight: 600; color: var(--black-color); }
    .mt { font-size: var(--xsmall-font); color: var(--dark-gray-color2); }
`;

export const ServiceChoiceWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

// 시간 슬롯 그리드 + 셀(좌석식)
export const SlotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
`;

export const SlotCell = styled.button<{$on: boolean}>`
    ${selectableBase};
    height: 42px;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 600;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        text-decoration: line-through;
        background: var(--gray-color2);
    }
`;

export const SlotLegend = styled.div`
    display: flex;
    gap: 16px;
    margin-top: 2px;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);

    i {
        display: inline-block;
        width: 10px;
        height: 10px;
        margin-right: 4px;
        border-radius: var(--radius-sm);
        vertical-align: middle;
    }
    i.ok { border: 1px solid var(--light-gray-color); }
    i.off { background: var(--gray-color2); }
`;
