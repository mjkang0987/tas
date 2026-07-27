import styled, {css} from 'styled-components';

import {Spinner} from './Spinner';

type Backdrop = 'solid' | 'dim' | 'blur';

interface LoadingOverlayProps {
    /** 스피너 아래 안내 문구 */
    text?: string;
    /** 배경: solid(흰색) | dim(반투명) | blur(블러) */
    backdrop?: Backdrop;
    /** 스피너+텍스트를 카드로 감쌈 (blur 배경과 함께 쓰는 로그인형) */
    boxed?: boolean;
    /** 스피너 크기(px) */
    size?: number;
    /** z-index */
    zIndex?: number;
    className?: string;
}

export function LoadingOverlay({
    text,
    backdrop = 'solid',
    boxed = false,
    size = 36,
    zIndex = 9999,
    className,
}: LoadingOverlayProps) {
    const inner = (
        <>
            <Spinner $size={size} $thickness={boxed ? 4 : 3} $track={boxed ? '#dbe7ff' : undefined} />
            {text && <StyledText>{text}</StyledText>}
        </>
    );

    return (
        <StyledOverlay className={className} $backdrop={backdrop} $zIndex={zIndex}>
            {boxed ? <StyledCard>{inner}</StyledCard> : inner}
        </StyledOverlay>
    );
}

const StyledOverlay = styled.div<{$backdrop: Backdrop; $zIndex: number}>`
    position: fixed;
    inset: 0;
    z-index: ${(p) => p.$zIndex};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    box-sizing: border-box;

    ${(p) => p.$backdrop === 'solid' && css`background: var(--white-color);`}
    ${(p) => p.$backdrop === 'dim' && css`background: rgba(255, 255, 255, 0.6);`}
    ${(p) => p.$backdrop === 'blur' && css`
        background: transparent;
        padding: var(--overlay-padding);
        backdrop-filter: blur(var(--overlay-backdrop-blur));
    `}
`;

const StyledCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    max-width: 200px;
    padding: 24px 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: var(--sticky-backdrop);
    border: 1px solid var(--modal-border);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    color: var(--dark-gray-color);
    font-size: var(--font);
    font-weight: 600;
`;

const StyledText = styled.span`
    font-size: var(--medium-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;
