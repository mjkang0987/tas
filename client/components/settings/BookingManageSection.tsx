import {useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {useToastStore} from '../../store/toastStore';
import {useCalendarStore} from '../../store/calendarStore';
import {DEFAULT_BOOKING_SETTINGS, isValidBookingSlug} from '../../features/store-settings/model';
import type {BookingSettings} from '../../features/store-settings/model';
import {buildServiceColorMap} from '../../utils/services';
import {ServiceChipList} from '../ui/ServiceChip';
import {StyledSettingsCard, StyledSettingsCardTitle, StyledSettingsHint, StyledSaveBtn} from './settings-styles';

const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST ?? 'book.takeaseat.co.kr';
const SLOT_OPTIONS = [10, 15, 20, 30, 60];

type MessageI18n = {en?: string | null; ja?: string | null; zh?: string | null} | null | undefined;
const MESSAGE_LANGS = [['en', 'English'], ['ja', '日本語'], ['zh', '中文']] as const;

// 오너 입력 문구 1개 = 한국어 본문 + 언어별(영/일/중) 번역 입력. 예약 안내문구 4종이 공통으로 쓴다.
// 언어칸을 비우면 해당 키를 지워, 완전히 비면 i18n을 null로(한국어 폴백) 유지한다.
function LocalizedMessageField({
    idBase, label, caption, placeholder, mainValue, i18nValue, disabled, onMainChange, onI18nChange,
}: {
    idBase: string;
    label: string;
    caption: string;
    placeholder: string;
    mainValue: string;
    i18nValue: MessageI18n;
    disabled: boolean;
    onMainChange: (value: string) => void;
    onI18nChange: (next: {en?: string | null; ja?: string | null; zh?: string | null} | null) => void;
}) {
    const setLangValue = (code: 'en' | 'ja' | 'zh', value: string) => {
        const next = {...(i18nValue ?? {})};
        if (value.trim()) next[code] = value; else delete next[code];
        onI18nChange(Object.keys(next).length > 0 ? next : null);
    };
    return (
        <StyledMessageBlock>
            <StyledField>
                <StyledLabel htmlFor={`${idBase}-ko`}>{label}</StyledLabel>
                <StyledFieldCaption>{caption}</StyledFieldCaption>
                <StyledTextarea
                    id={`${idBase}-ko`}
                    value={mainValue}
                    placeholder={placeholder}
                    onChange={(e) => onMainChange(e.target.value)}
                    disabled={disabled}
                    rows={3}
                />
            </StyledField>
            {MESSAGE_LANGS.map(([code, langLabel]) => (
                <StyledField key={code}>
                    <StyledLabel htmlFor={`${idBase}-${code}`}>{langLabel}</StyledLabel>
                    <StyledTextarea
                        id={`${idBase}-${code}`}
                        value={i18nValue?.[code] ?? ''}
                        placeholder={langLabel}
                        onChange={(e) => setLangValue(code, e.target.value)}
                        disabled={disabled}
                        rows={2}
                    />
                </StyledField>
            ))}
        </StyledMessageBlock>
    );
}

export function BookingManageSection() {
    const toast = useToastStore((s) => s.show);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    // 노출 서비스 목록의 시술명을 캘린더 공통 색상 칩(ServiceChipList)으로 표시.
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap],
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [slug, setSlug] = useState('');
    const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
    // 중복 확인 버튼 상태
    const [checkState, setCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

    useEffect(() => {
        let alive = true;
        fetch('/api/store')
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((data) => {
                if (!alive) return;
                setSlug(typeof data.bookingSlug === 'string' ? data.bookingSlug : '');
                if (data.bookingSettings) setSettings(data.bookingSettings);
            })
            .catch(() => {})
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    const trimmedSlug = slug.trim().toLowerCase();
    const slugEmpty = trimmedSlug === '';
    const slugFormatInvalid = !slugEmpty && !isValidBookingSlug(trimmedSlug);
    // 이 화면은 온라인 예약 ON일 때만 노출되므로 영문 매장명은 필수.
    const slugValid = !slugEmpty && !slugFormatInvalid;
    const publicUrl = `https://${BOOKING_HOST}/${trimmedSlug || '(영문 매장명 미설정)'}`;

    const onSlugChange = (value: string) => {
        setSlug(value);
        setCheckState('idle');
    };

    const handleCheckSlug = async () => {
        if (!slugValid) {
            setCheckState('invalid');
            return;
        }
        setCheckState('checking');
        try {
            const res = await fetch(`/api/store?checkSlug=${encodeURIComponent(trimmedSlug)}`);
            const data = await res.json();
            setCheckState(data.available ? 'available' : (data.reason === 'format' ? 'invalid' : 'taken'));
        } catch {
            setCheckState('idle');
            toast('중복 확인 중 오류가 발생했습니다.');
        }
    };

    const handleSave = async () => {
        if (saving) return;
        if (slugEmpty) {
            toast('영문 매장명은 필수입니다.');
            return;
        }
        if (!slugValid) {
            toast('영문 매장명 형식이 올바르지 않습니다.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/store', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    bookingSlug: trimmedSlug,
                    bookingSettings: settings,
                }),
            });
            if (res.status === 409) {
                toast('이미 사용 중인 슬러그입니다. 다른 값을 입력해 주세요.');
                return;
            }
            if (!res.ok) {
                toast('저장 중 오류가 발생했습니다.');
                return;
            }
            toast('고객 예약 설정을 저장했습니다.');
        } catch {
            toast('네트워크 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const setNum = (key: 'slotIntervalMin' | 'minLeadMinutes' | 'maxAdvanceDays', value: number) => {
        setSettings((prev) => ({...prev, [key]: value}));
    };

    // 노출 서비스(1c): null=전체 노출. 체크 = 노출. 전체 선택이면 null로 저장(전체 노출).
    const allServiceNames = serviceCatalog.map((s) => s.name);
    const isServiceExposed = (name: string) => settings.bookableServiceNames === null || settings.bookableServiceNames.includes(name);
    const toggleServiceExposure = (name: string) => {
        setSettings((prev) => {
            const current = new Set(prev.bookableServiceNames ?? allServiceNames);
            if (current.has(name)) current.delete(name); else current.add(name);
            const next = allServiceNames.filter((n) => current.has(n));
            return {...prev, bookableServiceNames: next.length === allServiceNames.length ? null : next};
        });
    };

    return (
        <div>
            <StyledSectionHeading>고객 예약 설정</StyledSectionHeading>
            <StyledSectionSub>고객이 직접 예약하는 공개 예약 페이지의 주소와 규칙을 설정합니다.</StyledSectionSub>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>공개 예약 페이지 주소</StyledSettingsCardTitle>
                <StyledSettingsHint>영문 매장명이 예약 페이지 주소가 됩니다. 영문 소문자·숫자·하이픈, 3~32자.</StyledSettingsHint>
                <StyledField>
                    <StyledLabel htmlFor="booking-slug">영문 매장명 <StyledReq>필수</StyledReq></StyledLabel>
                    <StyledSlugRow>
                        <StyledInput
                            id="booking-slug"
                            type="text"
                            value={slug}
                            placeholder="예) mystore"
                            onChange={(e) => onSlugChange(e.target.value)}
                            disabled={loading}
                            $invalid={slugFormatInvalid || checkState === 'taken'}
                        />
                        <StyledCheckBtn type="button" onClick={handleCheckSlug} disabled={loading || !slugValid || checkState === 'checking'}>
                            {checkState === 'checking' ? '확인 중…' : '중복 확인'}
                        </StyledCheckBtn>
                    </StyledSlugRow>
                    {slugFormatInvalid && <StyledError>영문 소문자·숫자·하이픈 3~32자, 하이픈으로 시작·끝 불가.</StyledError>}
                    {!slugFormatInvalid && checkState === 'available' && <StyledOk>사용 가능한 주소입니다. ✓</StyledOk>}
                    {!slugFormatInvalid && checkState === 'taken' && <StyledError>이미 사용 중인 주소입니다. 다른 값을 입력해 주세요. ✗</StyledError>}
                    {!slugFormatInvalid && checkState === 'invalid' && <StyledError>형식을 확인해 주세요.</StyledError>}
                </StyledField>
                <StyledUrlPreview>공개 주소: <strong>{publicUrl}</strong></StyledUrlPreview>
                {slugValid && (
                    <StyledPreviewLink href={`/book/${trimmedSlug}`} target="_blank" rel="noopener noreferrer">
                        예약 페이지 열어보기 ↗
                    </StyledPreviewLink>
                )}
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>예약 규칙</StyledSettingsCardTitle>
                <StyledField>
                    <StyledLabel htmlFor="booking-slot">예약 시간 간격</StyledLabel>
                    <StyledFullSelect
                        id="booking-slot"
                        value={settings.slotIntervalMin}
                        onChange={(e) => setNum('slotIntervalMin', Number(e.target.value))}
                        disabled={loading}
                    >
                        {SLOT_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                    </StyledFullSelect>
                </StyledField>
                <StyledField>
                    <StyledLabel htmlFor="booking-lead">최소 사전 예약 시간(분)</StyledLabel>
                    <StyledInput
                        id="booking-lead"
                        type="number"
                        min={0}
                        value={settings.minLeadMinutes}
                        onChange={(e) => setNum('minLeadMinutes', Math.max(0, Number(e.target.value)))}
                        disabled={loading}
                    />
                    <StyledSettingsHint>지금부터 이 시간 이내의 슬롯은 예약할 수 없습니다. (예: 60 = 1시간 전까지)</StyledSettingsHint>
                </StyledField>
                <StyledField>
                    <StyledLabel htmlFor="booking-advance">최대 예약 가능 일수</StyledLabel>
                    <StyledInput
                        id="booking-advance"
                        type="number"
                        min={1}
                        value={settings.maxAdvanceDays}
                        onChange={(e) => setNum('maxAdvanceDays', Math.max(1, Number(e.target.value)))}
                        disabled={loading}
                    />
                    <StyledSettingsHint>오늘부터 며칠 후까지 예약을 받을지. (예: 30 = 한 달)</StyledSettingsHint>
                </StyledField>
                <StyledCheckboxRow htmlFor="booking-assignee">
                    <input
                        id="booking-assignee"
                        type="checkbox"
                        checked={settings.allowAssigneeChoice}
                        onChange={(e) => setSettings((prev) => ({...prev, allowAssigneeChoice: e.target.checked}))}
                        disabled={loading}
                    />
                    <span>고객이 담당자를 선택할 수 있게 하기 (끄면 매장이 배정)</span>
                </StyledCheckboxRow>
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>안내문구</StyledSettingsCardTitle>
                <StyledSettingsHint>예약 흐름의 각 단계에서 고객에게 보여줄 문구입니다. 모두 선택 사항이며, 비우면 표시되지 않습니다. 언어별 칸을 비우면 한국어 문구가 그대로 표시됩니다.</StyledSettingsHint>
                <LocalizedMessageField
                    idBase="booking-notice"
                    label="사전 안내문"
                    caption="예약 페이지 상단(예약 시작 전)에 표시됩니다."
                    placeholder="예) 예약 확정은 매장 확인 후 안내됩니다."
                    mainValue={settings.noticeText ?? ''}
                    i18nValue={settings.noticeI18n}
                    disabled={loading}
                    onMainChange={(v) => setSettings((prev) => ({...prev, noticeText: v || null}))}
                    onI18nChange={(next) => setSettings((prev) => ({...prev, noticeI18n: next}))}
                />
                <LocalizedMessageField
                    idBase="booking-done"
                    label="예약완료 안내문"
                    caption="고객이 예약을 신청하고 완료 화면에서 표시됩니다."
                    placeholder="예) 예약 신청이 접수되었습니다. 확정 시 다시 안내드립니다."
                    mainValue={settings.doneText ?? ''}
                    i18nValue={settings.doneI18n}
                    disabled={loading}
                    onMainChange={(v) => setSettings((prev) => ({...prev, doneText: v || null}))}
                    onI18nChange={(next) => setSettings((prev) => ({...prev, doneI18n: next}))}
                />
                <LocalizedMessageField
                    idBase="booking-confirm"
                    label="예약 확정 안내문"
                    caption="예약이 확정된 뒤 고객이 예약 조회 페이지를 열면 표시됩니다."
                    placeholder="예) 예약이 확정되었습니다. 예약 시간에 맞춰 방문해 주세요."
                    mainValue={settings.confirmText ?? ''}
                    i18nValue={settings.confirmI18n}
                    disabled={loading}
                    onMainChange={(v) => setSettings((prev) => ({...prev, confirmText: v || null}))}
                    onI18nChange={(next) => setSettings((prev) => ({...prev, confirmI18n: next}))}
                />
                <LocalizedMessageField
                    idBase="booking-cancel"
                    label="예약 취소 안내문"
                    caption="예약이 취소된 뒤 고객이 예약 조회 페이지를 열면 표시됩니다."
                    placeholder="예) 예약이 취소되었습니다. 다시 예약해 주세요."
                    mainValue={settings.cancelText ?? ''}
                    i18nValue={settings.cancelI18n}
                    disabled={loading}
                    onMainChange={(v) => setSettings((prev) => ({...prev, cancelText: v || null}))}
                    onI18nChange={(next) => setSettings((prev) => ({...prev, cancelI18n: next}))}
                />
            </StyledSettingsCard>

            {serviceCatalog.length > 0 && (
                <StyledSettingsCard>
                    <StyledSettingsCardTitle>노출 서비스</StyledSettingsCardTitle>
                    <StyledSettingsHint>고객 예약 페이지에 보여줄 서비스를 선택합니다. 하나도 선택하지 않으면 전체가 노출됩니다.</StyledSettingsHint>
                    <StyledServiceCheckList>
                        {serviceCatalog.map((s, idx) => (
                            <StyledServiceCheckRow key={s.name} htmlFor={`book-svc-${idx}`}>
                                <input
                                    id={`book-svc-${idx}`}
                                    type="checkbox"
                                    checked={isServiceExposed(s.name)}
                                    onChange={() => toggleServiceExposure(s.name)}
                                    disabled={loading}
                                />
                                <ServiceChipList serviceNames={[s.name]} serviceColorMap={serviceColorMap} keyPrefix={`book-svc-${idx}`} />
                            </StyledServiceCheckRow>
                        ))}
                    </StyledServiceCheckList>
                </StyledSettingsCard>
            )}

            <StyledFooter>
                <StyledSaveBtn type="button" onClick={handleSave} disabled={saving || loading || !slugValid}>
                    {saving ? '저장 중...' : '저장'}
                </StyledSaveBtn>
            </StyledFooter>
        </div>
    );
}

const StyledSectionHeading = styled.strong`
    display: block;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledSectionSub = styled.p`
    margin: 4px 0 16px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dark-gray-color2);
`;

const StyledField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
`;

const StyledLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

// 안내문구 한 종(본문+번역)을 시각적으로 묶는다. 종끼리 구분선으로 나눠 가독성 확보.
const StyledMessageBlock = styled.div`
    margin-top: 8px;
    padding-top: 8px;

    & + & {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--light-gray-color);
    }
`;

const StyledFieldCaption = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: var(--dark-gray-color2);
`;

const StyledInput = styled.input<{$invalid?: boolean}>`
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${(p) => (p.$invalid ? 'var(--red-color, #e5484d)' : 'var(--light-gray-color)')};
    border-radius: 8px;
    font-size: 14px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;

    &:focus { outline: none; border-color: var(--blue-color); }
`;

const StyledReq = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--brand-color);
`;

const StyledSlugRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;

    ${StyledInput} { flex: 1; min-width: 0; }
`;

const StyledCheckBtn = styled.button`
    flex-shrink: 0;
    height: 42px;
    padding: 0 14px;
    border: 1px solid var(--blue-color);
    border-radius: 8px;
    background: var(--white-color);
    color: var(--blue-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StyledOk = styled.span`
    font-size: 12px;
    color: var(--green-color, #16a34a);
`;

const StyledFullSelect = styled.select`
    width: 100%;
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

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    resize: none;

    &:focus { outline: none; border-color: var(--blue-color); }
`;

const StyledCheckboxRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    font-size: 14px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledServiceCheckList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
`;

const StyledServiceCheckRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledError = styled.span`
    font-size: 12px;
    color: var(--red-color, #e5484d);
`;

const StyledUrlPreview = styled.p`
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    word-break: break-all;
`;

// 저장된 슬러그로 실제 작동하는 예약 페이지(/book/[slug])를 새 탭에서 바로 확인.
// 서브도메인(book.*)은 #77 전까지 미작동이라, 링크는 현재 오리진의 /book 경로로 연다.
const StyledPreviewLink = styled.a`
    display: inline-flex;
    align-items: center;
    margin-top: 8px;
    padding: 7px 12px;
    border: 1px solid var(--brand-color);
    border-radius: var(--radius-md);
    background: var(--brand-color-bg);
    color: var(--brand-color);
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
`;

const StyledFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
`;
