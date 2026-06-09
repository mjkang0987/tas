import type {ReactNode} from 'react';

import styled from 'styled-components';

interface FieldErrorProps {
    children?: ReactNode;
    variant?: 'box' | 'inline';
    className?: string;
}

export const FieldError = ({children, variant = 'box', className}: FieldErrorProps) => {
    if (!children) return null;
    return variant === 'inline'
        ? <StyledInline className={className}>{children}</StyledInline>
        : <StyledBox className={className}>{children}</StyledBox>;
};

const StyledBox = styled.p`
    margin: 8px 0 0;
    padding: var(--gap-md) var(--gap-lg);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-sm);
    font-size: var(--small-font);
    color: var(--danger-color);
    line-height: 1.5;
`;

const StyledInline = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--danger-color);
`;
