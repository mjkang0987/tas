import {useState} from 'react';

import styled from 'styled-components';

import {ConfirmDialog} from '../ui/ConfirmDialog';
import {PolicyViewLayer} from '../policy/PolicyViewLayer';

type Props = {
    submitting?: boolean;
    error?: string | null;
    onConfirm: () => void;
    onClose: () => void;
};

// 게스트로 이미 동의한 사용자가 SNS 연동(서버 처리 개시) 시, 추가로 필요한
// 개인정보 처리위탁(DPA) 동의만 레이어로 받는다.
export function ConsentDpaLayer({submitting = false, error, onConfirm, onClose}: Props) {
    const [agree, setAgree] = useState(false);
    const [showDpaDoc, setShowDpaDoc] = useState(false);

    return (
        <>
            <ConfirmDialog
                title="추가 동의 필요"
                description="계정 연동 시 데이터가 서버에 보관·처리되어 처리위탁 동의가 필요합니다."
                confirmLabel={submitting ? '처리 중...' : '동의하고 계속'}
                cancelLabel="동의 안 함"
                confirmDisabled={!agree || submitting}
                showCloseButton={false}
                layerKey="consent-dpa"
                onConfirm={onConfirm}
                onClose={onClose}
            >
                <StyledBody>
                    <StyledItem>
                        <StyledCheckbox
                            type="checkbox"
                            checked={agree}
                            onChange={(e) => setAgree(e.target.checked)}
                        />
                        <StyledItemText>
                            <StyledRequired>(필수)</StyledRequired> 개인정보 처리위탁 동의
                        </StyledItemText>
                        <StyledViewButton type="button" onClick={() => setShowDpaDoc(true)}>
                            보기
                        </StyledViewButton>
                    </StyledItem>
                    {error && <StyledError>{error}</StyledError>}
                </StyledBody>
            </ConfirmDialog>

            {showDpaDoc && (
                <PolicyViewLayer slug="dpa" onClose={() => setShowDpaDoc(false)} />
            )}
        </>
    );
}

const StyledBody = styled.div`
    padding: var(--modal-body-padding);
`;

const StyledItem = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
`;

const StyledItemText = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.4;
`;

const StyledRequired = styled.span`
    color: var(--brand-color);
    font-weight: 600;
`;

const StyledCheckbox = styled.input`
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    accent-color: var(--brand-color);
    cursor: pointer;
`;

const StyledViewButton = styled.button`
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    font-size: 12px;
    color: var(--dark-gray-color2);
    text-decoration: underline;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { color: var(--brand-color); }
    }
`;

const StyledError = styled.p`
    margin: 12px 0 0;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fff1f2;
    color: #9f1239;
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
`;
