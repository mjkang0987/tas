import {useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';
import {useRouter} from 'next/router';
import Head from 'next/head';

import styled from 'styled-components';

import {getPageSession} from '../lib/page-data';
import {FieldError} from '../components/ui/FieldError';
import {DEFAULT_SERVICES, SHOP_CATEGORY_COLOR_MAP} from '../features/services/default-services';
import type {ShopType} from '../features/services/default-services';
import {createDefaultSchedule, getDesignerColor} from '../utils/designers';
import {loadLocalDbSnapshot, saveLocalDbSnapshot} from '../lib/local-db';
import {formatDuration, formatPrice} from '../utils/services';
import type {ServiceItem} from '../utils/services';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type ExtShopType = ShopType | 'etc';

interface LocalDesigner {
    id: number;
    name: string;
    color: string;
}

interface AddServiceState {
    category: string;
    name: string;
    durationMinutes: string;
    price: string;
    newCategory: string;
}

const SHOP_TYPES: {type: ExtShopType; label: string; emoji: string; desc: string}[] = [
    {type: 'hair', label: '헤어샵', emoji: '✂️', desc: '커트·펌·염색·클리닉'},
    {type: 'nail', label: '네일샵', emoji: '💅', desc: '젤네일·케어·아트'},
    {type: 'waxing', label: '왁싱샵', emoji: '🪷', desc: '바디·페이스 왁싱'},
    {type: 'lash', label: '속눈썹샵', emoji: '👁️', desc: '연장·펌·리무브'},
    {type: 'skin', label: '피부관리실', emoji: '🧴', desc: '기본·스페셜·클렌징'},
    {type: 'etc', label: '기타', emoji: '🏪', desc: '기타 업종'},
];

const STEP_LABELS: Record<OnboardingStep, string> = {
    1: '매장 정보',
    2: '서비스 설정',
    3: '디자이너 등록',
    4: '네이버 예약',
    5: '설정 완료',
};

const DEFAULT_DESIGNER_ID_START = 1;

const OnboardingPage: NextPage<{guest?: boolean}> = ({guest}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // ── Step navigation ──
    const [step, setStep] = useState<OnboardingStep>(1);

    // ── Step 1 ──
    const [shopName, setShopName] = useState('');
    const [shopType, setShopType] = useState<ExtShopType | null>(null);
    const [step1Error, setStep1Error] = useState('');

    // ── Step 2 ──
    const [localServices, setLocalServices] = useState<ServiceItem[]>([]);
    const [addSvc, setAddSvc] = useState<AddServiceState | null>(null);
    const [step2Error, setStep2Error] = useState('');

    // ── Step 3 ──
    const [localDesigners, setLocalDesigners] = useState<LocalDesigner[]>([
        {id: DEFAULT_DESIGNER_ID_START, name: '원장', color: getDesignerColor({id: DEFAULT_DESIGNER_ID_START})},
    ]);
    const [showAddDesigner, setShowAddDesigner] = useState(false);
    const [newDesignerName, setNewDesignerName] = useState('');
    const [newDesignerColor, setNewDesignerColor] = useState(
        getDesignerColor({id: DEFAULT_DESIGNER_ID_START + 1})
    );
    const [step3Error, setStep3Error] = useState('');
    const [editingDesignerId, setEditingDesignerId] = useState<number | null>(null);
    const [editingDesignerName, setEditingDesignerName] = useState('');

    // ── Step 5 ──
    const [finalError, setFinalError] = useState('');

    // ── Step 4 ──
    const [naverChoice, setNaverChoice] = useState<'yes' | 'no' | null>(null);

    // ── Computed ──
    const skipServiceStep = !shopType || shopType === 'etc';

    const prevStep = (): OnboardingStep => {
        if (step === 5) return 4;
        if (step === 4) return 3;
        if (step === 3) return skipServiceStep ? 1 : 2;
        if (step === 2) return 1;
        return 1;
    };

    const clearErrors = () => {
        setStep1Error('');
        setStep2Error('');
        setStep3Error('');
    };

    // ── Step 1 handlers ──
    const handleStep1Next = () => {
        if (!shopName.trim()) {
            setStep1Error('등록된 매장 이름이 없습니다.');
            return;
        }
        if (!shopType) {
            setStep1Error('업종을 선택해 주세요.');
            return;
        }
        clearErrors();
        if (shopType !== 'etc') {
            setLocalServices(DEFAULT_SERVICES[shopType as ShopType] ?? []);
            setStep(2);
        } else {
            setStep(3);
        }
    };

    const handleStep1Skip = () => {
        clearErrors();
        setLocalServices([]);
        setStep(3);
    };

    // ── Step 2 handlers ──
    const handleRemoveService = (name: string) => {
        setLocalServices((prev) => prev.filter((s) => s.name !== name));
    };

    const handleAddService = () => {
        if (!addSvc) return;
        const category = addSvc.category === '__new'
            ? addSvc.newCategory.trim()
            : addSvc.category.trim();
        const name = addSvc.name.trim();

        if (!category) {
            setStep2Error(addSvc.category === '__new' ? '새 카테고리명을 입력해 주세요.' : '카테고리를 선택해 주세요.');
            return;
        }
        if (!name) {
            setStep2Error('서비스명을 입력해 주세요.');
            return;
        }
        if (localServices.some((s) => s.name === name)) {
            setStep2Error(`"${name}" 서비스는 이미 있습니다.`);
            return;
        }

        setLocalServices((prev) => [...prev, {
            category,
            name,
            durationMinutes: Number(addSvc.durationMinutes) || 0,
            price: Number(addSvc.price) || 0,
        }]);
        setAddSvc(null);
        setStep2Error('');
    };

    // ── Step 3 handlers ──
    const handleAddDesigner = () => {
        const name = newDesignerName.trim();
        if (!name) {
            setStep3Error('디자이너 이름을 입력해 주세요.');
            return;
        }
        if (localDesigners.some((d) => d.name === name)) {
            setStep3Error(`"${name}" 디자이너는 이미 있습니다.`);
            return;
        }
        const newId = Math.max(...localDesigners.map((d) => d.id)) + 1;
        setLocalDesigners((prev) => [...prev, {id: newId, name, color: newDesignerColor}]);
        setNewDesignerName('');
        setNewDesignerColor(getDesignerColor({id: newId + 1}));
        setShowAddDesigner(false);
        setStep3Error('');
    };

    const handleRemoveDesigner = (id: number) => {
        setLocalDesigners((prev) => prev.filter((d) => d.id !== id));
        setStep3Error('');
    };

    const handleUpdateDesignerColor = (id: number, color: string) => {
        setLocalDesigners((prev) => prev.map((d) => d.id === id ? {...d, color} : d));
    };

    const handleStartEditDesignerName = (d: LocalDesigner) => {
        setEditingDesignerId(d.id);
        setEditingDesignerName(d.name);
        setStep3Error('');
    };

    const handleSaveDesignerName = (id: number) => {
        const name = editingDesignerName.trim();
        if (!name) { setStep3Error('디자이너 이름을 입력해 주세요.'); return; }
        if (localDesigners.some((d) => d.name === name && d.id !== id)) {
            setStep3Error(`"${name}" 디자이너는 이미 있습니다.`); return;
        }
        setLocalDesigners((prev) => prev.map((d) => d.id === id ? {...d, name} : d));
        setEditingDesignerId(null);
        setStep3Error('');
    };

    // ── Final submit ──
    const handleComplete = async () => {
        setLoading(true);
        clearErrors();

        try {
            if (guest) {
                const snapshot = loadLocalDbSnapshot();
                if (shopName.trim()) snapshot.storeName = shopName.trim();
                snapshot.shopType = shopType && shopType !== 'etc' ? shopType : undefined;
                snapshot.services = localServices;
                snapshot.categoryBaseColors = (shopType && shopType !== 'etc')
                    ? (SHOP_CATEGORY_COLOR_MAP[shopType as ShopType] ?? {})
                    : {};
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
                router.replace('/');
                return;
            }

            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    shopName: shopName.trim(),
                    shopType: shopType && shopType !== 'etc' ? shopType : null,
                    services: localServices,
                    designers: localDesigners.map((d) => ({name: d.name, color: d.color})),
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setFinalError(data.error ?? '오류가 발생했습니다.');
                return;
            }

            router.replace('/');
        } catch {
            setFinalError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // ── Grouped services for step 2 ──
    const groupedServices = localServices.reduce<Record<string, ServiceItem[]>>((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});
    const serviceCategories = Object.keys(groupedServices);

    return (
        <StyledPage>
            <Head>
                <title>TAS | 초기 설정</title>
            </Head>
            <StyledCard $wide={step === 2 || step === 3}>
                {/* Header */}
                <StyledCardHeader>
                    <StyledLogo>TAS</StyledLogo>
                    <StyledStepRow>
                        {([1, 2, 3, 4, 5] as OnboardingStep[]).map((s) => (
                            <StyledStepDot key={s} $active={s === step} $done={s < step} />
                        ))}
                    </StyledStepRow>
                    <StyledStepLabel>{STEP_LABELS[step]}</StyledStepLabel>
                </StyledCardHeader>

                {/* ── Step 1: 매장 정보 ── */}
                {step === 1 && (
                    <StyledStepBody>
                        <StyledSection>
                            <StyledLabel htmlFor="shop-name">샵 이름</StyledLabel>
                            <StyledInput
                                id="shop-name"
                                type="text"
                                value={shopName}
                                onChange={(e) => {
                                    setShopName(e.target.value);
                                    setStep1Error('');
                                }}
                                placeholder="예) 홍길동 헤어샵"
                                autoFocus
                            />
                        </StyledSection>

                        <StyledSection>
                            <StyledLabel>업종</StyledLabel>
                            <StyledTypeGrid>
                                {SHOP_TYPES.map(({type, label, emoji, desc}) => (
                                    <StyledTypeCard
                                        key={type}
                                        type="button"
                                        $selected={shopType === type}
                                        onClick={() => {
                                            setShopType(type);
                                            setStep1Error('');
                                        }}
                                    >
                                        <StyledTypeEmoji>{emoji}</StyledTypeEmoji>
                                        <StyledTypeLabel>{label}</StyledTypeLabel>
                                        <StyledTypeDesc>{desc}</StyledTypeDesc>
                                    </StyledTypeCard>
                                ))}
                            </StyledTypeGrid>
                        </StyledSection>

                        <FieldError>{step1Error}</FieldError>

                        <StyledNavRow>
                            <StyledSkipBtn type="button" onClick={handleStep1Skip}>건너뛰기</StyledSkipBtn>
                            <StyledNextBtn type="button" onClick={handleStep1Next}>다음</StyledNextBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}

                {/* ── Step 2: 서비스 설정 ── */}
                {step === 2 && (
                    <StyledStepBody>
                        <StyledSectionNote>
                            업종별 기본 서비스 목록입니다. 수정 후 적용하거나 건너뛸 수 있습니다.
                        </StyledSectionNote>

                        <StyledServiceList>
                            {serviceCategories.length === 0 && (
                                <StyledEmpty>서비스가 없습니다. 아래에서 추가해 주세요.</StyledEmpty>
                            )}
                            {serviceCategories.map((cat) => (
                                <StyledCategoryGroup key={cat}>
                                    <StyledCategoryName>{cat}</StyledCategoryName>
                                    {(groupedServices[cat] ?? []).map((item) => (
                                        <StyledServiceRow key={item.name}>
                                            <StyledServiceInfo>
                                                <StyledServiceName>{item.name}</StyledServiceName>
                                                <StyledServiceMeta>
                                                    {item.durationMinutes > 0 && formatDuration(item.durationMinutes)}
                                                    {item.durationMinutes > 0 && item.price > 0 && ' · '}
                                                    {item.price > 0 && formatPrice(item.price)}
                                                </StyledServiceMeta>
                                            </StyledServiceInfo>
                                            <StyledRemoveBtn
                                                type="button"
                                                onClick={() => handleRemoveService(item.name)}
                                                aria-label={`${item.name} 삭제`}
                                            >
                                                ×
                                            </StyledRemoveBtn>
                                        </StyledServiceRow>
                                    ))}
                                </StyledCategoryGroup>
                            ))}
                        </StyledServiceList>

                        {addSvc ? (
                            <StyledAddForm>
                                <StyledAddFormRow>
                                    <select
                                        value={addSvc.category}
                                        onChange={(e) => setAddSvc({...addSvc, category: e.target.value, newCategory: ''})}
                                    >
                                        <option value="">카테고리 선택</option>
                                        {serviceCategories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="__new">+ 새 카테고리</option>
                                    </select>
                                    {addSvc.category === '__new' && (
                                        <StyledAddInput
                                            value={addSvc.newCategory}
                                            onChange={(e) => setAddSvc({...addSvc, newCategory: e.target.value})}
                                            placeholder="카테고리명"
                                        />
                                    )}
                                </StyledAddFormRow>
                                <StyledAddFormRow>
                                    <StyledAddInput
                                        value={addSvc.name}
                                        onChange={(e) => { setAddSvc({...addSvc, name: e.target.value}); setStep2Error(''); }}
                                        placeholder="서비스명 *"
                                    />
                                    <StyledAddInput
                                        type="number"
                                        value={addSvc.durationMinutes}
                                        onChange={(e) => setAddSvc({...addSvc, durationMinutes: e.target.value})}
                                        placeholder="소요(분)"
                                    />
                                    <StyledAddInput
                                        type="number"
                                        value={addSvc.price}
                                        onChange={(e) => setAddSvc({...addSvc, price: e.target.value})}
                                        placeholder="가격(원)"
                                    />
                                </StyledAddFormRow>
                                <FieldError variant="inline">{step2Error}</FieldError>
                                <StyledAddFormActions>
                                    <StyledCancelBtnSm type="button" onClick={() => { setAddSvc(null); setStep2Error(''); }}>취소</StyledCancelBtnSm>
                                    <StyledConfirmBtnSm type="button" onClick={handleAddService}>추가</StyledConfirmBtnSm>
                                </StyledAddFormActions>
                            </StyledAddForm>
                        ) : (
                            <StyledAddServiceBtn
                                type="button"
                                onClick={() => setAddSvc({category: serviceCategories[0] ?? '', name: '', durationMinutes: '', price: '', newCategory: ''})}
                            >
                                + 서비스 추가
                            </StyledAddServiceBtn>
                        )}

                        <StyledNavRow>
                            <StyledBackBtn type="button" onClick={() => { clearErrors(); setStep(prevStep()); }}>← 이전</StyledBackBtn>
                            <StyledSkipBtn type="button" onClick={() => { clearErrors(); setLocalServices([]); setStep(3); }}>건너뛰기</StyledSkipBtn>
                            <StyledNextBtn type="button" onClick={() => { clearErrors(); setStep(3); }}>적용</StyledNextBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}

                {/* ── Step 3: 디자이너 등록 ── */}
                {step === 3 && (
                    <StyledStepBody>
                        <StyledSectionNote>
                            디자이너를 등록하세요. 나중에 설정에서 수정할 수 있습니다.
                        </StyledSectionNote>

                        <StyledDesignerList>
                            {localDesigners.map((d) => (
                                <StyledDesignerRow key={d.id}>
                                    <StyledDesignerColorDot style={{background: d.color}} />
                                    {editingDesignerId === d.id ? (
                                        <StyledDesignerEditInput
                                            value={editingDesignerName}
                                            onChange={(e) => { setEditingDesignerName(e.target.value); setStep3Error(''); }}
                                            onBlur={() => handleSaveDesignerName(d.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveDesignerName(d.id);
                                                if (e.key === 'Escape') { setEditingDesignerId(null); setStep3Error(''); }
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <StyledDesignerName
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleStartEditDesignerName(d)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleStartEditDesignerName(d)}
                                            title="클릭하여 이름 수정"
                                        >
                                            {d.name}
                                        </StyledDesignerName>
                                    )}
                                    <StyledDesignerColorPicker
                                        type="color"
                                        value={d.color}
                                        onChange={(e) => handleUpdateDesignerColor(d.id, e.target.value)}
                                        title="컬러 변경"
                                    />
                                    {localDesigners.length > 1 && (
                                        <StyledRemoveBtn
                                            type="button"
                                            onClick={() => handleRemoveDesigner(d.id)}
                                            aria-label={`${d.name} 삭제`}
                                        >
                                            ×
                                        </StyledRemoveBtn>
                                    )}
                                </StyledDesignerRow>
                            ))}
                        </StyledDesignerList>

                        {!showAddDesigner && <FieldError variant="inline">{step3Error}</FieldError>}

                        {showAddDesigner ? (
                            <StyledAddForm>
                                <StyledAddFormRow>
                                    <StyledAddInput
                                        value={newDesignerName}
                                        onChange={(e) => { setNewDesignerName(e.target.value); setStep3Error(''); }}
                                        placeholder="디자이너명 *"
                                        autoFocus
                                    />
                                    <StyledDesignerColorPicker
                                        type="color"
                                        value={newDesignerColor}
                                        onChange={(e) => setNewDesignerColor(e.target.value)}
                                        title="컬러"
                                    />
                                </StyledAddFormRow>
                                <FieldError variant="inline">{step3Error}</FieldError>
                                <StyledAddFormActions>
                                    <StyledCancelBtnSm type="button" onClick={() => { setShowAddDesigner(false); setNewDesignerName(''); setStep3Error(''); }}>취소</StyledCancelBtnSm>
                                    <StyledConfirmBtnSm type="button" onClick={handleAddDesigner}>추가</StyledConfirmBtnSm>
                                </StyledAddFormActions>
                            </StyledAddForm>
                        ) : (
                            <StyledAddServiceBtn type="button" onClick={() => setShowAddDesigner(true)}>
                                + 디자이너 추가
                            </StyledAddServiceBtn>
                        )}

                        <StyledNavRow>
                            <StyledBackBtn type="button" onClick={() => { clearErrors(); setStep(prevStep()); }}>← 이전</StyledBackBtn>
                            <StyledSkipBtn type="button" onClick={() => { clearErrors(); setStep(4); }}>건너뛰기</StyledSkipBtn>
                            <StyledNextBtn type="button" onClick={() => { clearErrors(); setStep(4); }}>다음</StyledNextBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}

                {/* ── Step 4: 네이버 예약 ── */}
                {step === 4 && (
                    <StyledStepBody>
                        <StyledNaverSection>
                            <StyledNaverQuestion>네이버 예약 연동을 사용하시나요?</StyledNaverQuestion>
                            <StyledNaverBtns>
                                <StyledNaverBtn
                                    type="button"
                                    $active={naverChoice === 'yes'}
                                    onClick={() => setNaverChoice('yes')}
                                >
                                    사용합니다
                                </StyledNaverBtn>
                                <StyledNaverBtn
                                    type="button"
                                    $active={naverChoice === 'no'}
                                    onClick={() => setNaverChoice('no')}
                                >
                                    사용 안 합니다
                                </StyledNaverBtn>
                            </StyledNaverBtns>

                            {naverChoice === 'yes' && (
                                <StyledNaverGuide>
                                    <StyledNaverGuideTitle>네이버 예약 연동 방법</StyledNaverGuideTitle>
                                    <ol>
                                        <li>네이버 스마트플레이스에서 <strong>예약</strong> 서비스를 활성화합니다.</li>
                                        <li>TAS 설정 → <strong>네이버 예약 연동</strong> 메뉴에서 연동 코드를 입력합니다.</li>
                                        <li>연동 완료 후 네이버를 통한 예약이 자동으로 동기화됩니다.</li>
                                    </ol>
                                </StyledNaverGuide>
                            )}
                        </StyledNaverSection>

                        <StyledNavRow>
                            <StyledBackBtn type="button" onClick={() => { clearErrors(); setStep(prevStep()); }}>← 이전</StyledBackBtn>
                            <StyledSkipBtn type="button" onClick={() => { clearErrors(); setStep(5); }}>건너뛰기</StyledSkipBtn>
                            <StyledNextBtn type="button" onClick={() => { clearErrors(); setStep(5); }}>다음</StyledNextBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}

                {/* ── Step 5: 설정 완료 ── */}
                {step === 5 && (
                    <StyledStepBody>
                        <StyledCompleteSection>
                            <StyledCompleteIcon>✓</StyledCompleteIcon>
                            <StyledCompleteTitle>매장 설정이 완료되었습니다.</StyledCompleteTitle>
                            <StyledCompleteSummary>
                                {shopName.trim() && (
                                    <StyledSummaryRow>
                                        <span>매장명</span>
                                        <strong>{shopName.trim()}</strong>
                                    </StyledSummaryRow>
                                )}
                                {shopType && shopType !== 'etc' && (
                                    <StyledSummaryRow>
                                        <span>업종</span>
                                        <strong>{SHOP_TYPES.find((t) => t.type === shopType)?.label}</strong>
                                    </StyledSummaryRow>
                                )}
                                <StyledSummaryRow>
                                    <span>서비스</span>
                                    <strong>{localServices.length}개</strong>
                                </StyledSummaryRow>
                                <StyledSummaryRow>
                                    <span>디자이너</span>
                                    <strong>{localDesigners.length}명</strong>
                                </StyledSummaryRow>
                            </StyledCompleteSummary>
                        </StyledCompleteSection>

                        <FieldError>{finalError}</FieldError>

                        <StyledNavRow $centered>
                            <StyledBackBtn type="button" onClick={() => { clearErrors(); setStep(prevStep()); }}>← 이전</StyledBackBtn>
                            <StyledSubmitBtn type="button" onClick={handleComplete} disabled={loading}>
                                {loading ? '설정 중...' : '시작하기'}
                            </StyledSubmitBtn>
                        </StyledNavRow>
                    </StyledStepBody>
                )}
            </StyledCard>
        </StyledPage>
    );
};

export default OnboardingPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    if (ctx.query.mode === 'guest') {
        return {props: {guest: true}};
    }

    const session = await getPageSession(ctx);

    if (!session) {
        return {redirect: {destination: '/login', permanent: false}};
    }
    if (session.onboarded) {
        return {redirect: {destination: '/', permanent: false}};
    }

    return {props: {}};
};

/* ── Styled Components ── */

const StyledPage = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 100%;
    padding: 24px 16px;
    box-sizing: border-box;
`;

const StyledCard = styled.div<{$wide?: boolean}>`
    width: 100%;
    max-width: ${({$wide}) => $wide ? '640px' : '520px'};
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 32px 28px;
    background: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: max-width 0.2s ease;

    @media (max-width: 480px) {
        padding: 24px 18px;
        gap: 16px;
    }
`;

const StyledCardHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledLogo = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: var(--blue-color);
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

const StyledStepBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledSectionNote = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.5;
`;

const StyledLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledInput = styled.input`
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;

    &::placeholder { color: var(--gray-color); }
    &:focus { border-color: var(--blue-color); }
`;

const StyledTypeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const StyledTypeCard = styled.button<{$selected: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 8px;
    border: 2px solid ${(p) => p.$selected ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-lg);
    background: ${(p) => p.$selected ? 'rgba(45, 127, 249, 0.06)' : 'var(--white-color)'};
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--blue-color);
            background: rgba(45, 127, 249, 0.04);
        }
    }
`;

const StyledTypeEmoji = styled.span`
    font-size: 24px;
    line-height: 1;
`;

const StyledTypeLabel = styled.strong`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledTypeDesc = styled.span`
    font-size: 10px;
    color: var(--dark-gray-color2);
    text-align: center;
    line-height: 1.4;
`;

/* ── Service list ── */

const StyledServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 4px;
`;

const StyledEmpty = styled.div`
    padding: 20px;
    text-align: center;
    font-size: 13px;
    color: var(--dark-gray-color2);
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
`;

const StyledCategoryGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledCategoryName = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--dark-gray-color2);
    padding: 6px 0 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const StyledServiceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    background: var(--gray-color2);
`;

const StyledServiceInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledServiceName = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--dark-gray-color);
`;

const StyledServiceMeta = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
    flex-shrink: 0;
`;

/* ── Designer list ── */

const StyledDesignerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledDesignerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    border: 1px solid var(--light-gray-color);
`;

const StyledDesignerColorDot = styled.span`
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
`;

const StyledDesignerName = styled.span`
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: text;
    border-radius: var(--radius-sm);
    padding: 2px 4px;

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--light-gray-color); }
    }
`;

const StyledDesignerEditInput = styled.input`
    flex: 1;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--blue-color);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
    background: var(--white-color);
    outline: none;
    box-sizing: border-box;
`;

const StyledDesignerColorPicker = styled.input`
    width: 28px;
    height: 28px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    cursor: pointer;
    flex-shrink: 0;
`;

/* ── Add forms ── */

const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--gray-color2);
`;

const StyledAddFormRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;

    select {
        flex: 1;
        min-width: 120px;
        height: 34px;
        padding: 0 8px;
        border: 1px solid var(--light-gray-color);
        border-radius: var(--radius-sm);
        font-size: 13px;
        background: var(--white-color);
        outline: none;

        &:focus { border-color: var(--blue-color); }
    }
`;

const StyledAddInput = styled.input`
    flex: 1;
    min-width: 80px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    font-size: 13px;
    background: var(--white-color);
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: var(--blue-color); }
`;

const StyledAddFormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
`;

const StyledCancelBtnSm = styled.button`
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledConfirmBtnSm = styled.button`
    height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--brand-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
`;

const StyledAddServiceBtn = styled.button`
    width: 100%;
    height: 36px;
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--blue-color);
            color: var(--blue-color);
        }
    }
`;

const StyledRemoveBtn = styled.button`
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--danger-border); color: var(--danger-color); }
    }
`;

/* ── Naver step ── */

const StyledNaverSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const StyledNaverQuestion = styled.p`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledNaverBtns = styled.div`
    display: flex;
    gap: 10px;
`;

const StyledNaverBtn = styled.button<{$active: boolean}>`
    flex: 1;
    height: 44px;
    border: 2px solid ${({$active}) => $active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-md);
    background: ${({$active}) => $active ? 'rgba(45,127,249,0.07)' : 'var(--white-color)'};
    font-size: 14px;
    font-weight: ${({$active}) => $active ? 700 : 500};
    color: ${({$active}) => $active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
`;

const StyledNaverGuide = styled.div`
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: rgba(45, 127, 249, 0.05);
    border: 1px solid rgba(45, 127, 249, 0.15);

    ol {
        margin: 8px 0 0;
        padding: 0 0 0 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    li {
        font-size: 13px;
        color: var(--dark-gray-color);
        line-height: 1.5;
    }
`;

const StyledNaverGuideTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--blue-color);
`;

/* ── Complete step ── */

const StyledCompleteSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 0;
`;

const StyledCompleteIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--success-bg);
    color: var(--success-color);
    font-size: 28px;
    font-weight: 700;
`;

const StyledCompleteTitle = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--black-color);
    text-align: center;
`;

const StyledCompleteSummary = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    border: 1px solid var(--light-gray-color);
`;

const StyledSummaryRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    span {
        font-size: 13px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 600;
    }
`;

/* ── Navigation ── */

const StyledNavRow = styled.div<{$centered?: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    justify-content: ${({$centered}) => $centered ? 'center' : 'flex-end'};
`;

const StyledBackBtn = styled.button`
    height: 40px;
    padding: 0 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;
    margin-right: auto;
`;

const StyledSkipBtn = styled.button`
    height: 40px;
    padding: 0 14px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color2);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { color: var(--dark-gray-color); }
    }
`;

const StyledNextBtn = styled.button`
    height: 40px;
    padding: 0 20px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand-color);
    font-size: 14px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    transition: opacity 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.88; }
    }
`;

const StyledSubmitBtn = styled.button`
    height: 48px;
    padding: 0 32px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand-color);
    font-size: 15px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.6; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) { opacity: 0.88; }
    }
`;
