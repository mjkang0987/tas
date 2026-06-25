import Link from 'next/link';

import styled from 'styled-components';

import {ConfirmDialog} from '../ui/ConfirmDialog';

type Props = {
    onClose: () => void;
    onConfirm: () => void;
};

export function AsideGuestLogout({onClose, onConfirm}: Props) {
    return (
        <ConfirmDialog
            title="로그아웃"
            message="현재 기기에서 모든 정보(예약, 서비스, 담당자, 고객명단)가 삭제됩니다. 로그아웃 하시겠습니까?"
            confirmLabel="로그아웃"
            confirmVariant="danger"
            layerKey="guest-logout"
            onConfirm={onConfirm}
            onClose={onClose}
        >
            <StyledSnsLinkRow>
                <StyledSnsLink href="/settings/sns">SNS 계정 연동</StyledSnsLink>
            </StyledSnsLinkRow>
        </ConfirmDialog>
    );
}

const StyledSnsLinkRow = styled.div`
    padding: 0 16px 4px;
    text-align: center;
`;

const StyledSnsLink = styled(Link)`
    font-size: 12px;
    color: var(--blue-color);
    text-decoration: underline;
`;
