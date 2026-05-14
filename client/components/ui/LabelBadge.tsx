import styled, {css} from 'styled-components';

type LabelBadgeTone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger' | 'success';
type LabelBadgeShape = 'soft' | 'pill';
type LabelBadgeSize = 'sm' | 'md';

const toneStyles: Record<LabelBadgeTone, ReturnType<typeof css>> = {
    neutral: css`
        background: rgba(241, 245, 249, 0.92);
        border-color: rgba(203, 213, 225, 0.95);
        color: #475569;
    `,
    brand: css`
        background: #2DB400;
        border-color: #269900;
        color: var(--white-color);
    `,
    info: css`
        background: rgba(45, 127, 249, 0.1);
        border-color: rgba(45, 127, 249, 0.2);
        color: var(--blue-color);
    `,
    warning: css`
        background: #FEF3C7;
        border-color: #FCD34D;
        color: #92400E;
    `,
    danger: css`
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-color);
    `,
    success: css`
        background: rgba(34, 197, 94, 0.12);
        border-color: rgba(34, 197, 94, 0.2);
        color: #15803d;
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
