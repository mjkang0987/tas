import styled, {css} from 'styled-components';

type LabelBadgeTone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger' | 'success';
type LabelBadgeShape = 'soft' | 'pill';
type LabelBadgeSize = 'sm' | 'md';

const toneStyles: Record<LabelBadgeTone, ReturnType<typeof css>> = {
    neutral: css`
        background: var(--neutral-bg);
        border-color: var(--neutral-border);
        color: var(--neutral-text);
    `,
    brand: css`
        background: var(--naver-color);
        border-color: var(--naver-color-dark);
        color: var(--white-color);
    `,
    info: css`
        background: var(--info-bg);
        border-color: var(--info-border);
        color: var(--info-color);
    `,
    warning: css`
        background: var(--warning-bg-soft);
        border-color: var(--warning-border-soft);
        color: var(--warning-text);
    `,
    danger: css`
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-color);
    `,
    success: css`
        background: var(--success-bg);
        border-color: var(--success-border);
        color: var(--success-text);
    `,
};

export const LabelBadge = styled.span<{
    $tone?: LabelBadgeTone;
    $shape?: LabelBadgeShape;
    $size?: LabelBadgeSize;
}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    box-sizing: border-box;
    padding: 3px 6px;
    border: 1px solid transparent;
    border-radius: ${(p) => p.$shape === 'pill' ? '999px' : '6px'};
    font-size: ${(p) => p.$size === 'md' ? '12px' : '11px'};
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    flex-shrink: 0;
    ${(p) => toneStyles[p.$tone ?? 'neutral']};
`;
