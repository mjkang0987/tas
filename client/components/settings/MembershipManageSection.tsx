import {useCallback, useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';
import {actionButtonStyle, StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, EMPTY_TEXT} from './settings-styles';
import {useToastStore} from '../../store/toastStore';
import {useCalendarStore} from '../../store/calendarStore';
import {shouldUseLocalDb} from '../../lib/local-db';
import {formatPrice} from '../../utils/services';
import type {MembershipProduct, CustomerMembership} from '../../features/memberships/model';

type Tab = 'products' | 'issue';

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

function describeBalance(m: CustomerMembership): string {
    const count = m.totalCount != null ? `${m.remainingCount ?? 0}/${m.totalCount}회` : '무제한';
    const expiry = m.expiresAt ? ` · ~${m.expiresAt.slice(0, 10)}` : '';
    return `${count}${expiry}`;
}

export const MembershipManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const customerMap = useCalendarStore((s) => s.customerMap);
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
    const [issueCustomerId, setIssueCustomerId] = useState('');
    const [issueProductId, setIssueProductId] = useState('');
    const [issueError, setIssueError] = useState('');

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
    const customers = useMemo(
        () => Object.values(customerMap).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
        [customerMap]
    );
    const customerName = useCallback(
        (legacyId: number) => customerMap[legacyId]?.name ?? `#${legacyId}`,
        [customerMap]
    );

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
    const handleIssue = async () => {
        if (!issueCustomerId) {
            setIssueError('고객을 선택해 주세요.');
            return;
        }
        if (!issueProductId) {
            setIssueError('회원권을 선택해 주세요.');
            return;
        }
        try {
            const res = await fetch('/api/membership-issue', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({customerId: Number(issueCustomerId), productId: issueProductId}),
            });
            if (!res.ok) throw new Error();
            toast('회원권을 발급했습니다.');
            setIssueCustomerId('');
            setIssueProductId('');
            setIssueError('');
            await fetchData();
        } catch {
            toast('발급에 실패했습니다.', 'error');
        }
    };

    const handleCancelMembership = async (m: CustomerMembership) => {
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
    };

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

                            {loading ? (
                                <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                            ) : activeProducts.length === 0 ? (
                                <StyledEmpty>등록된 회원권이 없습니다.</StyledEmpty>
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
                                <StyledFieldGrid>
                                    <StyledField htmlFor="mi-customer">
                                        <span>고객</span>
                                        <StyledSelect id="mi-customer" value={issueCustomerId}
                                                      onChange={(e) => {setIssueCustomerId(e.target.value); setIssueError('');}}>
                                            <option value="">고객 선택</option>
                                            {customers.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.tel})</option>
                                            ))}
                                        </StyledSelect>
                                    </StyledField>
                                    <StyledField htmlFor="mi-product">
                                        <span>회원권</span>
                                        <StyledSelect id="mi-product" value={issueProductId}
                                                      onChange={(e) => {setIssueProductId(e.target.value); setIssueError('');}}>
                                            <option value="">회원권 선택</option>
                                            {activeProducts.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name} ({describeProduct(p)})</option>
                                            ))}
                                        </StyledSelect>
                                    </StyledField>
                                </StyledFieldGrid>
                                <FieldError variant="inline">{issueError}</FieldError>
                                <StyledActionRow>
                                    <StyledSaveBtn type="button" onClick={handleIssue}>발급</StyledSaveBtn>
                                </StyledActionRow>
                            </StyledFormCard>

                            {loading ? (
                                <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                            ) : memberships.length === 0 ? (
                                <StyledEmpty>발급된 회원권이 없습니다.</StyledEmpty>
                            ) : (
                                <StyledList>
                                    {memberships.map((m) => (
                                        <StyledItem key={m.id}>
                                            <StyledItemMain>
                                                <StyledItemName>{customerName(m.customerId)} · {m.name}</StyledItemName>
                                                <StyledItemMeta>{describeBalance(m)} · {MEMBERSHIP_STATUS_LABEL[m.status]}</StyledItemMeta>
                                            </StyledItemMain>
                                            {m.status === 'active' && (
                                                <StyledItemActions>
                                                    <StyledDeleteBtn type="button" onClick={() => handleCancelMembership(m)}>취소</StyledDeleteBtn>
                                                </StyledItemActions>
                                            )}
                                        </StyledItem>
                                    ))}
                                </StyledList>
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

const StyledTabRow = styled.div`
    display: flex;
    gap: 8px;
`;

const StyledTabButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    min-width: 72px;
    border: 1px solid ${(props) => props.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    background: ${(props) => props.$active ? 'var(--info-bg)' : 'var(--white-color)'};
    color: ${(props) => props.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(props) => props.$active ? 700 : 500};
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
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
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
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledInput = styled.input`
    ${formControlStyle};
`;

const StyledSelect = styled.select`
    ${formControlStyle};
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
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledItemMeta = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledItemActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;
