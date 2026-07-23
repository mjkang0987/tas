import {useCallback, useEffect, useState} from 'react';

import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';
import {FieldError} from '../ui/FieldError';
import {LocalizedMessageField} from '../ui/LocalizedMessageField';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, EMPTY_TEXT} from './settings-styles';
import {useToastStore} from '../../store/toastStore';
import {shouldUseLocalDb} from '../../lib/local-db';
import {NOTICE_CATEGORIES, noticeCategoryLabel} from '../../features/notices/model';
import type {StoreNotice, NoticeCategory, NoticeI18n} from '../../features/notices/model';

interface DraftForm {
    category: NoticeCategory;
    title: string;
    titleI18n: NoticeI18n | null;
    body: string;
    bodyI18n: NoticeI18n | null;
    visible: boolean;
}

const EMPTY_DRAFT: DraftForm = {category: 'notice', title: '', titleI18n: null, body: '', bodyI18n: null, visible: true};

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const NoticeManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const isLocal = shouldUseLocalDb();

    const [notices, setNotices] = useState<StoreNotice[]>([]);
    const [loading, setLoading] = useState(!isLocal);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (isLocal) return;
        setLoading(true);
        try {
            const res = await fetch('/api/notices');
            if (!res.ok) throw new Error();
            const data = await res.json() as {notices: StoreNotice[]};
            setNotices(data.notices ?? []);
        } catch {
            toast('공지사항을 불러오지 못했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isLocal, toast]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setDraft(EMPTY_DRAFT);
        setError('');
        setIsAdding(false);
        setEditingId(null);
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
        setError('');
    };

    const startEdit = (n: StoreNotice) => {
        setEditingId(n.id);
        setIsAdding(false);
        setError('');
        setDraft({
            category: n.category,
            title: n.title,
            titleI18n: n.titleI18n ?? null,
            body: n.body,
            bodyI18n: n.bodyI18n ?? null,
            visible: n.visible,
        });
    };

    const handleSave = async () => {
        const title = draft.title.trim();
        const body = draft.body.trim();
        if (!title) {
            setError('제목을 입력해 주세요.');
            return;
        }
        if (!body) {
            setError('내용을 입력해 주세요.');
            return;
        }
        const payload = {
            category: draft.category,
            title,
            titleI18n: draft.titleI18n,
            body,
            bodyI18n: draft.bodyI18n,
            visible: draft.visible,
        };
        try {
            const res = await fetch('/api/notices', {
                method: editingId ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editingId ? {id: editingId, ...payload} : payload),
            });
            if (!res.ok) throw new Error();
            toast(editingId ? '공지사항이 수정되었습니다.' : '공지사항이 추가되었습니다.');
            resetForm();
            await fetchData();
        } catch {
            toast('저장에 실패했습니다.', 'error');
        }
    };

    const handleDelete = async (n: StoreNotice) => {
        try {
            const res = await fetch('/api/notices', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: n.id}),
            });
            if (!res.ok) throw new Error();
            toast('공지사항이 삭제되었습니다.', 'info');
            await fetchData();
        } catch {
            toast('삭제에 실패했습니다.', 'error');
        }
    };

    const editing = isAdding || editingId !== null;

    return (
        <StyledWrap>
            <PageHero
                eyebrow="NOTICE"
                title="공지사항 관리"
                subtitle="고객 예약 페이지에 노출되는 공지사항입니다. 공개로 둔 항목만 고객에게 보입니다."
            />

            {isLocal ? (
                <StyledEmpty>공지사항은 로그인 후 이용할 수 있습니다.</StyledEmpty>
            ) : (
                <>
                    <StyledToolbar>
                        {!editing && (
                            <StyledEditBtn type="button" onClick={startAdd}>공지 추가</StyledEditBtn>
                        )}
                    </StyledToolbar>

                    {editing && (
                        <StyledFormCard>
                            <StyledTopRow>
                                <StyledField htmlFor="nt-category">
                                    <span>분류</span>
                                    <StyledSelect id="nt-category" value={draft.category}
                                        onChange={(e) => setDraft((d) => ({...d, category: e.target.value as NoticeCategory}))}>
                                        {NOTICE_CATEGORIES.map((c) => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </StyledSelect>
                                </StyledField>
                                <StyledCheckboxRow htmlFor="nt-visible">
                                    <input id="nt-visible" type="checkbox" checked={draft.visible}
                                        onChange={(e) => setDraft((d) => ({...d, visible: e.target.checked}))} />
                                    <span>공개 (고객 페이지에 노출)</span>
                                </StyledCheckboxRow>
                            </StyledTopRow>

                            <LocalizedMessageField
                                idBase="nt-title"
                                label="제목"
                                placeholder="예: 여름 휴가 안내"
                                multiline={false}
                                mainValue={draft.title}
                                i18nValue={draft.titleI18n}
                                onMainChange={(v) => {setDraft((d) => ({...d, title: v})); setError('');}}
                                onI18nChange={(next) => setDraft((d) => ({...d, titleI18n: next}))}
                            />

                            <LocalizedMessageField
                                idBase="nt-body"
                                label="내용"
                                caption="번역을 비우면 한국어가 그대로 노출됩니다."
                                placeholder="예: 8/1(금)~8/5(화) 휴무합니다."
                                mainValue={draft.body}
                                i18nValue={draft.bodyI18n}
                                onMainChange={(v) => {setDraft((d) => ({...d, body: v})); setError('');}}
                                onI18nChange={(next) => setDraft((d) => ({...d, bodyI18n: next}))}
                            />

                            <FieldError variant="inline">{error}</FieldError>
                            <StyledActionRow>
                                <StyledCancelBtn type="button" onClick={resetForm}>취소</StyledCancelBtn>
                                <StyledSaveBtn type="button" onClick={handleSave}>저장</StyledSaveBtn>
                            </StyledActionRow>
                        </StyledFormCard>
                    )}

                    {loading ? (
                        <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                    ) : notices.length === 0 ? (
                        <StyledEmpty>등록된 공지사항이 없습니다.</StyledEmpty>
                    ) : (
                        <StyledList>
                            {notices.map((n) => (
                                <StyledItem key={n.id}>
                                    <StyledItemMain>
                                        <StyledItemTop>
                                            <StyledChip data-category={n.category}>{noticeCategoryLabel(n.category)}</StyledChip>
                                            <StyledItemName>{n.title}</StyledItemName>
                                            {!n.visible && <StyledHiddenBadge>비공개</StyledHiddenBadge>}
                                        </StyledItemTop>
                                        <StyledItemBody>{n.body}</StyledItemBody>
                                        <StyledItemDate>{formatDate(n.createdAt)}</StyledItemDate>
                                    </StyledItemMain>
                                    {!editing && (
                                        <StyledItemActions>
                                            <StyledEditBtn type="button" onClick={() => startEdit(n)}>수정</StyledEditBtn>
                                            <StyledDeleteBtn type="button" onClick={() => handleDelete(n)}>삭제</StyledDeleteBtn>
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

const StyledTopRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
`;

const StyledField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledSelect = styled.select`
    height: 42px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: 14px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    cursor: pointer;

    &:focus { outline: none; border-color: var(--blue-color); }
`;

const StyledCheckboxRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--black-color-10);
`;

const StyledItemMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const StyledItemTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledChip = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    color: var(--blue-color);
    background: var(--blue-color-10, rgba(59, 91, 219, 0.1));

    &[data-category='event'] { color: var(--brand-color); background: var(--brand-color-10, rgba(138, 75, 176, 0.12)); }
    &[data-category='info'] { color: var(--green-color, #16a34a); background: rgba(22, 163, 74, 0.1); }
`;

const StyledItemName = styled.strong`
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledHiddenBadge = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 6px;
    color: var(--dark-gray-color2);
    background: var(--black-color-10);
`;

const StyledItemBody = styled.span`
    font-size: 13px;
    color: var(--dark-gray-color);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

const StyledItemDate = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
    font-variant-numeric: tabular-nums;
`;

const StyledItemActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;
