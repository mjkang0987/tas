import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {POLICIES, applyPolicyVars, type PolicySlug, type PolicyVars} from '../../content/policies';
import {CloseIconButton} from '../ui/CloseIconButton';
import {
    OVERLAY_Z_INDEX,
    StyledBody,
    StyledBodyInner,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {POLICY_ELEMENT_CSS, POLICY_VARS_DARK, POLICY_VARS_LIGHT} from './policyCss';

// 정책 문서(이용약관·개인정보·처리위탁)를 페이지 이동 없이 레이어로 보여준다.
// 앱 공통 레이어(ModalStyles) 디자인을 그대로 사용한다.
// 본문은 content/policies 단일 소스라 풀페이지(/terms·/privacy·/dpa)와 항상 동일하다.
// vars: 본문의 {{storeName}} 등 치환값. 매장 대상 문서(booking-consent·store-privacy)에서 쓴다.
export function PolicyViewLayer({slug, onClose, vars}: {slug: PolicySlug; onClose: () => void; vars?: PolicyVars}) {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId(`policy-${slug}`);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    const {navTitle, body} = POLICIES[slug];
    const html = applyPolicyVars(body, vars);

    return createPortal(
        <StyledPolicyOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={navTitle}
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledPolicyModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitle>{navTitle}</StyledHeaderTitle>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledBody>
                    <StyledBodyInner>
                        <StyledPolicyContent dangerouslySetInnerHTML={{__html: html}} />
                    </StyledBodyInner>
                </StyledBody>
            </StyledPolicyModal>
        </StyledPolicyOverlay>,
        modalRoot
    );
}

// 정책 "보기"는 ConfirmDialog(처리위탁 동의 등) 위에서 열릴 수 있어 confirm 레이어보다 위에 둔다.
const StyledPolicyOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm + 10};
`;

const StyledPolicyModal = styled(StyledDetail)`
    max-width: min(640px, 92vw);
    width: 100%;
    max-height: 85vh;
`;

const StyledPolicyContent = styled.div`
    ${POLICY_VARS_LIGHT}
    color: var(--tas-fg);
    line-height: 1.7;
    font-size: var(--font);
    word-break: keep-all;

    ${POLICY_ELEMENT_CSS}

    @media (prefers-color-scheme: dark) {
        ${POLICY_VARS_DARK}
    }
`;
