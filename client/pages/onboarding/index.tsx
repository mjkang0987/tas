import {useEffect, useMemo, useRef, useState} from 'react';

import type {NextPage} from 'next';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';

import styled from 'styled-components';
import {GuestNotice} from '../../components/ui/GuestNotice';
import {DEFAULT_SERVICES, SHOP_CATEGORY_COLOR_MAP} from '../../features/services/default-services';
import type {ShopType} from '../../features/services/default-services';
import {createDefaultSchedule, getDesignerColor} from '../../utils/designers';
import {clearGuestConsentAck, createDefaultLocalDbSnapshot, loadLocalDbSnapshot, saveLocalDbSnapshot, setGuestTermsAgreed} from '../../lib/local-db';
import {CURRENT_TERMS_VERSION} from '../../utils/terms';
import type {ServiceItem} from '../../utils/services';
import {SeoHead} from '../../components/ui/SeoHead';
import {AdBanner} from '../../components/ad/AdBanner';
import {ConfirmDialog} from '../../components/ui/ConfirmDialog';
import type {OnboardingStep, ExtShopType, LocalDesigner} from '../../components/onboarding/onboarding-types';
import {DEFAULT_DESIGNER_ID_START, STEP_LABELS} from '../../components/onboarding/onboarding-types';
import {StyledNavRow, StyledSkipBtn, StyledNextBtn, StyledHighlight} from '../../components/onboarding/onboarding-step-styles';
import {OnboardingStep1} from '../../components/onboarding/OnboardingStep1';
import {OnboardingStep2} from '../../components/onboarding/OnboardingStep2';
import {OnboardingStep3} from '../../components/onboarding/OnboardingStep3';
import {OnboardingStep4} from '../../components/onboarding/OnboardingStep4';
import {OnboardingStep5} from '../../components/onboarding/OnboardingStep5';

const OnboardingPage: NextPage = () => {
    const router = useRouter();
    const {data: session, status, update} = useSession();
    const guest = router.pathname === '/onboarding/guest';
    const [loading, setLoading] = useState(false);

    // 진입 시 세션(JWT)을 1회 갱신 — DB는 onboarded=true인데 JWT가 stale인 경우 자가 복구
    const refreshedRef = useRef(false);
    useEffect(() => {
        if (guest || status !== 'authenticated' || refreshedRef.current) return;
        refreshedRef.current = true;
        void update();
    }, [guest, status, update]);

    useEffect(() => {
        if (status === 'loading') return;
        if (guest) return;
        if (!session) { router.replace('/login'); return; }
        if (session.user?.onboarded) {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.replace('/');
        }
    }, [status, session, guest, router]);

    const [step, setStep] = useState<OnboardingStep>(0);

    useEffect(() => {
        setStep(guest ? 0 : 1);
    }, [guest]);

    const [shopName, setShopName] = useState('');
    const [shopTypes, setShopTypes] = useState<ExtShopType[]>([]);
    const [step1Error, setStep1Error] = useState('');
    const [shopNameError, setShopNameError] = useState('');

    const [localServices, setLocalServices] = useState<ServiceItem[]>([]);

    const [localDesigners, setLocalDesigners] = useState<LocalDesigner[]>([
        {id: DEFAULT_DESIGNER_ID_START, name: '원장', color: getDesignerColor({id: DEFAULT_DESIGNER_ID_START})},
    ]);

    const [finalError, setFinalError] = useState('');
    const [showSetupLayer, setShowSetupLayer] = useState(false);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);

    const realShopTypes = shopTypes.filter((t): t is ShopType => t !== 'etc');
    const skipServiceStep = realShopTypes.length === 0;
    const mergedCategoryColors = useMemo(() => {
        const colors: Record<string, string> = {};
        for (const t of realShopTypes) Object.assign(colors, SHOP_CATEGORY_COLOR_MAP[t] ?? {});
        return colors;
    }, [realShopTypes]);

    const prevStep = (): OnboardingStep => {
        if (step === 5) return 4;
        if (step === 4) return 3;
        if (step === 3) return skipServiceStep ? 1 : 2;
        if (step === 2) return 1;
        if (step === 1 && guest) return 0;
        return 1;
    };

    const clearStep1Errors = () => {
        setStep1Error('');
        setShopNameError('');
    };

    const toggleShopType = (type: ExtShopType) => {
        setShopTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
        setStep1Error('');
    };

    const handleStep1Next = () => {
        if (!shopName.trim()) {
            setShopNameError('샵 이름을 입력해 주세요.');
            return;
        }
        if (shopTypes.length === 0) {
            setStep1Error('업종을 선택해 주세요.');
            return;
        }
        clearStep1Errors();
        if (realShopTypes.length > 0) {
            const merged = realShopTypes.flatMap((t) => DEFAULT_SERVICES[t] ?? []);
            const unique = merged.filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
            setLocalServices(unique);
            setStep(2);
        } else {
            setStep(3);
        }
    };

    const handleSkipOnboarding = () => {
        const snapshot = loadLocalDbSnapshot();
        snapshot.onboarded = true;
        saveLocalDbSnapshot(snapshot);
        if (guest) {
            // 서비스 개시 시점에 약관 동의 영구 기록 (consent 단계의 세션 ack 정리)
            setGuestTermsAgreed(CURRENT_TERMS_VERSION);
            clearGuestConsentAck();
            // 하드 리로드로 store를 갱신 (router.replace는 _app 재hydrate가 안 돌아 매장정보가 안 들어옴)
            window.location.href = '/';
            return;
        }
        router.replace('/');
    };

    const handleConfirmSkip = () => {
        setShowSkipConfirm(false);
        handleSkipOnboarding();
    };

    const handleComplete = async () => {
        setLoading(true);
        clearStep1Errors();
        setFinalError('');

        try {
            if (guest) {
                // fresh=1: 기존 게스트 데이터를 불러오지 않고 새로 작성 (로그인 페이지에서 '아니오' 선택)
                const snapshot = router.query.fresh === '1'
                    ? createDefaultLocalDbSnapshot()
                    : loadLocalDbSnapshot();
                if (shopName.trim()) snapshot.storeName = shopName.trim();
                snapshot.shopType = realShopTypes.length > 0 ? realShopTypes.join(',') : undefined;
                snapshot.services = localServices;
                const mergedColors: Record<string, string> = {};
                for (const t of realShopTypes) {
                    Object.assign(mergedColors, SHOP_CATEGORY_COLOR_MAP[t] ?? {});
                }
                snapshot.categoryBaseColors = mergedColors;
                snapshot.designers = localDesigners.map((d) => ({
                    id: d.id,
                    name: d.name,
                    schedule: createDefaultSchedule(),
                    status: '재직' as const,
                    phone: '',
                    note: '',
                    color: d.color,
                }));
                snapshot.onboarded = true;
                saveLocalDbSnapshot(snapshot);
                // 서비스 개시 시점에 약관 동의 영구 기록 (consent 단계의 세션 ack 정리)
                setGuestTermsAgreed(CURRENT_TERMS_VERSION);
                clearGuestConsentAck();
                // 하드 리로드로 store를 갱신 (router.replace는 _app 재hydrate가 안 돌아 매장정보가 안 들어옴)
                window.location.href = '/';
                return;
            }

            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    shopName: shopName.trim(),
                    shopType: realShopTypes.length > 0 ? realShopTypes.join(',') : null,
                    services: localServices,
                    designers: localDesigners.map((d) => ({name: d.name, color: d.color})),
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // 이미 설정된 매장(JWT만 stale onboarded=false) → 세션 갱신 후 홈으로 (레이어 막다른 길 방지)
                if (res.status === 409) { await update(); router.replace('/'); return; }
                setFinalError(data.error ?? '오류가 발생했습니다.');
                return;
            }

            // 세션(JWT) 갱신 → onboarded 반영 후 진입 (없으면 미들웨어가 계속 /onboarding으로 보냄)
            await update();
            router.replace('/');
        } catch {
            setFinalError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const visibleSteps: OnboardingStep[] = skipServiceStep ? [1, 3, 4, 5] : [1, 2, 3, 4, 5];
    const stepIndex = visibleSteps.indexOf(step as (typeof visibleSteps)[number]);

    return (
        <StyledPage>
            <SeoHead title="초기 설정" />
            <StyledCard>
                <StyledCardHeader>
                    <StyledBrandLogo src="/logo/logo-black.svg" alt="TAS" />
                    {step !== 0 && (
                        <StyledStepRow>
                            {visibleSteps.map((s, i) => (
                                <StyledStepDot key={s} $active={i === stepIndex} $done={i < stepIndex} />
                            ))}
                        </StyledStepRow>
                    )}
                    <StyledStepLabel>{STEP_LABELS[step]}</StyledStepLabel>
                </StyledCardHeader>

                {step === 0 && (
                    <StyledStepBody $centerContent>
                        <StyledStep0Desc>
                            <StyledHighlight>⚡ 30초 설정으로 바로 시작</StyledHighlight>
                            <span>업종별 서비스와 가격을 자동 추천해드립니다.</span>
                        </StyledStep0Desc>
                        <GuestNotice />
                        <StyledNavRow>
                            <StyledSkipBtn type="button" onClick={() => setShowSkipConfirm(true)}>건너뛰기</StyledSkipBtn>
                            <StyledNextBtn type="button" onClick={() => setStep(1)}>설정 시작</StyledNextBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}

                {step === 1 && (
                    <StyledStepBody>
                        <OnboardingStep1
                            shopName={shopName}
                            onShopNameChange={(v) => { setShopName(v); clearStep1Errors(); }}
                            shopTypes={shopTypes}
                            onToggleShopType={toggleShopType}
                            shopNameError={shopNameError}
                            shopTypeError={step1Error}
                            guest={guest}
                            onNext={handleStep1Next}
                            onSkip={() => { clearStep1Errors(); setLocalServices([]); setStep(3); }}
                            onBack={() => { clearStep1Errors(); setStep(0); }}
                        />
                    </StyledStepBody>
                )}

                {step === 2 && (
                    <StyledStepBody>
                        <OnboardingStep2
                            localServices={localServices}
                            mergedCategoryColors={mergedCategoryColors}
                            onServicesChange={setLocalServices}
                            onNext={() => setStep(3)}
                            onSkip={() => { setLocalServices([]); setStep(3); }}
                            onBack={() => setStep(prevStep())}
                        />
                    </StyledStepBody>
                )}

                {step === 3 && (
                    <StyledStepBody>
                        <OnboardingStep3
                            localDesigners={localDesigners}
                            onDesignersChange={setLocalDesigners}
                            onNext={() => setStep(4)}
                            onSkip={() => setStep(4)}
                            onBack={() => setStep(prevStep())}
                        />
                    </StyledStepBody>
                )}

                {step === 4 && (
                    <StyledStepBody>
                        <OnboardingStep4
                            guest={guest}
                            onNext={() => setStep(5)}
                            onBack={() => setStep(prevStep())}
                        />
                    </StyledStepBody>
                )}

                {step === 5 && (
                    <StyledStepBody>
                        <OnboardingStep5
                            shopName={shopName}
                            realShopTypes={realShopTypes}
                            localServices={localServices}
                            localDesigners={localDesigners}
                            finalError={finalError}
                            loading={loading}
                            onComplete={handleComplete}
                            onBack={() => setStep(prevStep())}
                        />
                    </StyledStepBody>
                )}
            </StyledCard>

            <StyledAuthAd>
                <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_AUTH_SLOT ?? ''} adFormat="horizontal" />
            </StyledAuthAd>

            {showSkipConfirm && (
                <ConfirmDialog
                    title="설정을 건너뛸까요?"
                    message={'기본 설정 없이 바로 시작합니다.\n서비스·디자이너는 나중에 설정에서 추가할 수 있어요.'}
                    confirmLabel="건너뛰고 시작"
                    layerKey="onboarding-skip-confirm"
                    onConfirm={handleConfirmSkip}
                    onClose={() => setShowSkipConfirm(false)}
                />
            )}

            {showSetupLayer && (
                <ConfirmDialog
                    title="이미 설정된 매장"
                    message={'이미 디자이너·서비스가 등록된 매장입니다.\n온보딩을 다시 진행할 수 없습니다.'}
                    confirmLabel="홈으로"
                    hideCancel
                    layerKey="onboarding-setup-exists"
                    onConfirm={async () => { await update(); router.replace('/'); }}
                    onClose={async () => { await update(); router.replace('/'); }}
                />
            )}
        </StyledPage>
    );
};

export default OnboardingPage;

export const getStaticProps = () => ({props: {}});

const StyledPage = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    /* 데스크탑: 세로 가운데 정렬. 모바일은 기존대로 상단 정렬 유지. */
    justify-content: center;
    gap: 20px;
    min-height: 100%;
    padding: 24px 16px;
    box-sizing: border-box;

    /* 모바일: 풀블리드(좌우 여백 제거) + 상단 여백만 유지. 흰 배경이라 박스 없이도 풀스크린처럼 */
    @media (max-width: 640px) {
        justify-content: flex-start;
        padding: 16px 0 0;
    }
`;

const StyledAuthAd = styled.div`
    width: 100%;
    max-width: 600px;
    flex-shrink: 0;

    /* 모바일: 하단 고정(margin-top:auto) + 카드 폭에 맞춰 가로 꽉 + 좌우 인셋 */
    @media (max-width: 640px) {
        margin-top: auto;
        max-width: none;
        padding: 0 18px;
        box-sizing: border-box;
    }
`;

const StyledCard = styled.div`
    width: 100%;
    max-width: 600px;
    min-height: 480px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 32px 28px;
    background: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);

    /* 모바일: 박스 디자인(그림자·라운드·고정폭) 제거 — 흰 배경에 녹아들어 풀스크린처럼 */
    @media (max-width: 640px) {
        max-width: none;
        min-height: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 24px 18px;
        gap: 16px;
    }
`;

const StyledCardHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledBrandLogo = styled.img`
    height: 88px;
    width: auto;
    display: block;
`;

const StyledStepRow = styled.div`
    display: flex;
    gap: 6px;
`;

const StyledStepDot = styled.span<{$active: boolean; $done: boolean}>`
    display: block;
    width: ${({$active}) => $active ? '20px' : '8px'};
    height: 8px;
    border-radius: 999px;
    background: ${({$active, $done}) =>
        $active ? 'var(--brand-color)' :
        $done ? 'var(--blue-color)' :
        'var(--light-gray-color)'};
    opacity: ${({$done}) => $done ? 0.5 : 1};
    transition: width 0.2s ease, background 0.2s ease;
`;

const StyledStepLabel = styled.p`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledStepBody = styled.div<{$centerContent?: boolean}>`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    ${({$centerContent}) => $centerContent && 'justify-content: center;'}
`;

const StyledStep0Desc = styled.div`
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    line-height: 1.7;
    color: var(--dark-gray-color);
    text-align: center;
`;
