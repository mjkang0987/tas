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
            title="로그아웃할까요?"
            icon="logout"
            message={<>이 기기에 저장된 <Emphasis>예약·서비스·담당자·고객명단</Emphasis>이 모두 삭제되며,{'\n'}되돌릴 수 없습니다.</>}
            confirmLabel="로그아웃"
            confirmVariant="danger"
            layerKey="guest-logout"
            onConfirm={onConfirm}
            onClose={onClose}
        >
            <StyledSnsHint>
                SNS 계정을 연동하면 지금 데이터를 계정에 보관하고 다른 기기에서도 쓸 수 있습니다.
                <StyledSnsLink href="/settings/sns">SNS 계정 연동하기</StyledSnsLink>
            </StyledSnsHint>
        </ConfirmDialog>
    );
}

const StyledSnsHint = styled.p`
    margin: 16px 20px 0;
    font-size: var(--small-font);
    line-height: 1.6;
    color: var(--dark-gray-color2);
    text-align: center;
    word-break: keep-all;
`;

const StyledSnsLink = styled(Link)`
    display: block;
    margin-top: 6px;
    font-size: var(--small-font);
    color: var(--brand-color);
    font-weight: 600;
    text-decoration: underline;
`;
