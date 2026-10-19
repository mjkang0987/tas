import type {ReactNode} from 'react';
import {useEffect, useRef} from 'react';

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
    const ref = useRef<HTMLParagraphElement>(null);
    const shownText = useRef<string | null>(null);
    // 오류가 뜨면(문구가 바뀌면) 보이는 곳까지 스크롤 — 긴 모달·시트에서 저장을 눌렀는데 오류가 화면 아래에 떠 먹통처럼 보였다.
    // 글자로 비교한다: children 이 JSX 면 렌더마다 새 객체라, 다른 칸에 타이핑할 때마다 끌려 올라간다.
    // 'nearest' 라 이미 보이면 움직이지 않는다. jsdom 엔 scrollIntoView 가 없다.
    useEffect(() => {
        const text = ref.current?.textContent ?? null;
        if (text && text !== shownText.current) ref.current?.scrollIntoView?.({block: 'nearest'});
        shownText.current = text;
    });
    if (!children) return null;
    return variant === 'inline'
        ? <StyledInline ref={ref} className={className} id={id} role={role}>{children}</StyledInline>
        : <StyledBox ref={ref} className={className} id={id} role={role}>{children}</StyledBox>;
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
