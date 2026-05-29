import {useEffect, useMemo, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import {signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';
import {PageHero} from '../components/ui/PageHero';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {useCalendarStore} from '../store/calendarStore';
import {auth} from '../auth';
import {prisma} from '../lib/prisma';

import {
    createDefaultLocalDbSnapshot,
    loadLocalDbSnapshot,
    saveLocalDbSnapshot,
    shouldUseLocalDb,
    subscribeLocalDb,
    type LocalDbSnapshot,
} from '../lib/local-db';

const PROVIDER_LABELS: Record<string, string> = {
    google: 'Google',
    kakao: 'Kakao',
    naver: 'Naver',
};

type MyPageProps = {
    linkedProvider: string | null;
};

const MyPage: NextPage<MyPageProps> = ({linkedProvider}) => {
    const {data: session, status} = useSession();
    const isLocalMode = status !== 'authenticated' && shouldUseLocalDb();
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const selectedReservationIds = useCalendarStore((s) => s.selectedReservations);
    const closeReservationDetail = useCalendarStore((s) => s.closeReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);
    const selectedReservations = useMemo(() => {
        const all = Object.values(storeReservationMap).flat();
        return selectedReservationIds
            .map((id) => all.find((r) => r.id === id) ?? null)
            .filter((r): r is NonNullable<typeof r> => r !== null);
    }, [selectedReservationIds, storeReservationMap]);
    const [localSnapshot, setLocalSnapshot] = useState<LocalDbSnapshot | null>(() => (
        isLocalMode ? loadLocalDbSnapshot() : null
    ));

    useEffect(() => {
        if (!isLocalMode) {
            return;
        }

        return subscribeLocalDb(setLocalSnapshot);
    }, [isLocalMode, status]);

    const effectiveLocalSnapshot = isLocalMode ? localSnapshot : null;
    const storageModeLabel = isLocalMode ? '게스트 회원' : '로그인 회원';

    const localSummary = useMemo(() => ({
        customers: effectiveLocalSnapshot?.customers.length ?? 0,
        reservations: effectiveLocalSnapshot?.reservations.length ?? 0,
        history: effectiveLocalSnapshot?.history.length ?? 0,
        services: effectiveLocalSnapshot?.services.length ?? 0,
        designers: effectiveLocalSnapshot?.designers.length ?? 0,
    }), [effectiveLocalSnapshot]);

    const resetGuestData = () => {
        saveLocalDbSnapshot(createDefaultLocalDbSnapshot());
        window.location.reload();
    };

    return (
        <StyledSection>
            <StyledContainer>
                <PageHero eyebrow="MY PAGE" title="계정 관리" subtitle={storageModeLabel} />

                <StyledCard>
                    <StyledCardTitle>사용 상태</StyledCardTitle>
                    <StyledRow>
                        <StyledLabel>세션 상태</StyledLabel>
                        <StyledValue>{status}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>별명</StyledLabel>
                        <StyledValue>{session?.user?.name ?? '게스트'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>이메일</StyledLabel>
                        <StyledValue>{session?.user?.email ?? '-'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>권한</StyledLabel>
                        <StyledValue>{session?.user?.role ?? '없음'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>매장 ID</StyledLabel>
                        <StyledValue>{session?.user?.storeId ?? '-'}</StyledValue>
                    </StyledRow>
                </StyledCard>

                <StyledCard>
                    <StyledCardTitle>로그인 계정</StyledCardTitle>
                    <StyledRow>
                        <StyledLabel>연결된 SNS</StyledLabel>
                        <StyledValue>
                            {linkedProvider
                                ? PROVIDER_LABELS[linkedProvider] ?? linkedProvider
                                : '-'}
                        </StyledValue>
                    </StyledRow>
                    {!!session?.user && (
                        <StyledButtonRow>
                            <StyledActionButton type="button" onClick={() => signOut({callbackUrl: '/login'})}>
                                <AuthActionIcon direction="logout" />
                                <span>로그아웃</span>
                            </StyledActionButton>
                        </StyledButtonRow>
                    )}
                </StyledCard>

                {isLocalMode && effectiveLocalSnapshot && (
                    <StyledCard>
                        <StyledCardTitle>게스트 저장 데이터</StyledCardTitle>
                        <StyledGrid>
                            <StyledMetric>
                                <strong>{localSummary.customers}</strong>
                                <span>고객</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.reservations}</strong>
                                <span>예약</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.history}</strong>
                                <span>이력</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.services}</strong>
                                <span>서비스</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.designers}</strong>
                                <span>디자이너</span>
                            </StyledMetric>
                        </StyledGrid>
                        <StyledHint>
                            게스트 모드 데이터는 현재 브라우저의 `localStorage`에만 저장됩니다.
                        </StyledHint>
                        <StyledDangerButton type="button" onClick={resetGuestData}>
                            게스트 데이터 초기화
                        </StyledDangerButton>
                    </StyledCard>
                )}
                <StyledFooterCs>Take a seat CS: <a href="mailto:takeaseat.cs@gmail.com">takeaseat.cs@gmail.com</a></StyledFooterCs>
            </StyledContainer>
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={storeCustomerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => closeReservationDetail(index)}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={updateReservation}
                                   onCancel={cancelReservation}
                                   onRestore={restoreReservation}/>
            ))}
            {selectedCustomerId !== null && storeCustomerMap[selectedCustomerId] && (
                <CustomerDetail customer={storeCustomerMap[selectedCustomerId]}
                                reservationMap={storeReservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default MyPage;

export const getServerSideProps: GetServerSideProps<MyPageProps> = async (ctx) => {
    const session = await auth(ctx);
    let linkedProvider: string | null = null;

    if (session?.user?.id) {
        const account = await prisma.authAccount.findUnique({
            where: {userId: session.user.id},
            select: {provider: true},
        });
        linkedProvider = account?.provider ?? null;
    }

    return {
        props: {
            linkedProvider,
        }
    };
};

const StyledSection = styled.section`
    flex: 1;
    box-sizing: border-box;
`;

const StyledContainer = styled.div`
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 8px;
    box-sizing: border-box;
`;


const StyledCard = styled.div`
    margin-top: 8px;
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: var(--card-radius);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
`;

const StyledCardTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 18px;
    color: #111827;
`;

const StyledRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid #f1f5f9;

    &:first-of-type {
        border-top: none;
        padding-top: 0;
    }
`;

const StyledLabel = styled.span`
    color: #6b7280;
    font-size: 14px;
`;

const StyledValue = styled.span`
    color: #111827;
    font-size: 14px;
    font-weight: 600;
    text-align: right;
    word-break: break-word;
`;

const StyledButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
`;

const buttonLikeStyle = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 140px;
    height: 42px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    box-sizing: border-box;
`;

const StyledActionButton = styled.button`
    ${buttonLikeStyle}
    border: none;
    background: #111827;
    color: #fff;
`;

const StyledGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
`;

const StyledMetric = styled.div`
    padding: 16px 12px;
    border-radius: 10px;
    background: #f8fafc;
    text-align: center;

    strong {
        display: block;
        font-size: 24px;
        color: #111827;
    }

    span {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: #6b7280;
    }
`;

const StyledHint = styled.p`
    margin: 14px 0 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
`;

const StyledDangerButton = styled.button`
    margin-top: 14px;
    ${buttonLikeStyle}
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #be123c;
`;

const StyledFooterCs = styled.p`
    margin: auto 0 0;
    padding: 24px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--dark-gray-color2);

    a {
        color: inherit;
        text-decoration: none;
        font-weight: 600;

        @media (hover: hover) and (pointer: fine) {
            &:hover { text-decoration: underline; }
        }
    }
`;
