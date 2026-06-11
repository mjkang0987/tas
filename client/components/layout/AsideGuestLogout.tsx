import Link from 'next/link';

import styled from 'styled-components';

type Props = {
    onClose: () => void;
    onConfirm: () => void;
};

export function AsideGuestLogout({onClose, onConfirm}: Props) {
    return (
        <StyledOverlay onClick={onClose}>
            <StyledDialog onClick={(e) => e.stopPropagation()}>
                <StyledMsg>
                    현재 기기에서 모든 정보(예약, 서비스, 디자이너, 고객명단)가 삭제됩니다.
                    로그아웃 하시겠습니까?
                </StyledMsg>
                <StyledActions>
                    <StyledCancel type="button" onClick={onClose}>취소</StyledCancel>
                    <StyledConfirm type="button" onClick={onConfirm}>확인</StyledConfirm>
                </StyledActions>
                <StyledSnsLink href="/settings/sns">SNS 계정 연동</StyledSnsLink>
            </StyledDialog>
        </StyledOverlay>
    );
}

const StyledOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
`;

const StyledDialog = styled.div`
    background: var(--white-color);
    border-radius: var(--radius-lg);
    padding: 24px 20px 20px;
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-md);
`;

const StyledMsg = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--dark-gray-color);
    word-break: keep-all;
`;

const StyledActions = styled.div`
    display: flex;
    gap: 8px;

    button { flex: 1; }
`;

const StyledCancel = styled.button`
    padding: 9px 0;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledConfirm = styled.button`
    padding: 9px 0;
    border: none;
    border-radius: var(--radius-md);
    background: var(--danger-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
`;

const StyledSnsLink = styled(Link)`
    font-size: 12px;
    color: var(--blue-color);
    text-align: center;
    text-decoration: underline;
`;
