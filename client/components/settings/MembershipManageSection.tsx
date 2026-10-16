import {useCallback, useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';
import {formControlStyle, StyledFieldSelect} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';
import {cardSurfaceStyle, StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, StyledSettingsCardTitle, EMPTY_TEXT, StyledTabRow, StyledTabButton} from './settings-styles';
import {useToastStore} from '../../store/toastStore';
import {shouldUseLocalDb} from '../../lib/local-db';
import {formatPrice} from '../../utils/services';
import {CustomerAutocomplete} from '../customers/CustomerAutocomplete';
import {useIssueCustomerPicker} from '../customers/useIssueCustomerPicker';
import {useSingleFlight} from '../../hooks/useSingleFlight';
import type {MembershipProduct, CustomerMembership} from '../../features/memberships/model';
import type {PaymentMethod} from '../../utils/reservations';
import {RECEIVED_PAYMENT_METHODS} from '../../utils/reservations';
import {describeBenefitMembership} from '../../features/customers/benefits';

type Tab = 'products' | 'issue';

// 발급 내역은 이만큼씩 더 보기로 늘린다.
const ISSUED_PAGE_SIZE = 20;

interface DraftForm {
    name: string;
    totalCount: string;
    validDays: string;
    price: string;
}

const EMPTY_DRAFT: DraftForm = {name: '', totalCount: '', validDays: '', price: ''};

const MEMBERSHIP_STATUS_LABEL: Record<CustomerMembership['status'], string> = {
    active: '사용중',
    expired: '만료',
    used_up: '소진',
    cancelled: '취소',
};

function describeProduct(p: Pick<MembershipProduct, 'totalCount' | 'validDays'>): string {
    const parts: string[] = [];
    parts.push(p.totalCount != null ? `${p.totalCount}회` : '무제한');
    parts.push(p.validDays != null ? `${p.validDays}일` : '무기한');
    return parts.join(' · ');
}

export const MembershipManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const isLocal = shouldUseLocalDb();

    const [tab, setTab] = useState<Tab>('products');
    const [products, setProducts] = useState<MembershipProduct[]>([]);
    const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
    const [loading, setLoading] = useState(!isLocal);

    // 상품 폼
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
    const [error, setError] = useState('');

    // 발급 폼
    const [issueProductId, setIssueProductId] = useState('');
    // 판매 = 그날 매출(금액·결제수단), 기존 등록 = 시스템 쓰기 전에 판 회원권 옮겨 넣기(매출 없음, 남은 횟수·만료일 입력)
    const [issueMode, setIssueMode] = useState<'sale' | 'carryover'>('sale');
    const [issuePrice, setIssuePrice] = useState('');
    const [issueMethod, setIssueMethod] = useState<PaymentMethod>('카드');
    const [issueRemaining, setIssueRemaining] = useState('');
    const [issueExpiresAt, setIssueExpiresAt] = useState('');
    const [issueError, setIssueError] = useState('');
    const issueCustomer = useIssueCustomerPicker(() => setIssueError(''));
    // 발급·사용·복원·취소 중에는 다른 요청을 막는다(연타로 두 번 처리 방지).
    const flight = useSingleFlight();
    const [visibleCount, setVisibleCount] = useState(ISSUED_PAGE_SIZE);

    const fetchData = useCallback(async () => {
        if (isLocal) return;
        setLoading(true);
        try {
            const res = await fetch('/api/memberships');
            if (!res.ok) throw new Error();
            const data = await res.json() as {products: MembershipProduct[]; memberships: CustomerMembership[]};
            setProducts(data.products ?? []);
            setMemberships(data.memberships ?? []);
        } catch {
            toast('회원권 정보를 불러오지 못했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isLocal, toast]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products]);

    // ── 상품 CRUD ──
    const resetForm = () => {
        setDraft(EMPTY_DRAFT);
        setError('');
        setIsAdding(false);
        setEditingId(null);
    };

    const startEdit = (p: MembershipProduct) => {
        setEditingId(p.id);
        setIsAdding(false);
        setError('');
        setDraft({
            name: p.name,
            totalCount: p.totalCount != null ? String(p.totalCount) : '',
            validDays: p.validDays != null ? String(p.validDays) : '',
            price: String(p.price),
        });
    };

    const handleSaveProduct = async () => {
        const name = draft.name.trim();
        if (!name) {
            setError('회원권 이름을 입력해 주세요.');
            return;
        }
        const payload = {
            name,
            totalCount: draft.totalCount.trim() === '' ? null : Number(draft.totalCount),
            validDays: draft.validDays.trim() === '' ? null : Number(draft.validDays),
            price: draft.price.trim() === '' ? 0 : Number(draft.price),
        };
        try {
            const res = await fetch('/api/memberships', {
                method: editingId ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editingId ? {id: editingId, ...payload} : payload),
            });
            if (!res.ok) throw new Error();
            toast(editingId ? '회원권이 수정되었습니다.' : '회원권이 추가되었습니다.');
            resetForm();
            await fetchData();
        } catch {
            toast('저장에 실패했습니다.', 'error');
        }
    };

    const handleArchiveProduct = async (p: MembershipProduct) => {
        try {
            const res = await fetch('/api/memberships', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: p.id}),
            });
            if (!res.ok) throw new Error();
            const data = await res.json() as {archived?: boolean};
            toast(data.archived ? '발급 이력이 있어 보관 처리했습니다.' : '회원권이 삭제되었습니다.', 'info');
            await fetchData();
        } catch {
            toast('삭제에 실패했습니다.', 'error');
        }
    };

    // ── 발급 ──
    const handleIssue = () => flight.run(async () => {
        if (!issueCustomer.customerId) {
            setIssueError('고객을 선택해 주세요.');
            return;
        }
        if (!issueProductId) {
            setIssueError('회원권을 선택해 주세요.');
            return;
        }
        const price = Number(issuePrice.replace(/[^0-9]/g, ''));
        if (issueMode === 'sale' && issuePrice.trim() === '') {
            setIssueError('판매 금액을 입력해 주세요.');
            return;
        }
        const product = products.find((p) => p.id === issueProductId);
        const remaining = Number(issueRemaining.replace(/[^0-9]/g, ''));
        if (issueMode === 'carryover' && product?.totalCount != null && (!remaining || remaining > product.totalCount)) {
            setIssueError(`남은 횟수를 1~${product.totalCount}회로 입력해 주세요.`);
            return;
        }
        try {
            const res = await fetch('/api/membership-issue', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(issueMode === 'sale'
                    ? {customerId: issueCustomer.customerId, productId: issueProductId, mode: 'sale', salePrice: price, paymentMethod: issueMethod}
                    : {customerId: issueCustomer.customerId, productId: issueProductId, mode: 'carryover',
                        ...(product?.totalCount != null && {remainingCount: remaining}), expiresAt: issueExpiresAt || null}),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null) as {error?: string} | null;
                setIssueError(err?.error ?? '발급에 실패했습니다.');
                return;
            }
            toast(issueMode === 'sale' ? '회원권을 판매 발급했습니다.' : '기존 회원권을 등록했습니다.');
            issueCustomer.reset();
            setIssueProductId('');
            setIssuePrice('');
            setIssueRemaining('');
            setIssueExpiresAt('');
            setIssueError('');
            await fetchData();
        } catch {
            toast('발급에 실패했습니다.', 'error');
        }
    });

    const handleCancelMembership = (m: CustomerMembership) => flight.run(async () => {
        try {
            const res = await fetch('/api/membership-issue', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: m.id}),
            });
            if (!res.ok) throw new Error();
            toast('회원권을 취소했습니다.', 'info');
            await fetchData();
        } catch {
            toast('취소에 실패했습니다.', 'error');
        }
    });

    const handleUse = (m: CustomerMembership, action: 'use' | 'restore') => flight.run(async () => {
        try {
            const res = await fetch('/api/membership-use', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({membershipId: m.id, action}),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null) as {error?: string} | null;
                throw new Error(err?.error || '');
            }
            toast(action === 'use' ? '1회 차감했습니다.' : '1회 복원했습니다.');
            await fetchData();
        } catch (err) {
            toast(err instanceof Error && err.message ? err.message : '처리에 실패했습니다.', 'error');
        }
    });

    return (
        <StyledWrap>
            <PageHero
                eyebrow="MEMBERSHIP"
                title="회원권 관리"
                subtitle="횟수·기간 회원권을 등록하고 고객에게 발급합니다."
            />

            {isLocal ? (
                <StyledEmpty>회원권은 로그인 후 이용할 수 있습니다.</StyledEmpty>
            ) : (
                <>
                    <StyledTabRow>
                        <StyledTabButton type="button" $active={tab === 'products'} onClick={() => setTab('products')}>상품</StyledTabButton>
                        <StyledTabButton type="button" $active={tab === 'issue'} onClick={() => setTab('issue')}>발급</StyledTabButton>
                    </StyledTabRow>

                    {tab === 'products' && (
                        <>
                            <StyledToolbar>
                                {!isAdding && editingId === null && (
                                    <StyledEditBtn type="button" onClick={() => {setIsAdding(true); setDraft(EMPTY_DRAFT); setError('');}}>회원권 추가</StyledEditBtn>
                                )}
                            </StyledToolbar>

                            {(isAdding || editingId !== null) && (
                                <StyledFormCard>
                                    <StyledSettingsCardTitle>{editingId !== null ? '회원권 상품 수정' : '회원권 상품 등록'}</StyledSettingsCardTitle>
                                    <StyledFieldGrid>
                                        <StyledField htmlFor="mp-name">
                                            <span>이름</span>
                                            <StyledInput id="mp-name" type="text" value={draft.name} placeholder="예: 두피케어 10회권"
                                                         onChange={(e) => {setDraft((d) => ({...d, name: e.target.value})); setError('');}} />
                                        </StyledField>
                                        <StyledField htmlFor="mp-price">
                                            <span>가격(원)</span>
                                            <StyledInput id="mp-price" type="number" inputMode="numeric" value={draft.price} placeholder="0"
                                                         onChange={(e) => setDraft((d) => ({...d, price: e.target.value}))} />
                                        </StyledField>
                                        <StyledField htmlFor="mp-count">
                                            <span>횟수 (비우면 무제한)</span>
                                            <StyledInput id="mp-count" type="number" inputMode="numeric" value={draft.totalCount} placeholder="무제한"
                                                         onChange={(e) => setDraft((d) => ({...d, totalCount: e.target.value}))} />
                                        </StyledField>
                                        <StyledField htmlFor="mp-days">
                                            <span>유효기간(일, 비우면 무기한)</span>
                                            <StyledInput id="mp-days" type="number" inputMode="numeric" value={draft.validDays} placeholder="무기한"
                                                         onChange={(e) => setDraft((d) => ({...d, validDays: e.target.value}))} />
                                        </StyledField>
                                    </StyledFieldGrid>
                                    <FieldError variant="inline">{error}</FieldError>
                                    <StyledActionRow>
                                        <StyledCancelBtn type="button" onClick={resetForm}>취소</StyledCancelBtn>
                                        <StyledSaveBtn type="button" onClick={handleSaveProduct}>저장</StyledSaveBtn>
                                    </StyledActionRow>
                                </StyledFormCard>
                            )}

                            {loading || activeProducts.length === 0 ? (
                                <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                            ) : (
                                <StyledList>
                                    {activeProducts.map((p) => (
                                        <StyledItem key={p.id}>
                                            <StyledItemMain>
                                                <StyledItemName>{p.name}</StyledItemName>
                                                <StyledItemMeta>{describeProduct(p)} · {formatPrice(p.price)}</StyledItemMeta>
                                            </StyledItemMain>
                                            {editingId === null && !isAdding && (
                                                <StyledItemActions>
                                                    <StyledEditBtn type="button" onClick={() => startEdit(p)}>수정</StyledEditBtn>
                                                    <StyledDeleteBtn type="button" onClick={() => handleArchiveProduct(p)}>삭제</StyledDeleteBtn>
                                                </StyledItemActions>
                                            )}
                                        </StyledItem>
                                    ))}
                                </StyledList>
                            )}
                        </>
                    )}

                    {tab === 'issue' && (
                        <>
                            <StyledFormCard>
                                <StyledSettingsCardTitle>회원권 발급</StyledSettingsCardTitle>
                                <StyledFieldGrid>
                                    <CustomerAutocomplete id="mi-customer" {...issueCustomer.autocompleteProps} />
                                    <StyledField htmlFor="mi-product">
                                        <span>회원권</span>
                                        <StyledSelect id="mi-product" value={issueProductId}
                                                      onChange={(e) => {
                                                          const next = products.find((p) => p.id === e.target.value);
                                                          setIssueProductId(e.target.value);
                                                          // 상품을 고르면 판매 금액·남은 횟수 기본값을 채운다(고칠 수 있음).
                                                          setIssuePrice(next ? String(next.price) : '');
                                                          setIssueRemaining(next?.totalCount != null ? String(next.totalCount) : '');
                                                          setIssueError('');
                                                      }}>
                                            <option value="">회원권 선택</option>
                                            {activeProducts.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name} ({describeProduct(p)})</option>
                                            ))}
                                        </StyledSelect>
                                    </StyledField>
                                </StyledFieldGrid>
                                <StyledModeFieldset>
                                    <StyledModeLegend>발급 방식</StyledModeLegend>
                                    <StyledModeOption htmlFor="mi-mode-sale">
                                        <input id="mi-mode-sale" type="radio" name="mi-mode" checked={issueMode === 'sale'}
                                               onChange={() => {setIssueMode('sale'); setIssueError('');}} />
                                        <span>판매 <StyledModeHint>그날 매출로 잡힙니다</StyledModeHint></span>
                                    </StyledModeOption>
                                    <StyledModeOption htmlFor="mi-mode-carryover">
                                        <input id="mi-mode-carryover" type="radio" name="mi-mode" checked={issueMode === 'carryover'}
                                               onChange={() => {setIssueMode('carryover'); setIssueError('');}} />
                                        <span>기존 회원권 등록 <StyledModeHint>이미 팔았던 회원권 — 매출 없이 남은 횟수만</StyledModeHint></span>
                                    </StyledModeOption>
                                </StyledModeFieldset>
                                <StyledFieldGrid>
                                    {issueMode === 'sale' ? (
                                        <>
                                            <StyledField htmlFor="mi-price">
                                                <span>판매 금액(원)</span>
                                                <StyledInput id="mi-price" type="text" inputMode="numeric" value={issuePrice} placeholder="상품 가격"
                                                             onChange={(e) => {setIssuePrice(e.target.value.replace(/[^0-9]/g, '')); setIssueError('');}} />
                                            </StyledField>
                                            <StyledField htmlFor="mi-method">
                                                <span>결제수단</span>
                                                <StyledSelect id="mi-method" value={issueMethod}
                                                              onChange={(e) => setIssueMethod(e.target.value as PaymentMethod)}>
                                                    {RECEIVED_PAYMENT_METHODS.map((method) => (
                                                        <option key={method} value={method}>{method}</option>
                                                    ))}
                                                </StyledSelect>
                                            </StyledField>
                                        </>
                                    ) : (
                                        <>
                                            {products.find((p) => p.id === issueProductId)?.totalCount != null && (
                                                <StyledField htmlFor="mi-remaining">
                                                    <span>남은 횟수</span>
                                                    <StyledInput id="mi-remaining" type="text" inputMode="numeric" value={issueRemaining} placeholder="남은 횟수"
                                                                 onChange={(e) => {setIssueRemaining(e.target.value.replace(/[^0-9]/g, '')); setIssueError('');}} />
                                                </StyledField>
                                            )}
                                            <StyledField htmlFor="mi-expires">
                                                <span>만료일(비우면 무기한)</span>
                                                <StyledInput id="mi-expires" type="date" value={issueExpiresAt}
                                                             onChange={(e) => setIssueExpiresAt(e.target.value)} />
                                            </StyledField>
                                        </>
                                    )}
                                </StyledFieldGrid>
                                <FieldError variant="inline">{issueError}</FieldError>
                                <StyledActionRow>
                                    <StyledSaveBtn type="button" disabled={flight.busy} onClick={handleIssue}>{issueMode === 'sale' ? '판매 발급' : '등록'}</StyledSaveBtn>
                                </StyledActionRow>
                            </StyledFormCard>

                            {loading || memberships.length === 0 ? (
                                <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                            ) : (
                                <StyledList>
                                    {memberships.slice(0, visibleCount).map((m) => (
                                        <StyledItem key={m.id}>
                                            <StyledItemMain>
                                                <StyledItemName>{issueCustomer.customerName(m.customerId)} · {m.name}</StyledItemName>
                                                <StyledItemMeta>{describeBenefitMembership(m)} · {MEMBERSHIP_STATUS_LABEL[m.status]} · {m.salePrice != null ? `판매 ${formatPrice(m.salePrice)}${m.salePaymentMethod ? ` (${m.salePaymentMethod})` : ''}` : '기존 등록'}</StyledItemMeta>
                                            </StyledItemMain>
                                            {m.status !== 'cancelled' && (
                                                <StyledItemActions>
                                                    {m.totalCount != null && (m.remainingCount ?? 0) > 0 && (
                                                        <StyledEditBtn type="button" disabled={flight.busy} onClick={() => handleUse(m, 'use')}>사용</StyledEditBtn>
                                                    )}
                                                    {m.totalCount != null && (m.remainingCount ?? 0) < m.totalCount && (
                                                        <StyledEditBtn type="button" disabled={flight.busy} onClick={() => handleUse(m, 'restore')}>복원</StyledEditBtn>
                                                    )}
                                                    {m.status === 'active' && (
                                                        <StyledDeleteBtn type="button" disabled={flight.busy} onClick={() => handleCancelMembership(m)}>취소</StyledDeleteBtn>
                                                    )}
                                                </StyledItemActions>
                                            )}
                                        </StyledItem>
                                    ))}
                                </StyledList>
                            )}
                            {!loading && memberships.length > visibleCount && (
                                <StyledEditBtn type="button" onClick={() => setVisibleCount((n) => n + ISSUED_PAGE_SIZE)}>
                                    더 보기 ({visibleCount}/{memberships.length})
                                </StyledEditBtn>
                            )}
                        </>
                    )}
                </>
            )}
        </StyledWrap>
    );
};

const StyledWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledToolbar = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const StyledFormCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 10px;
    ${cardSurfaceStyle};
`;

const StyledFieldGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledInput = styled.input`
    ${formControlStyle};
`;

const StyledSelect = styled(StyledFieldSelect)``;

const StyledModeFieldset = styled.fieldset`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    border: 0;
`;

const StyledModeLegend = styled.legend`
    margin-bottom: 4px;
    padding: 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledModeOption = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font);
    cursor: pointer;
`;

const StyledModeHint = styled.span`
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledActionRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const StyledList = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--black-color-10);
`;

const StyledItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--black-color-10);
`;

const StyledItemMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const StyledItemName = styled.strong`
    font-size: var(--large-font);
    font-weight: 700;
    color: var(--dark-gray-color);
`;

const StyledItemMeta = styled.span`
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledItemActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;
