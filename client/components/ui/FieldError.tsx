import type {ReactNode} from 'react';

import styled from 'styled-components';

interface FieldErrorProps {
    children?: ReactNode;
    variant?: 'box' | 'inline';
    className?: string;
    /** aria-describedby 대상으로 삼을 때 쓴다. 없으면 입력과 에러가 프로그램적으로 연결되지 않는다. */
    id?: string;
    /** 나타나는 순간 읽히게 하려면 'alert'. 기본값 없음 — 기존 사용처의 동작을 바꾸지 않는다. */
    role?: 'alert' | 'status';
}

export const FieldError = ({children, variant = 'box', className, id, role}: FieldErrorProps) => {
    if (!children) return null;
    return variant === 'inline'
        ? <StyledInline className={className} id={id} role={role}>{children}</StyledInline>
        : <StyledBox className={className} id={id} role={role}>{children}</StyledBox>;
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
    font-size: var(--small-font);
    line-height: 1.4;
    color: var(--danger-color);
`;
