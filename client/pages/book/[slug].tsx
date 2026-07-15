import {useCallback, useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {getStoreLabels} from '../../features/store-settings/labels';
import {SeoHead} from '../../components/ui/SeoHead';

interface BookServiceInfo {
    name: string;
    category: string;
    duration: number;
    price: number;
}
interface BookAssigneeInfo {
    id: string;
    name: string;
    color: string | null;
}
interface BookStoreSettings {
    allowAssigneeChoice: boolean;
    noticeText: string | null;
    slotIntervalMin: number;
    minLeadMinutes: number;
    maxAdvanceDays: number;
}
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    settings: BookStoreSettings;
}

const ASSIGNEE_ANY = '__any__';

// 로컬(고객 기기, KST 가정) 기준 오늘 YYYY-MM-DD.
function localToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingPage() {
    const router = useRouter();
    const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [info, setInfo] = useState<BookStoreInfo | null>(null);

    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [assigneeId, setAssigneeId] = useState<string>(ASSIGNEE_ANY);
    const [date, setDate] = useState<string>('');
    const [slots, setSlots] = useState<string[] | null>(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [name, setName] = useState('');
    const [tel, setTel] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [done, setDone] = useState<{date: string; startTime: string; endTime: string} | null>(null);

    useEffect(() => {
        if (!slug) return;
        let alive = true;
        setLoading(true);
        fetch(`/api/book/${encodeURIComponent(slug)}`)
            .then((res) => {
                if (res.status === 404) { if (alive) setNotFound(true); return null; }
                return res.ok ? res.json() : Promise.reject(new Error('load failed'));
            })
            .then((data) => { if (alive && data) setInfo(data); })
            .catch(() => { if (alive) setNotFound(true); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [slug]);

    const labels = useMemo(() => getStoreLabels(info?.shopType ?? null), [info?.shopType]);

    const totalDuration = useMemo(
        () => (info?.services ?? []).filter((s) => selectedServices.includes(s.name)).reduce((sum, s) => sum + s.duration, 0),
        [info?.services, selectedServices],
    );
    const totalPrice = useMemo(
        () => (info?.services ?? []).filter((s) => selectedServices.includes(s.name)).reduce((sum, s) => sum + s.price, 0),
        [info?.services, selectedServices],
    );

    // 서비스·담당자·날짜가 준비되면 슬롯 조회. 선택이 바뀌면 시간 선택 초기화.
    useEffect(() => {
        setSelectedTime('');
        if (!slug || !date || totalDuration <= 0) { setSlots(null); return; }
        let alive = true;
        setSlotsLoading(true);
        const params = new URLSearchParams({date, duration: String(totalDuration)});
        if (assigneeId !== ASSIGNEE_ANY) params.set('assigneeId', assigneeId);
        fetch(`/api/book/${encodeURIComponent(slug)}/availability?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('slot load failed'))))
            .then((data) => { if (alive) setSlots(Array.isArray(data.slots) ? data.slots : []); })
            .catch(() => { if (alive) setSlots([]); })
            .finally(() => { if (alive) setSlotsLoading(false); });
        return () => { alive = false; };
    }, [slug, date, totalDuration, assigneeId]);

    const toggleService = (serviceName: string) => {
        setSelectedServices((prev) => (prev.includes(serviceName) ? prev.filter((n) => n !== serviceName) : [...prev, serviceName]));
    };

    const canSubmit = selectedServices.length > 0 && !!date && !!selectedTime && name.trim().length > 0 && tel.replace(/\D/g, '').length >= 9 && !submitting;

    const submit = useCallback(async () => {
        if (!slug || !canSubmit) return;
        setSubmitting(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/book/${encodeURIComponent(slug)}/reserve`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    date,
                    startTime: selectedTime,
                    serviceNames: selectedServices,
                    assigneeId: assigneeId === ASSIGNEE_ANY ? null : assigneeId,
                    name: name.trim(),
                    tel,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 201 && data.ok) {
                setDone({date: data.date, startTime: data.startTime, endTime: data.endTime});
                return;
            }
            if (res.status === 409) {
                setErrorMsg('죄송합니다. 방금 해당 시간이 마감되었습니다. 다른 시간을 선택해 주세요.');
                // 슬롯 갱신 유도
                setSelectedTime('');
                setSlots(null);
                setDate((d) => d);
            } else {
                setErrorMsg('예약에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요.');
            }
        } catch {
            setErrorMsg('네트워크 오류로 예약에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setSubmitting(false);
        }
    }, [slug, canSubmit, date, selectedTime, selectedServices, assigneeId, name, tel]);

    if (loading) {
        return <StyledWrap><StyledCard><StyledMuted>불러오는 중…</StyledMuted></StyledCard></StyledWrap>;
    }
    if (notFound || !info) {
        return (
            <StyledWrap>
                <SeoHead title="예약 페이지를 찾을 수 없습니다" />
                <StyledCard>
                    <StyledTitle>예약 페이지를 찾을 수 없습니다</StyledTitle>
                    <StyledMuted>주소가 올바른지 확인해 주세요.</StyledMuted>
                </StyledCard>
            </StyledWrap>
        );
    }

    if (done) {
        return (
            <StyledWrap>
                <SeoHead title={`${info.storeName} 예약 완료`} />
                <StyledCard>
                    <StyledStore>{info.storeName}</StyledStore>
                    <StyledTitle>예약이 접수되었습니다</StyledTitle>
                    <StyledConfirmRow><StyledConfirmKey>날짜</StyledConfirmKey><StyledConfirmVal>{done.date}</StyledConfirmVal></StyledConfirmRow>
                    <StyledConfirmRow><StyledConfirmKey>시간</StyledConfirmKey><StyledConfirmVal>{done.startTime} ~ {done.endTime}</StyledConfirmVal></StyledConfirmRow>
                    <StyledConfirmRow><StyledConfirmKey>{labels.service}</StyledConfirmKey><StyledConfirmVal>{selectedServices.join(', ')}</StyledConfirmVal></StyledConfirmRow>
                    <StyledNotice>예약 확인 문자는 발송되지 않습니다. 변경·취소가 필요하면 매장으로 문의해 주세요.</StyledNotice>
                </StyledCard>
            </StyledWrap>
        );
    }

    const minDate = localToday();
    const maxDate = addDays(minDate, info.settings.maxAdvanceDays);

    return (
        <StyledWrap>
            <SeoHead title={`${info.storeName} 예약`} />
            <StyledCard>
                <StyledStore>{info.storeName}</StyledStore>
                <StyledTitle>온라인 예약</StyledTitle>
                {info.settings.noticeText && <StyledNotice>{info.settings.noticeText}</StyledNotice>}

                <StyledSectionLabel>{labels.service} 선택</StyledSectionLabel>
                <StyledServiceList>
                    {info.services.length === 0 && <StyledMuted>등록된 {labels.service}가 없습니다.</StyledMuted>}
                    {info.services.map((s) => {
                        const on = selectedServices.includes(s.name);
                        return (
                            <StyledServiceCard key={s.name} type="button" $on={on} onClick={() => toggleService(s.name)}>
                                <StyledServiceName>{s.name}</StyledServiceName>
                                <StyledServiceMeta>{s.duration}분 · {s.price.toLocaleString()}원</StyledServiceMeta>
                            </StyledServiceCard>
                        );
                    })}
                </StyledServiceList>

                {info.settings.allowAssigneeChoice && info.assignees.length > 0 && (
                    <>
                        <StyledSectionLabel>{labels.assignee} 선택</StyledSectionLabel>
                        <StyledSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                            <option value={ASSIGNEE_ANY}>상관없음</option>
                            {info.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </StyledSelect>
                    </>
                )}

                <StyledSectionLabel>날짜 선택</StyledSectionLabel>
                <StyledDateInput
                    type="date"
                    value={date}
                    min={minDate}
                    max={maxDate}
                    disabled={selectedServices.length === 0}
                    onChange={(e) => setDate(e.target.value)}
                />

                {date && selectedServices.length > 0 && (
                    <>
                        <StyledSectionLabel>시간 선택</StyledSectionLabel>
                        {slotsLoading && <StyledMuted>가능한 시간을 불러오는 중…</StyledMuted>}
                        {!slotsLoading && slots && slots.length === 0 && <StyledMuted>선택한 날짜에 가능한 시간이 없습니다.</StyledMuted>}
                        {!slotsLoading && slots && slots.length > 0 && (
                            <StyledSlotGrid>
                                {slots.map((t) => (
                                    <StyledSlotBtn key={t} type="button" $on={selectedTime === t} onClick={() => setSelectedTime(t)}>
                                        {t}
                                    </StyledSlotBtn>
                                ))}
                            </StyledSlotGrid>
                        )}
                    </>
                )}

                {selectedTime && (
                    <>
                        <StyledSectionLabel>예약자 정보</StyledSectionLabel>
                        <StyledField>
                            <StyledFieldLabel htmlFor="book-name">이름</StyledFieldLabel>
                            <StyledTextInput id="book-name" type="text" value={name} maxLength={40} placeholder="이름" onChange={(e) => setName(e.target.value)} />
                        </StyledField>
                        <StyledField>
                            <StyledFieldLabel htmlFor="book-tel">연락처</StyledFieldLabel>
                            <StyledTextInput id="book-tel" type="tel" inputMode="numeric" value={tel} placeholder="010-0000-0000" onChange={(e) => setTel(e.target.value)} />
                        </StyledField>
                    </>
                )}

                {totalDuration > 0 && (
                    <StyledSummary>
                        선택: {selectedServices.join(', ')} · 총 {totalDuration}분 · {totalPrice.toLocaleString()}원
                    </StyledSummary>
                )}

                {errorMsg && <StyledError role="alert">{errorMsg}</StyledError>}

                <StyledSubmitBtn type="button" disabled={!canSubmit} onClick={submit}>
                    {submitting ? '예약 중…' : '예약하기'}
                </StyledSubmitBtn>
            </StyledCard>
        </StyledWrap>
    );
}

export const getServerSideProps = async () => ({props: {}});

const StyledWrap = styled.div`
    min-height: 100%;
    display: flex;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
    background: var(--aside-bg, #f4f6f8);
    @media (max-width: 640px) { padding: 0; }
`;

const StyledCard = styled.div`
    width: 100%;
    max-width: 480px;
    margin: auto 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 32px 24px 40px;
    background: var(--white-color, #fff);
    border-radius: 16px;
    box-shadow: var(--shadow-md, 0 6px 24px rgba(0,0,0,0.08));
    @media (max-width: 640px) { max-width: none; border-radius: 0; box-shadow: none; min-height: 100vh; }
`;

const StyledStore = styled.strong`
    font-size: 14px;
    color: var(--brand-color, #6526d9);
    font-weight: 700;
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--black-color, #111);
`;

const StyledNotice = styled.p`
    margin: 4px 0 0;
    padding: 10px 12px;
    background: var(--accent-soft, #f1ecfb);
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dark-gray-color, #444);
`;

const StyledSectionLabel = styled.strong`
    display: block;
    margin-top: 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--dark-gray-color, #444);
`;

const StyledServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledServiceCard = styled.button<{$on: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border: 2px solid ${(p) => (p.$on ? 'var(--brand-color, #6526d9)' : 'var(--light-gray-color, #e4e7eb)')};
    border-radius: 12px;
    background: ${(p) => (p.$on ? 'var(--accent-soft, #f1ecfb)' : 'var(--white-color, #fff)')};
    cursor: pointer;
    text-align: left;
`;

const StyledServiceName = styled.span`
    font-size: 15px;
    font-weight: 600;
    color: var(--black-color, #111);
`;

const StyledServiceMeta = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    color: var(--dark-gray-color2, #667);
`;

const StyledSelect = styled.select`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color, #e4e7eb);
    border-radius: 10px;
    font-size: 15px;
    background: var(--white-color, #fff);
`;

const StyledDateInput = styled.input`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color, #e4e7eb);
    border-radius: 10px;
    font-size: 15px;
    background: var(--white-color, #fff);
    box-sizing: border-box;
    &:disabled { opacity: 0.5; }
`;

const StyledSlotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
`;

const StyledSlotBtn = styled.button<{$on: boolean}>`
    height: 40px;
    border: 2px solid ${(p) => (p.$on ? 'var(--brand-color, #6526d9)' : 'var(--light-gray-color, #e4e7eb)')};
    border-radius: 10px;
    background: ${(p) => (p.$on ? 'var(--brand-color, #6526d9)' : 'var(--white-color, #fff)')};
    color: ${(p) => (p.$on ? '#fff' : 'var(--black-color, #111)')};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
`;

const StyledField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledFieldLabel = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color2, #667);
`;

const StyledTextInput = styled.input`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color, #e4e7eb);
    border-radius: 10px;
    font-size: 15px;
    background: var(--white-color, #fff);
    box-sizing: border-box;
`;

const StyledSummary = styled.p`
    margin: 8px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--brand-color, #6526d9);
`;

const StyledError = styled.p`
    margin: 4px 0 0;
    padding: 10px 12px;
    background: var(--danger-soft, #fdecec);
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--danger-color, #d33);
`;

const StyledSubmitBtn = styled.button`
    margin-top: 20px;
    height: 50px;
    border: none;
    border-radius: 12px;
    background: var(--brand-color, #6526d9);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledConfirmRow = styled.div`
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--light-gray-color, #eef0f2);
`;

const StyledConfirmKey = styled.span`
    flex-shrink: 0;
    width: 72px;
    font-size: 13px;
    color: var(--dark-gray-color2, #667);
`;

const StyledConfirmVal = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color, #111);
`;

const StyledMuted = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;
