import {useCallback, useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, EMPTY_TEXT} from './settings-styles';
import {useToastStore} from '../../store/toastStore';
import {shouldUseLocalDb} from '../../lib/local-db';
import {formatPrice} from '../../utils/services';
import type {CouponProduct, CouponDiscountType} from '../../features/coupons/model';

interface DraftForm {
    name: string;
    discountType: CouponDiscountType;
    discountValue: string;
    maxDiscount: string;
    minOrderAmount: string;
    validDays: string;
    code: string;
}

const EMPTY_DRAFT: DraftForm = {
    name: '', discountType: 'amount', discountValue: '', maxDiscount: '', minOrderAmount: '', validDays: '', code: '',
};

function productSpecs(p: CouponProduct): {label: string; value: string}[] {
    return [
        {label: '할인 방식', value: p.discountType === 'amount' ? '정액(원)' : '정률(%)'},
        {
            label: p.discountType === 'amount' ? '할인액(원)' : '할인율(%)',
            value: p.discountType === 'amount'
                ? formatPrice(p.discountValue)
                : `${p.discountValue}%${p.maxDiscount != null ? ` (최대 ${formatPrice(p.maxDiscount)})` : ''}`,
        },
        {label: '최소 결제금액', value: p.minOrderAmount != null ? formatPrice(p.minOrderAmount) : '제한없음'},
        {label: '유효기간', value: p.validDays != null ? `${p.validDays}일` : '무기한'},
        {label: '코드', value: p.code ? p.code : '직접발급'},
    ];
}

export const CouponManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const isLocal = shouldUseLocalDb();

    const [products, setProducts] = useState<CouponProduct[]>([]);
    const [loading, setLoading] = useState(!isLocal);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (isLocal) return;
        setLoading(true);
        try {
            const res = await fetch('/api/coupons');
            if (!res.ok) throw new Error();
            const data = await res.json() as {products: CouponProduct[]};
            setProducts(data.products ?? []);
        } catch {
            toast('쿠폰 정보를 불러오지 못했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isLocal, toast]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products]);

    const resetForm = () => {
        setDraft(EMPTY_DRAFT);
        setError('');
        setIsAdding(false);
        setEditingId(null);
    };

    const startEdit = (p: CouponProduct) => {
        setEditingId(p.id);
        setIsAdding(false);
        setError('');
        setDraft({
            name: p.name,
            discountType: p.discountType,
            discountValue: String(p.discountValue),
            maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : '',
            minOrderAmount: p.minOrderAmount != null ? String(p.minOrderAmount) : '',
            validDays: p.validDays != null ? String(p.validDays) : '',
            code: p.code ?? '',
        });
    };

    const handleSaveProduct = async () => {
        const name = draft.name.trim();
        if (!name) {
            setError('쿠폰 이름을 입력해 주세요.');
            return;
        }
        if (draft.discountValue.trim() === '') {
            setError('할인값을 입력해 주세요.');
            return;
        }
        const discountValue = Number(draft.discountValue);
        if (!Number.isFinite(discountValue) || discountValue < 0) {
            setError('할인값이 올바르지 않습니다.');
            return;
        }
        if (draft.discountType === 'rate' && discountValue > 100) {
            setError('할인율은 0~100 사이여야 합니다.');
            return;
        }
        const payload = {
            name,
            discountType: draft.discountType,
            discountValue,
            maxDiscount: draft.discountType === 'rate' && draft.maxDiscount.trim() !== '' ? Number(draft.maxDiscount) : null,
            minOrderAmount: draft.minOrderAmount.trim() === '' ? null : Number(draft.minOrderAmount),
            validDays: draft.validDays.trim() === '' ? null : Number(draft.validDays),
            code: draft.code.trim() === '' ? null : draft.code.trim(),
        };
        try {
            const res = await fetch('/api/coupons', {
                method: editingId ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editingId ? {id: editingId, ...payload} : payload),
            });
            if (res.status === 409) {
                setError('이미 사용 중인 쿠폰 코드입니다.');
                return;
            }
            if (!res.ok) throw new Error();
            toast(editingId ? '쿠폰이 수정되었습니다.' : '쿠폰이 추가되었습니다.');
            resetForm();
            await fetchData();
        } catch {
            toast('저장에 실패했습니다.', 'error');
        }
    };

    const handleArchiveProduct = async (p: CouponProduct) => {
        try {
            const res = await fetch('/api/coupons', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: p.id}),
            });
            if (!res.ok) throw new Error();
            const data = await res.json() as {archived?: boolean};
            toast(data.archived ? '발급 이력이 있어 보관 처리했습니다.' : '쿠폰이 삭제되었습니다.', 'info');
            await fetchData();
        } catch {
            toast('삭제에 실패했습니다.', 'error');
        }
    };

    return (
        <StyledWrap>
            <PageHero
                eyebrow="COUPON"
                title="쿠폰 관리"
                subtitle="정액·정률 할인 쿠폰을 등록합니다. 발급·결제 차감은 추후 지원됩니다."
            />

            {isLocal ? (
                <StyledEmpty>쿠폰은 로그인 후 이용할 수 있습니다.</StyledEmpty>
            ) : (
                <>
                    <StyledToolbar>
                        {!isAdding && editingId === null && (
                            <StyledEditBtn type="button" onClick={() => {setIsAdding(true); setDraft(EMPTY_DRAFT); setError('');}}>쿠폰 추가</StyledEditBtn>
                        )}
                    </StyledToolbar>

                    {(isAdding || editingId !== null) && (
                        <StyledFormCard>
                            <StyledFieldGrid>
                                <StyledField htmlFor="cp-name">
                                    <span>이름</span>
                                    <StyledInput id="cp-name" type="text" value={draft.name} placeholder="예: 신규고객 5천원 할인"
                                                 onChange={(e) => {setDraft((d) => ({...d, name: e.target.value})); setError('');}} />
                                </StyledField>
                                <StyledField as="div">
                                    <span>할인 방식</span>
                                    <StyledRadioRow>
                                        <StyledRadioLabel htmlFor="cp-type-amount">
                                            <input id="cp-type-amount" type="radio" name="cp-discount-type" value="amount"
                                                   checked={draft.discountType === 'amount'}
                                                   onChange={() => setDraft((d) => ({...d, discountType: 'amount'}))} />
                                            <span>정액(원)</span>
                                        </StyledRadioLabel>
                                        <StyledRadioLabel htmlFor="cp-type-rate">
                                            <input id="cp-type-rate" type="radio" name="cp-discount-type" value="rate"
                                                   checked={draft.discountType === 'rate'}
                                                   onChange={() => setDraft((d) => ({...d, discountType: 'rate'}))} />
                                            <span>정률(%)</span>
                                        </StyledRadioLabel>
                                    </StyledRadioRow>
                                </StyledField>
                                <StyledField htmlFor="cp-value">
                                    <span>{draft.discountType === 'amount' ? '할인액(원)' : '할인율(%)'}</span>
                                    <StyledInput id="cp-value" type="number" inputMode="numeric" value={draft.discountValue} placeholder={draft.discountType === 'amount' ? '5000' : '10'}
                                                 onChange={(e) => {setDraft((d) => ({...d, discountValue: e.target.value})); setError('');}} />
                                </StyledField>
                                {draft.discountType === 'rate' && (
                                    <StyledField htmlFor="cp-max">
                                        <span>최대 할인액(원, 비우면 무제한)</span>
                                        <StyledInput id="cp-max" type="number" inputMode="numeric" value={draft.maxDiscount} placeholder="무제한"
                                                     onChange={(e) => setDraft((d) => ({...d, maxDiscount: e.target.value}))} />
                                    </StyledField>
                                )}
                                <StyledField htmlFor="cp-min">
                                    <span>최소 결제금액(원, 비우면 제한없음)</span>
                                    <StyledInput id="cp-min" type="number" inputMode="numeric" value={draft.minOrderAmount} placeholder="제한없음"
                                                 onChange={(e) => setDraft((d) => ({...d, minOrderAmount: e.target.value}))} />
                                </StyledField>
                                <StyledField htmlFor="cp-days">
                                    <span>유효기간(일, 비우면 무기한)</span>
                                    <StyledInput id="cp-days" type="number" inputMode="numeric" value={draft.validDays} placeholder="무기한"
                                                 onChange={(e) => setDraft((d) => ({...d, validDays: e.target.value}))} />
                                </StyledField>
                                <StyledField htmlFor="cp-code">
                                    <span>코드 (비우면 직접발급 전용)</span>
                                    <StyledInput id="cp-code" type="text" value={draft.code} placeholder="예: WELCOME5000"
                                                 onChange={(e) => {setDraft((d) => ({...d, code: e.target.value})); setError('');}} />
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
                        <StyledEmpty>등록된 쿠폰이 없습니다.</StyledEmpty>
                    ) : (
                        <StyledList>
                            {activeProducts.map((p) => (
                                <StyledItem key={p.id}>
                                    <StyledItemHead>
                                        <StyledItemName>{p.name}</StyledItemName>
                                        {editingId === null && !isAdding && (
                                            <StyledItemActions>
                                                <StyledEditBtn type="button" onClick={() => startEdit(p)}>수정</StyledEditBtn>
                                                <StyledDeleteBtn type="button" onClick={() => handleArchiveProduct(p)}>삭제</StyledDeleteBtn>
                                            </StyledItemActions>
                                        )}
                                    </StyledItemHead>
                                    <StyledSpecGrid>
                                        {productSpecs(p).map((spec) => (
                                            <StyledSpec key={spec.label}>
                                                <StyledSpecLabel>{spec.label}</StyledSpecLabel>
                                                <StyledSpecValue>{spec.value}</StyledSpecValue>
                                            </StyledSpec>
                                        ))}
                                    </StyledSpecGrid>
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

const StyledRadioRow = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;
    min-height: 36px;
`;

const StyledRadioLabel = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;
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
    gap: 10px;
`;

const StyledItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
`;

const StyledItemHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const StyledItemName = styled.strong`
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
    min-width: 0;
`;

const StyledItemActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledSpecGrid = styled.dl`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 16px;
    margin: 0;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledSpec = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const StyledSpecLabel = styled.dt`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledSpecValue = styled.dd`
    margin: 0;
    font-size: 13px;
    color: var(--black-color);
`;
