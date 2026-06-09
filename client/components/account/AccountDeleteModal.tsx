import {useState, useCallback} from 'react';

import {createPortal} from 'react-dom';
import {signOut} from 'next-auth/react';

import styled from 'styled-components';

import {
    StyledConfirmOverlay,
    StyledConfirmModal,
    StyledHeader,
    StyledFooter,
    StyledActionButton as BaseActionButton,
    StyledModalMessage,
    StyledModalContent,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';

interface AccountDeleteModalProps {
    role: string | undefined;
    onClose: () => void;
}

const CONFIRM_TEXT = '탈퇴';

export const AccountDeleteModal = ({role, onClose}: AccountDeleteModalProps) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    const isOwner = role === 'owner';
    const confirmed = input === CONFIRM_TEXT;

    const handleDelete = useCallback(async () => {
        if (!confirmed || loading) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/account/delete', {method: 'DELETE'});

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.error ?? '탈퇴 처리에 실패했습니다.');
                setLoading(false);
                return;
            }

            await signOut({callbackUrl: '/login'});
        } catch {
            setError('네트워크 오류가 발생했습니다.');
            setLoading(false);
        }
    }, [confirmed, loading]);

    const modalRoot = typeof document !== 'undefined'
        ? document.getElementById('modal-root')
        : null;
    if (!modalRoot) return null;

    return createPortal(
        <StyledConfirmOverlay role="dialog" aria-modal="true" aria-label="회원탈퇴">
            <StyledConfirmModal ref={dialogRef} tabIndex={-1}>
                <StyledHeader>
                    <h3>회원탈퇴</h3>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledModalContent>
                    <StyledModalMessage $color="#be123c">
                        {isOwner
                            ? '탈퇴 시 매장의 모든 데이터(고객, 예약, 디자이너 등)가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'
                            : '탈퇴 시 계정이 삭제되고 매장 접근 권한이 제거됩니다. 이 작업은 되돌릴 수 없습니다.'}
                    </StyledModalMessage>
                    <StyledInputLabel>
                        확인을 위해 <strong>탈퇴</strong>를 입력해주세요.
                    </StyledInputLabel>
                    <StyledInput type="text"
                                 autoComplete="off"
                                 placeholder={CONFIRM_TEXT}
                                 value={input}
                                 onChange={(e) => setInput(e.target.value)} />
                    <FieldError variant="inline">{error}</FieldError>
                </StyledModalContent>
                <StyledFooter>
                    <BaseActionButton type="button" onClick={onClose}>
                        취소
                    </BaseActionButton>
                    <StyledDangerButton type="button"
                                        $danger
                                        disabled={!confirmed || loading}
                                        onClick={handleDelete}>
                        {loading ? '처리 중...' : '회원탈퇴'}
                    </StyledDangerButton>
                </StyledFooter>
            </StyledConfirmModal>
        </StyledConfirmOverlay>,
        modalRoot,
    );
};

const StyledInputLabel = styled.p`
    margin: 12px 0 6px;
    font-size: 13px;
    color: #374151;

    strong {
        color: #be123c;
    }
`;

const StyledInput = styled.input`
    width: 100%;
    ${formControlStyle};
    padding: 0 10px;
`;

const StyledDangerButton = styled(BaseActionButton)`
    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        box-shadow: none;
    }
`;

