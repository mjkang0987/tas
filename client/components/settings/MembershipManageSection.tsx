import {useCallback, useEffect, useState} from 'react';

import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, EMPTY_TEXT} from './settings-styles';
import {useToastStore} from '../../store/toastStore';
import {shouldUseLocalDb} from '../../lib/local-db';
import {formatPrice} from '../../utils/services';
import type {MembershipProduct} from '../../features/memberships/model';

interface DraftForm {
    name: string;
    totalCount: string;
    validDays: string;
    price: string;
}

const EMPTY_DRAFT: DraftForm = {name: '', totalCount: '', validDays: '', price: ''};

// 횟수·기간 요약 문구
function describeProduct(p: Pick<MembershipProduct, 'totalCount' | 'validDays'>): string {
    const parts: string[] = [];
    parts.push(p.totalCount != null ? `${p.totalCount}회` : '무제한');
    if (p.validDays != null) parts.push(`${p.validDays}일`);
    else parts.push('무기한');
    return parts.join(' · ');
}

export const MembershipManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const isLocal = shouldUseLocalDb();

    const [products, setProducts] = useState<MembershipProduct[]>([]);
    const [loading, setLoading] = useState(!isLocal);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
    const [error, setError] = useState('');

    const fetchProducts = useCallback(async () => {
        if (isLocal) return;
        setLoading(true);
        try {
            const res = await fetch('/api/memberships');
            if (!res.ok) throw new Error();
            const data = await res.json() as {products: MembershipProduct[]};
            setProducts(data.products ?? []);
        } catch {
            toast('회원권 목록을 불러오지 못했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isLocal, toast]);

    useEffect(() => {
        void fetchProducts();
    }, [fetchProducts]);

    const activeProducts = products.filter((p) => p.status === 'active');

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

    const handleSave = async () => {
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
            const res = editingId
                ? await fetch('/api/memberships', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id: editingId, ...payload}),
                })
                : await fetch('/api/memberships', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload),
                });
            if (!res.ok) throw new Error();
            toast(editingId ? '회원권이 수정되었습니다.' : '회원권이 추가되었습니다.');
            resetForm();
            await fetchProducts();
        } catch {
            toast('저장에 실패했습니다.', 'error');
        }
    };

    const handleArchive = async (p: MembershipProduct) => {
        try {
            const res = await fetch('/api/memberships', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: p.id}),
            });
            if (!res.ok) throw new Error();
            const data = await res.json() as {archived?: boolean; deleted?: boolean};
            toast(data.archived ? '발급 이력이 있어 보관 처리했습니다.' : '회원권이 삭제되었습니다.', 'info');
            await fetchProducts();
        } catch {
            toast('삭제에 실패했습니다.', 'error');
        }
    };

    return (
        <StyledWrap>
            <PageHero
                eyebrow="MEMBERSHIP"
                title="회원권 관리"
                subtitle="횟수·기간 회원권 상품을 등록하고 관리합니다."
            />

            {isLocal ? (
                <StyledEmpty>회원권은 로그인 후 이용할 수 있습니다.</StyledEmpty>
            ) : (
                <>
                    <StyledToolbar>
                        {!isAdding && editingId === null && (
                            <StyledEditBtn type="button" onClick={() => {
                                setIsAdding(true);
                                setDraft(EMPTY_DRAFT);
                                setError('');
                            }}>회원권 추가</StyledEditBtn>
                        )}
                    </StyledToolbar>

                    {(isAdding || editingId !== null) && (
                        <StyledFormCard>
                            <StyledFieldGrid>
                                <StyledField htmlFor="mp-name">
                                    <span>이름</span>
                                    <StyledInput id="mp-name" type="text" value={draft.name}
                                                 placeholder="예: 두피케어 10회권"
                                                 onChange={(e) => {setDraft((d) => ({...d, name: e.target.value})); setError('');}} />
                                </StyledField>
                                <StyledField htmlFor="mp-price">
                                    <span>가격(원)</span>
                                    <StyledInput id="mp-price" type="number" inputMode="numeric" value={draft.price}
                                                 placeholder="0"
                                                 onChange={(e) => setDraft((d) => ({...d, price: e.target.value}))} />
                                </StyledField>
                                <StyledField htmlFor="mp-count">
                                    <span>횟수 (비우면 무제한)</span>
                                    <StyledInput id="mp-count" type="number" inputMode="numeric" value={draft.totalCount}
                                                 placeholder="무제한"
                                                 onChange={(e) => setDraft((d) => ({...d, totalCount: e.target.value}))} />
                                </StyledField>
                                <StyledField htmlFor="mp-days">
                                    <span>유효기간(일, 비우면 무기한)</span>
                                    <StyledInput id="mp-days" type="number" inputMode="numeric" value={draft.validDays}
                                                 placeholder="무기한"
                                                 onChange={(e) => setDraft((d) => ({...d, validDays: e.target.value}))} />
                                </StyledField>
                            </StyledFieldGrid>
                            <FieldError variant="inline">{error}</FieldError>
                            <StyledActionRow>
                                <StyledCancelBtn type="button" onClick={resetForm}>취소</StyledCancelBtn>
                                <StyledSaveBtn type="button" onClick={handleSave}>저장</StyledSaveBtn>
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
                                            <StyledDeleteBtn type="button" onClick={() => handleArchive(p)}>삭제</StyledDeleteBtn>
                                        </StyledItemActions>
                                    )}
                                </StyledItem>
                            ))}
                        </StyledList>
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
