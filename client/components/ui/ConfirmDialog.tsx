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

interface ConfirmDialogProps {
    title: string;
    /** 헤더 제목 아래 보조 설명 */
    description?: string;
    /** 단순 본문 텍스트 (줄바꿈 \n 지원) */
    message?: string;
    /** 풍부한 본문 (dl 등). message 대신/함께 사용 */
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: ConfirmVariant;
    /** 확인 버튼만 노출 (안내성 단일 버튼) */
    hideCancel?: boolean;
    /** 헤더 우측 닫기(X) 버튼 (기본 노출) */
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
        </StyledConfirmOverlay>,
        modalRoot
    );
};

const StyledBody = styled.div`
    padding: var(--modal-body-padding);
`;

const StyledMessage = styled.p`
    margin: 0;
    font-size: var(--font);
    line-height: 1.6;
    color: var(--dark-gray-color);
    white-space: pre-line;
    word-break: keep-all;
`;
