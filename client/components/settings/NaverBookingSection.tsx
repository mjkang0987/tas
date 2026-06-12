import {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';

import styled from 'styled-components';

import {useNaverBookingSync} from '../../hooks/useNaverBookingSync';
import {fetchGmailStatus} from '../../lib/gmail-status';
import type {GmailStatus} from '../../lib/gmail-status';
import {PageHero} from '../ui/PageHero';
import {StyledSettingsCard, StyledSettingsCardTitle, StyledSaveBtn} from './settings-styles';
import {
    StyledConfirmOverlay,
    StyledConfirmModal,
    StyledHeader,
    StyledFooter,
    StyledActionButton,
} from '../calendar/overlays/ModalStyles';

function formatLastSync(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ERROR_MESSAGES: Record<string, string> = {
    denied: 'Google 계정 접근 권한이 거부되었습니다. 연동하려면 Gmail 읽기 권한 동의가 필요합니다.',
    state: '연동 요청 검증에 실패했습니다. 처음부터 다시 시도해 주세요.',
    exchange: 'Google 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    config: 'Google 연동 설정이 완료되지 않은 환경입니다. 관리자에게 문의해 주세요.',
    unknown: '알 수 없는 오류로 연동에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

export function NaverBookingSection() {
    const router = useRouter();
    const {data: session} = useSession();
    const {sync, syncing, isActive} = useNaverBookingSync();

    const hasRole = session?.user?.role === 'owner';

    const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [justConnected, setJustConnected] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem('naver-sync-last');
        if (raw) setLastSync(Number(raw));
    }, [syncing]);

    useEffect(() => {
        fetchGmailStatus(true).then(setGmailStatus);
    }, []);

    // OAuth 리다이렉트 결과 처리 (성공 배지 / 실패 안내 레이어)
    useEffect(() => {
        if (!router.isReady) return;
        const result = router.query.gmail;
        if (result === 'connected') {
            setJustConnected(true);
        } else if (result === 'error') {
            setErrorReason(typeof router.query.reason === 'string' ? router.query.reason : 'unknown');
        }
        if (result) {
            void router.replace(router.pathname === '/settings/[tab]' ? '/settings/naver' : router.pathname, undefined, {shallow: true});
        }
    }, [router.isReady, router.query.gmail, router.query.reason]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConnect = useCallback(() => {
        window.location.href = '/api/gmail/connect';
    }, []);

    const handleDisconnect = useCallback(async () => {
        setDisconnecting(true);
        try {
            const res = await fetch('/api/gmail/disconnect', {method: 'POST'});
            if (res.ok) {
                setGmailStatus(await fetchGmailStatus(true));
                setJustConnected(false);
            }
        } finally {
            setDisconnecting(false);
        }
    }, []);

    const connected = gmailStatus?.connected ?? false;

    return (
        <div>
            <PageHero eyebrow="설정" title="네이버예약 연동" subtitle="Gmail을 통해 네이버 예약을 자동으로 일정표에 반영합니다." />

            <StyledSettingsCard>
                <StyledSettingsCardTitle>연동 상태</StyledSettingsCardTitle>

                <StyledCheckRow>
                    <StyledIcon $ok={connected}>{connected ? '✅' : '❌'}</StyledIcon>
                    <StyledCheckText>
                        {gmailStatus === null
                            ? '연동 상태를 확인하는 중...'
                            : connected
                                ? <>Gmail 연동됨{gmailStatus.email ? <>: <strong>{gmailStatus.email}</strong></> : null}</>
                                : 'Gmail 연동이 필요합니다. 로그인 계정과 다른 Google 계정도 사용할 수 있습니다.'
                        }
                    </StyledCheckText>
                    {hasRole && gmailStatus !== null && (
                        <StyledGmailActions>
                            {connected ? (
                                <>
                                    <StyledGhostBtn type="button" onClick={handleConnect}>
                                        다른 계정으로 연동
                                    </StyledGhostBtn>
                                    <StyledGhostBtn type="button" $danger disabled={disconnecting} onClick={handleDisconnect}>
                                        {disconnecting ? '해제 중...' : '연동 해제'}
                                    </StyledGhostBtn>
                                </>
                            ) : (
                                <StyledSyncBtn type="button" onClick={handleConnect}>
                                    Gmail 연동하기
                                </StyledSyncBtn>
                            )}
                        </StyledGmailActions>
                    )}
                </StyledCheckRow>

                <StyledCheckRow>
                    <StyledIcon $ok={hasRole}>{hasRole ? '✅' : '❌'}</StyledIcon>
                    <StyledCheckText>
                        {hasRole
                            ? '연동 가능한 권한(오너)입니다.'
                            : '오너 권한이 필요합니다.'
                        }
                    </StyledCheckText>
                </StyledCheckRow>

                {justConnected && (
                    <StyledSuccessRow>Gmail 연동이 완료되었습니다. 네이버 예약 메일이 자동으로 동기화됩니다.</StyledSuccessRow>
                )}

                {isActive && (
                    <StyledActiveRow>
                        <StyledActiveBadge>자동 동기화 활성화됨</StyledActiveBadge>
                        {lastSync && (
                            <StyledLastSync>마지막 동기화: {formatLastSync(lastSync)}</StyledLastSync>
                        )}
                        <StyledSyncBtn type="button" onClick={sync} disabled={syncing}>
                            {syncing ? '동기화 중...' : '지금 동기화'}
                        </StyledSyncBtn>
                    </StyledActiveRow>
                )}
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>동작 방식</StyledSettingsCardTitle>
                <StyledGuideList>
                    <li>Gmail 계정을 연동하면 해당 메일함에서 네이버 예약 이메일을 자동으로 읽어옵니다.</li>
                    <li>예약 확정·취소 이메일을 파싱해 일정표에 자동 반영합니다.</li>
                    <li>동기화는 로그인 시 1회 + 매 정시 자동 실행됩니다 (최소 30분 간격).</li>
                    <li>디자이너 이름이 일치하지 않으면 자동으로 새 디자이너를 생성합니다.</li>
                    <li>등록되지 않은 서비스명은 자동으로 서비스에 추가됩니다.</li>
                </StyledGuideList>
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>주의사항</StyledSettingsCardTitle>
                <StyledGuideList>
                    <li>네이버예약 알림 이메일을 연동한 Gmail 계정으로 수신하도록 설정해야 합니다.</li>
                    <li>Gmail 읽기 권한이 필요합니다 (연동 시 동의).</li>
                    <li>로그인에 사용하는 Google 계정과 다른 계정으로도 연동할 수 있습니다.</li>
                </StyledGuideList>
            </StyledSettingsCard>

            {errorReason && (
                <StyledConfirmOverlay>
                    <StyledConfirmModal>
                        <StyledHeader><h3>Gmail 연동 실패</h3></StyledHeader>
                        <StyledModalBody>
                            <StyledErrorText>{ERROR_MESSAGES[errorReason] ?? ERROR_MESSAGES.unknown}</StyledErrorText>
                        </StyledModalBody>
                        <StyledFooter>
                            <StyledActionButton type="button" onClick={() => setErrorReason(null)}>
                                닫기
                            </StyledActionButton>
                            <StyledActionButton type="button" $primary onClick={handleConnect}>
                                다시 시도
                            </StyledActionButton>
                        </StyledFooter>
                    </StyledConfirmModal>
                </StyledConfirmOverlay>
            )}
        </div>
    );
}


const StyledSyncBtn = styled(StyledSaveBtn)`
    flex-shrink: 0;
`;

const StyledCheckRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;

    & + & {
        border-top: 1px solid var(--light-gray-color);
    }
`;

const StyledIcon = styled.span<{$ok: boolean}>`
    font-size: 16px;
    flex-shrink: 0;
    line-height: 1.4;
`;

const StyledCheckText = styled.span`
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.5;
    flex: 1;
    min-width: 0;

    strong {
        font-weight: 600;
        color: var(--black-color);
    }
`;

const StyledGmailActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

const StyledGhostBtn = styled.button<{$danger?: boolean}>`
    height: 30px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    font-size: 12px;
    border: 1px solid ${(p) => (p.$danger ? 'var(--danger-color)' : 'var(--light-gray-color)')};
    background: var(--white-color);
    color: ${(p) => (p.$danger ? 'var(--danger-color)' : 'var(--dark-gray-color)')};

    &:disabled {
        opacity: 0.6;
    }
`;

const StyledSuccessRow = styled.p`
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--success-bg);
    color: var(--success-color);
    font-size: 13px;
`;

const StyledModalBody = styled.div`
    padding: 16px;
`;

const StyledErrorText = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--danger-color);
    line-height: 1.5;
`;

const StyledActiveRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--light-gray-color);
`;

const StyledActiveBadge = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--success-color);
    background: var(--success-bg);
    padding: 3px 10px;
    border-radius: 999px;
`;

const StyledLastSync = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
    flex: 1;
`;


const StyledGuideList = styled.ol`
    margin: 0;
    padding: 0 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
        font-size: 14px;
        color: var(--dark-gray-color);
        line-height: 1.6;
    }
`;
