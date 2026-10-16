import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {
    StyledActionButton,
    StyledConfirmModal,
    StyledConfirmOverlay,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitle,
    StyledHeaderTitleGroup,
    StyledHeaderTitleGroupText,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from './CloseIconButton';

type ConfirmVariant = 'primary' | 'danger' | 'warning';
type ConfirmIcon = 'warning' | 'trash' | 'logout' | 'download';

interface ConfirmDialogProps {
    title: string;
    /** 헤더 제목 아래 보조 설명 */
    description?: string;
    /** 본문 (줄바꿈 \n 지원). 꼭 읽혀야 하는 문구는 `Emphasis`로 감싼다 */
    message?: ReactNode;
    /** 가운데 정렬 레이어 위쪽 아이콘. 기본은 경고(!) */
    icon?: ConfirmIcon;
    /** danger가 아니어도 가운데 정렬(아이콘·질문형 제목·같은 너비 버튼) 레이아웃을 쓴다 */
    centered?: boolean;
    /** 풍부한 본문 (dl 등). message 대신/함께 사용 */
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: ConfirmVariant;
    /** 확인 버튼만 노출 (안내성 단일 버튼) */
    hideCancel?: boolean;
    /** 헤더 우측 닫기(X) 버튼 (기본 노출). 가운데 정렬(danger·centered) 레이아웃은 헤더가 없어 무시한다 */
    showCloseButton?: boolean;
    confirmDisabled?: boolean;
    /** 오버레이 aria-label (기본: title) */
    ariaLabel?: string;
    /** 레이어 인스턴스 키 (기본: 'confirm') */
    layerKey?: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmDialog = ({
    title,
    description,
    message,
    icon = 'warning',
    centered = false,
    children,
    confirmLabel = '확인',
    cancelLabel = '취소',
    confirmVariant = 'primary',
    hideCancel = false,
    showCloseButton = true,
    confirmDisabled = false,
    ariaLabel,
    layerKey = 'confirm',
    onConfirm,
    onClose,
}: ConfirmDialogProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId(layerKey);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    const variantProps = {
        $primary: confirmVariant === 'primary',
        $danger: confirmVariant === 'danger',
        $warning: confirmVariant === 'warning',
    };

    return createPortal(
        <StyledConfirmOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title}
            id={layerId}
            data-layer-id={layerDataId}
        >
            {confirmVariant === 'danger' || centered ? (
                // 삭제·되돌릴 수 없는 동작: 헤더 줄 없이 가운데 아이콘 → 질문형 제목 → 설명 → 같은 너비 버튼 두 개.
                // 아이콘은 색만이 아니라 모양으로도 위험을 알린다(WCAG 1.4.1).
                <StyledAlertModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                    <StyledAlertBody>
                        <StyledAlertIcon><ConfirmIconGlyph icon={icon} /></StyledAlertIcon>
                        <StyledAlertTitle>{title}</StyledAlertTitle>
                        {description && <StyledAlertText>{description}</StyledAlertText>}
                        {message && <StyledAlertText>{message}</StyledAlertText>}
                    </StyledAlertBody>
                    {children}
                    <StyledAlertFooter>
                        {!hideCancel && (
                            <StyledActionButton type="button" onClick={onClose}>{cancelLabel}</StyledActionButton>
                        )}
                        <StyledActionButton type="button" {...variantProps} disabled={confirmDisabled} onClick={onConfirm}>
                            {confirmLabel}
                        </StyledActionButton>
                    </StyledAlertFooter>
                </StyledAlertModal>
            ) : (
            <StyledConfirmModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    {description ? (
                        <StyledHeaderTitleGroup>
                            <StyledHeaderTitle>{title}</StyledHeaderTitle>
                            <StyledHeaderTitleGroupText>{description}</StyledHeaderTitleGroupText>
                        </StyledHeaderTitleGroup>
                    ) : (
                        <StyledHeaderTitle>{title}</StyledHeaderTitle>
                    )}
                    {showCloseButton && <CloseIconButton onClick={onClose} />}
                </StyledHeader>

                {message && (
                    <StyledBody>
                        <StyledMessage>{message}</StyledMessage>
                    </StyledBody>
                )}
                {children}

                <StyledFooter>
                    {!hideCancel && (
                        <StyledActionButton type="button" onClick={onClose}>{cancelLabel}</StyledActionButton>
                    )}
                    <StyledActionButton type="button" {...variantProps} disabled={confirmDisabled} onClick={onConfirm}>
                        {confirmLabel}
                    </StyledActionButton>
                </StyledFooter>
            </StyledConfirmModal>
            )}
        </StyledConfirmOverlay>,
        modalRoot
    );
};

const StyledBody = styled.div`
    padding: var(--modal-body-padding);
`;

function ConfirmIconGlyph({icon}: {icon: ConfirmIcon}) {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {icon === 'trash' && <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5h6V7" transform="matrix(1.2 0 0 1.2 -2.4 -2.4)" strokeWidth="1.5" />}
            {icon === 'download' && <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />}
            {icon === 'logout' && <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M14 16l4-4-4-4M18 12H9" />}
            {icon === 'warning' && <><circle cx="12" cy="12" r="11" /><path d="M12 6.5v7M12 17.5v.01" strokeWidth="2.2" /></>}
        </svg>
    );
}

const StyledAlertModal = styled(StyledConfirmModal)`
    overflow: hidden;

    /* 확인 창은 좁은 화면에서 좌우 8px만 남기고 채운다 */
    @media (max-width: 640px) {
        &&&& {
            flex-shrink: 0; /* 오버레이 패딩(14px)보다 넓게 */
            width: min(360px, calc(100vw - 16px));
        }
    }
`;

const StyledAlertBody = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 16px 2px;
    text-align: center;
`;

const StyledAlertIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-bottom: 22px;
    border-radius: 50%;
    background: var(--brand-color-bg);
    box-shadow: 0 0 0 5px rgba(101, 38, 217, 0.04);
    color: var(--brand-color);
`;

const StyledAlertTitle = styled.h2`
    margin: 0 0 12px;
    font-size: var(--big-font);
    font-weight: 700;
    line-height: 1.4;
    color: var(--black-color);
    word-break: keep-all;
`;

const StyledAlertText = styled.p`
    margin: 0;
    font-size: var(--font);
    line-height: 1.6;
    color: var(--dark-gray-color);
    white-space: pre-line;
    word-break: keep-all;
`;

// 버튼은 다른 확인 창과 같은 StyledActionButton(높이·글자·모서리)이고, 너비만 칸을 반씩 채운다.
const StyledAlertFooter = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: var(--modal-footer-gap);
    padding: 22px 16px 16px;
`;

const StyledMessage = styled.p`
    margin: 0;
    font-size: var(--font);
    line-height: 1.6;
    color: var(--dark-gray-color);
    white-space: pre-line;
    word-break: keep-all;
`;
