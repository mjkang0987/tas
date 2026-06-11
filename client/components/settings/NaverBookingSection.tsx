import {useEffect, useState} from 'react';

import Link from 'next/link';
import {useSession} from 'next-auth/react';

import styled from 'styled-components';

import {useNaverBookingSync} from '../../hooks/useNaverBookingSync';
import {PageHero} from '../ui/PageHero';
import {StyledSettingsCard, StyledSettingsCardTitle, StyledSaveBtn} from './settings-styles';

function formatLastSync(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NaverBookingSection() {
    const {data: session} = useSession();
    const {sync, syncing, isActive} = useNaverBookingSync();

    const isGoogle = session?.user?.provider === 'google';
    const hasRole = session?.user?.role === 'owner';

    const [lastSync, setLastSync] = useState<number | null>(null);

    useEffect(() => {
        const raw = localStorage.getItem('naver-sync-last');
        if (raw) setLastSync(Number(raw));
    }, [syncing]);

    return (
        <div>
            <PageHero eyebrow="설정" title="네이버예약 연동" subtitle="Gmail을 통해 네이버 예약을 자동으로 일정표에 반영합니다." />

            <StyledSettingsCard>
                <StyledSettingsCardTitle>연동 상태</StyledSettingsCardTitle>

                <StyledCheckRow>
                    <StyledIcon $ok={isGoogle}>{isGoogle ? '✅' : '❌'}</StyledIcon>
                    <StyledCheckText>
                        {isGoogle
                            ? 'Google 계정으로 로그인 중입니다.'
                            : <>Google 계정 연동이 필요합니다. <StyledLink href="/settings/sns">SNS 연동 설정</StyledLink></>
                        }
                    </StyledCheckText>
                </StyledCheckRow>

                <StyledCheckRow>
                    <StyledIcon $ok={hasRole}>{hasRole ? '✅' : '❌'}</StyledIcon>
                    <StyledCheckText>
                        {hasRole
                            ? '연동 가능한 권한(소유자 또는 멤버)입니다.'
                            : '소유자 또는 멤버 권한이 필요합니다.'
                        }
                    </StyledCheckText>
                </StyledCheckRow>

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
                    <li>Google 계정으로 로그인하면 Gmail에서 네이버 예약 이메일을 자동으로 읽어옵니다.</li>
                    <li>예약 확정·취소 이메일을 파싱해 일정표에 자동 반영합니다.</li>
                    <li>동기화는 로그인 시 1회 + 매 정시 자동 실행됩니다 (최소 30분 간격).</li>
                    <li>디자이너 이름이 일치하지 않으면 자동으로 새 디자이너를 생성합니다.</li>
                    <li>등록되지 않은 서비스명은 자동으로 서비스에 추가됩니다.</li>
                </StyledGuideList>
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>주의사항</StyledSettingsCardTitle>
                <StyledGuideList>
                    <li>네이버예약 알림 이메일을 Google 계정으로 수신하도록 설정해야 합니다.</li>
                    <li>Gmail 읽기 권한이 필요합니다 (Google 로그인 시 동의).</li>
                </StyledGuideList>
            </StyledSettingsCard>
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
`;

const StyledLink = styled(Link)`
    color: var(--blue-color);
    text-decoration: underline;
    font-size: 13px;
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
