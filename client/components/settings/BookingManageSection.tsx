import {useEffect, useState} from 'react';

import styled from 'styled-components';

import {useToastStore} from '../../store/toastStore';
import {DEFAULT_BOOKING_SETTINGS, isValidBookingSlug} from '../../features/store-settings/model';
import type {BookingSettings} from '../../features/store-settings/model';
import {StyledSettingsCard, StyledSettingsCardTitle, StyledSettingsHint, StyledSaveBtn, StyledSelect} from './settings-styles';

const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST ?? 'book.takeaseat.co.kr';
const SLOT_OPTIONS = [10, 15, 20, 30, 60];

export function BookingManageSection() {
    const toast = useToastStore((s) => s.show);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [slug, setSlug] = useState('');
    const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);

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
    const slugValid = trimmedSlug === '' || isValidBookingSlug(trimmedSlug);
    const publicUrl = `https://${BOOKING_HOST}/${trimmedSlug || '(슬러그 미설정)'}`;

    const handleSave = async () => {
        if (saving) return;
        if (!slugValid) {
            toast('슬러그 형식이 올바르지 않습니다.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/store', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    bookingSlug: trimmedSlug === '' ? null : trimmedSlug,
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

    return (
        <div>
            <StyledSectionHeading>고객 예약 설정</StyledSectionHeading>
            <StyledSectionSub>고객이 직접 예약하는 공개 예약 페이지의 주소와 규칙을 설정합니다.</StyledSectionSub>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>공개 예약 페이지 주소</StyledSettingsCardTitle>
                <StyledSettingsHint>영문 소문자·숫자·하이픈, 3~32자. 예약 페이지 URL에 사용됩니다.</StyledSettingsHint>
                <StyledField>
                    <StyledLabel htmlFor="booking-slug">슬러그</StyledLabel>
                    <StyledInput
                        id="booking-slug"
                        type="text"
                        value={slug}
                        placeholder="예) mystore"
                        onChange={(e) => setSlug(e.target.value)}
                        disabled={loading}
                        $invalid={!slugValid}
                    />
                    {!slugValid && <StyledError>영문 소문자·숫자·하이픈 3~32자, 하이픈으로 시작·끝 불가.</StyledError>}
                </StyledField>
                <StyledUrlPreview>공개 주소: <strong>{publicUrl}</strong></StyledUrlPreview>
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>예약 규칙</StyledSettingsCardTitle>
                <StyledField>
                    <StyledLabel htmlFor="booking-slot">예약 시간 간격</StyledLabel>
                    <StyledSelect
                        id="booking-slot"
                        value={settings.slotIntervalMin}
                        onChange={(e) => setNum('slotIntervalMin', Number(e.target.value))}
                        disabled={loading}
                    >
                        {SLOT_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                    </StyledSelect>
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
                <StyledField>
                    <StyledLabel htmlFor="booking-notice">예약 안내문 (선택)</StyledLabel>
                    <StyledTextarea
                        id="booking-notice"
                        value={settings.noticeText ?? ''}
                        placeholder="예) 예약 확정은 매장 확인 후 안내됩니다."
                        onChange={(e) => setSettings((prev) => ({...prev, noticeText: e.target.value || null}))}
                        disabled={loading}
                        rows={3}
                    />
                </StyledField>
            </StyledSettingsCard>

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

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: 14px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    resize: vertical;

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

const StyledFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
`;
