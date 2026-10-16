import Link from 'next/link';

import styled from 'styled-components';

import {ConfirmDialog} from '../ui/ConfirmDialog';
import {Emphasis} from '../ui/Emphasis';

type Props = {
    onClose: () => void;
    onConfirm: () => void;
};

export function AsideGuestLogout({onClose, onConfirm}: Props) {
    return (
        <ConfirmDialog
            title="로그아웃"
            message={<>
                이 기기에 저장된 <Emphasis>예약·서비스·담당자·고객명단</Emphasis>이 모두 삭제됩니다.{'\n'}
                <Emphasis $tone="danger">되돌릴 수 없습니다. 로그아웃하시겠습니까?</Emphasis>{'\n\n'}
                SNS 계정을 연동하면 지금 데이터를 계정에 보관하고 다른 기기에서도 쓸 수 있습니다.
            </>}
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
    font-size: var(--small-font);
    color: var(--blue-color);
    text-decoration: underline;
`;
