import React, {useCallback, useEffect, useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

export interface TourStep {
    targetId: string;
    title: string;
    description: string;
}

interface GuidedTourProps {
    steps: TourStep[];
    open: boolean;
    onClose: () => void;
}

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const SPOTLIGHT_PAD = 8;
const TOOLTIP_WIDTH = 280;

// 딤 + 스포트라이트 + 단계별 말풍선으로 주요 버튼을 안내하는 가이드 투어.
// 대상은 요소 id로 지정한다. 대상이 없거나 화면에 없는 단계는 자동으로 건너뛴다.
export const GuidedTour = ({steps, open, onClose}: GuidedTourProps) => {
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);

    useEffect(() => {
        if (open) {
            setIndex(0);
        }
    }, [open]);

    // 현재 index부터 화면에 존재하는 첫 대상을 찾아 위치를 잡는다(없는 단계는 건너뜀).
    const measure = useCallback(() => {
        if (!open) return;
        for (let i = index; i < steps.length; i++) {
            const el = document.getElementById(steps[i].targetId);
            if (el) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    if (i !== index) {
                        setIndex(i);
                        return;
                    }
                    setRect({top: r.top, left: r.left, width: r.width, height: r.height});
                    return;
                }
            }
        }
        setRect(null);
    }, [open, index, steps]);

    useEffect(() => {
        measure();
    }, [measure]);

    useEffect(() => {
        if (!open) return;
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [open, measure]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || steps.length === 0) return null;
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    if (!modalRoot) return null;

    const isLast = index >= steps.length - 1;
    const step = steps[index];

    const handleNext = () => {
        if (isLast) onClose();
        else setIndex((i) => Math.min(steps.length - 1, i + 1));
    };
    const handlePrev = () => setIndex((i) => Math.max(0, i - 1));

    let tooltipStyle: React.CSSProperties;
    if (rect) {
        const spaceBelow = window.innerHeight - (rect.top + rect.height);
        const placeBelow = spaceBelow > 200 || rect.top < 200;
        const top = placeBelow ? rect.top + rect.height + SPOTLIGHT_PAD + 12 : Math.max(12, rect.top - SPOTLIGHT_PAD - 12 - 170);
        let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12));
        tooltipStyle = {top, left, width: TOOLTIP_WIDTH};
    } else {
        tooltipStyle = {top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_WIDTH};
    }

    return createPortal(
        <StyledRoot role="dialog" aria-modal="true" aria-label="사용 안내 튜토리얼">
            <StyledBlocker $dim={!rect} />
            {rect && (
                <StyledSpotlight
                    style={{
                        top: rect.top - SPOTLIGHT_PAD,
                        left: rect.left - SPOTLIGHT_PAD,
                        width: rect.width + SPOTLIGHT_PAD * 2,
                        height: rect.height + SPOTLIGHT_PAD * 2,
                    }}
                />
            )}
            <StyledTooltip style={tooltipStyle}>
                <StyledStepCount>{index + 1} / {steps.length}</StyledStepCount>
                <StyledTitle>{step.title}</StyledTitle>
                <StyledDesc aria-live="polite">{step.description}</StyledDesc>
                <StyledDots>
                    {steps.map((s, i) => (
                        <StyledDot key={s.targetId} $active={i === index} />
                    ))}
                </StyledDots>
                <StyledActions>
                    <StyledSkipButton type="button" onClick={onClose}>건너뛰기</StyledSkipButton>
                    <StyledNavGroup>
                        {index > 0 && (
                            <StyledPrevButton type="button" onClick={handlePrev}>이전</StyledPrevButton>
                        )}
                        <StyledNextButton type="button" onClick={handleNext}>
                            {isLast ? '완료' : '다음'}
                        </StyledNextButton>
                    </StyledNavGroup>
                </StyledActions>
            </StyledTooltip>
        </StyledRoot>,
        modalRoot,
    );
};

const StyledRoot = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10050;
    pointer-events: none;
`;

const StyledBlocker = styled.div<{$dim: boolean}>`
    position: absolute;
    inset: 0;
    pointer-events: auto;
    background: ${({$dim}) => ($dim ? 'rgba(0, 0, 0, 0.6)' : 'transparent')};
`;

const StyledSpotlight = styled.div`
    position: fixed;
    box-sizing: border-box;
    border-radius: 10px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.9);
    pointer-events: none;
    transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
`;

const StyledTooltip = styled.div`
    position: fixed;
    box-sizing: border-box;
    pointer-events: auto;
    background: var(--white-color, #fff);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledStepCount = styled.span`
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-color, #6c5ce7);
`;

const StyledTitle = styled.strong`
    font-size: 15px;
    font-weight: 700;
    color: var(--black-color, #222);
`;

const StyledDesc = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dark-gray-color, #555);
`;

const StyledDots = styled.div`
    display: flex;
    gap: 5px;
    margin: 2px 0 4px;
`;

const StyledDot = styled.span<{$active: boolean}>`
    width: ${({$active}) => ($active ? '18px' : '6px')};
    height: 6px;
    border-radius: 999px;
    background: ${({$active}) => ($active ? 'var(--brand-color, #6c5ce7)' : 'var(--light-gray-color, #ddd)')};
    transition: width 0.2s ease, background 0.2s ease;
`;

const StyledActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
`;

const StyledNavGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const StyledSkipButton = styled.button`
    padding: 8px 10px;
    border: none;
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color2, #888);
    cursor: pointer;
`;

const StyledPrevButton = styled.button`
    padding: 8px 14px;
    border: 1px solid var(--light-gray-color, #ddd);
    border-radius: 8px;
    background: var(--white-color, #fff);
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color, #555);
    cursor: pointer;
`;

const StyledNextButton = styled.button`
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: var(--brand-color, #6c5ce7);
    color: var(--white-color, #fff);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
`;
