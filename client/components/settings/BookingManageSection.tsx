import {useEffect, useMemo, useState} from 'react';

import styled, {css} from 'styled-components';

import {formControlStyle, StyledFieldSelect} from '../ui/FormControls';
import {PageHero} from '../ui/PageHero';

import {useToastStore} from '../../store/toastStore';
import {useCalendarStore} from '../../store/calendarStore';
import {DEFAULT_BOOKING_SETTINGS, DEFAULT_BOOKING_TEXTS, isValidBookingSlug} from '../../features/store-settings/model';
import type {BookingSettings} from '../../features/store-settings/model';
import {BOOKING_HOST} from '../../features/booking/routing';
import {buildServiceColorMap} from '../../utils/services';
import {ServiceChipList} from '../ui/ServiceChip';
import {StyledSettingsCard, StyledSettingsCardTitle, StyledSettingsHint, StyledSaveBtn} from './settings-styles';
import {LocalizedMessageField} from '../ui/LocalizedMessageField';

const SLOT_OPTIONS = [10, 15, 20, 30, 60];

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
                if (data.bookingSettings) {
                    // 안내문구는 비어 있으면 기본 문구로 채워 보여준다 — 오너가 빈 칸을 마주하지 않게.
                    // 그대로 저장하면 그 문구가 고객에게 나가고, 고치면 고친 값이 나간다.
                    const bs = data.bookingSettings as BookingSettings;
                    setSettings({
                        ...bs,
                        noticeText: bs.noticeText ?? DEFAULT_BOOKING_TEXTS.noticeText,
                        doneText: bs.doneText ?? DEFAULT_BOOKING_TEXTS.doneText,
                        confirmText: bs.confirmText ?? DEFAULT_BOOKING_TEXTS.confirmText,
                        cancelText: bs.cancelText ?? DEFAULT_BOOKING_TEXTS.cancelText,
                    });
                }
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

    // 매장 연락처 — 고객이 문의·개인정보 열람/삭제를 요구할 창구라 필수(서버도 동일하게 검증).
    // 입력한 그대로 저장·표시한다(지역번호·대표번호는 자릿수 규칙이 달라 재포맷하면 깨진다).
    const contactRaw = (settings.contactTel ?? '').trim();
    const contactEmpty = contactRaw === '';
    const contactFormatInvalid = !contactEmpty && !/^[0-9+\-()\s]{8,20}$/.test(contactRaw);
    const contactValid = !contactEmpty && !contactFormatInvalid;

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
        if (contactEmpty) {
            toast('매장 연락처는 필수입니다.');
            return;
        }
        if (contactFormatInvalid) {
            toast('매장 연락처 형식이 올바르지 않습니다.');
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
            <PageHero
                eyebrow="BOOKING"
                title="고객 예약 설정"
                subtitle="고객이 직접 예약하는 공개 예약 페이지의 주소와 규칙을 설정합니다."
            />

            <StyledPairRow>
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
                <StyledField>
                    <StyledLabel htmlFor="booking-contact">매장 연락처 <StyledReq>필수</StyledReq></StyledLabel>
                    <StyledFieldCaption>
                        고객이 예약 문의와 개인정보 열람·삭제를 요구할 창구입니다. 예약 페이지와 개인정보 안내에 표시됩니다.
                    </StyledFieldCaption>
                    <StyledInput
                        id="booking-contact"
                        type="tel"
                        inputMode="numeric"
                        value={settings.contactTel ?? ''}
                        placeholder="02-1234-5678"
                        onChange={(e) => setSettings((prev) => ({...prev, contactTel: e.target.value}))}
                        disabled={loading}
                        $invalid={contactFormatInvalid}
                    />
                    {contactFormatInvalid && <StyledError>숫자와 하이픈만 8~20자로 입력해 주세요.</StyledError>}
                    {contactValid && <StyledOk>고객에게 {contactRaw} 로 표시됩니다.</StyledOk>}
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
            </StyledPairRow>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>안내문구</StyledSettingsCardTitle>
                <StyledSettingsHint>예약 흐름의 각 단계에서 고객에게 보여줄 문구입니다. 기본 문구가 채워져 있으니 그대로 쓰시거나 매장에 맞게 고쳐 주세요. 비우면 표시되지 않습니다. 언어별 칸을 비우면 한국어 문구가 그대로 표시됩니다.</StyledSettingsHint>
                <LocalizedMessageField
                    idBase="booking-notice"
                    label="사전 안내문"
                    caption="예약 페이지 상단(예약 시작 전)에 표시됩니다."
                    placeholder={DEFAULT_BOOKING_TEXTS.noticeText}
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
                    placeholder={DEFAULT_BOOKING_TEXTS.doneText}
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
                    placeholder={DEFAULT_BOOKING_TEXTS.confirmText}
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
                    placeholder={DEFAULT_BOOKING_TEXTS.cancelText}
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
                <StyledSaveBtn type="button" onClick={handleSave} disabled={saving || loading || !slugValid || !contactValid}>
                    {saving ? '저장 중...' : '저장'}
                </StyledSaveBtn>
            </StyledFooter>
        </div>
    );
}

/* 「공개 예약 페이지 주소」와 「예약 규칙」을 PC에서 한 줄 2열로.
   카드 자체가 margin-bottom을 가지므로 세로 간격은 그대로 두고 열 간격만 준다. */
const StyledPairRow = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
`;

const StyledLabel = styled.label`
    font-size: var(--medium-font);
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
    font-size: var(--small-font);
    line-height: 1.5;
    color: var(--dark-gray-color2);
`;

// 공통 폼 스타일(포커스 링·비활성·트랜지션·라운드 토큰)을 그대로 사용해 타 설정 페이지와 크기를 맞춘다.
const StyledInput = styled.input<{$invalid?: boolean}>`
    ${formControlStyle};
    width: 100%;
    color: var(--black-color);
    ${(p) => p.$invalid && css`border-color: var(--danger-color);`}
`;

// 필수 항목 배지. 영문 매장명·매장 연락처 모두 비워둘 수 없어 동일 배지를 쓴다.
const StyledReq = styled.span`
    font-size: var(--xsmall-font);
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
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--blue-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--blue-color);
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StyledOk = styled.span`
    font-size: var(--small-font);
    color: var(--success-color);
`;

const StyledFullSelect = styled(StyledFieldSelect)`
    width: 100%;
`;

const StyledTextarea = styled.textarea`
    ${formControlStyle};
    width: 100%;
    height: auto;
    padding: 10px 12px;
    font-size: var(--font);
    color: var(--black-color);
    resize: none;
`;

const StyledCheckboxRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    font-size: var(--font);
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
    font-size: var(--font);
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledError = styled.span`
    font-size: var(--small-font);
    color: var(--danger-color);
`;

const StyledUrlPreview = styled.p`
    margin: 14px 0 0;
    font-size: var(--medium-font);
    color: var(--dark-gray-color2);
    word-break: break-all;
`;

// 저장된 슬러그로 실제 작동하는 예약 페이지를 새 탭에서 바로 확인.
// 링크는 현재 오리진의 /book 경로 — 운영 메인 도메인에선 미들웨어가 예약 서브도메인으로
// 308 리다이렉트하고, 로컬에선 그대로 열린다(양쪽 다 동작).
const StyledPreviewLink = styled.a`
    display: inline-flex;
    align-items: center;
    margin-top: 8px;
    padding: 7px 12px;
    border: 1px solid var(--brand-color);
    border-radius: var(--radius-md);
    background: var(--brand-color-bg);
    color: var(--brand-color);
    font-size: var(--small-font);
    font-weight: 700;
    text-decoration: none;
`;

const StyledFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
`;
