import {useCallback, useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {getStoreLabels} from '../../features/store-settings/labels';
import {formatTel, normalizeTel} from '../../features/customers/model';
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
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    settings: {allowAssigneeChoice: boolean; noticeText: string | null; maxAdvanceDays: number};
}
interface ReserveResult {
    publicToken: string;
    date: string;
    startTime: string;
    endTime: string;
    serviceSummary: string;
}

const ASSIGNEE_ANY = '__any__';

// 오늘(로컬=KST) 기준 YYYY-MM-DD. date input min/max·기본값용.
function localDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    const [name, setName] = useState('');
    const [tel, setTel] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string>('');
    const [result, setResult] = useState<ReserveResult | null>(null);

    useEffect(() => {
        if (!slug) return;
        let alive = true;
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

    const toggleService = (serviceName: string) => {
        setSelectedServices((prev) => prev.includes(serviceName) ? prev.filter((n) => n !== serviceName) : [...prev, serviceName]);
        setSelectedSlot('');
    };

    // 서비스·담당자·날짜가 정해지면 가용 슬롯 조회
    const fetchSlots = useCallback(() => {
        if (!slug || !date || selectedServices.length === 0) { setSlots([]); return; }
        let alive = true;
        setSlotsLoading(true);
        const params = new URLSearchParams({date, services: selectedServices.join(',')});
        if (assigneeId !== ASSIGNEE_ANY) params.set('assignee', assigneeId);
        fetch(`/api/book/${encodeURIComponent(slug)}/availability?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('slots failed'))))
            .then((data) => { if (alive) setSlots(Array.isArray(data.slots) ? data.slots : []); })
            .catch(() => { if (alive) setSlots([]); })
            .finally(() => { if (alive) setSlotsLoading(false); });
        return () => { alive = false; };
    }, [slug, date, selectedServices, assigneeId]);

    // 서비스·담당자·날짜가 바뀌면 슬롯을 다시 불러온다. selectedSlot 초기화는 각 입력 핸들러가 담당.
    // fetchSlots는 요청 중 로딩 플래그를 세우는 표준 fetch-in-effect 패턴이라 규칙을 로컬 예외 처리.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => fetchSlots(), [fetchSlots]);

    const totalDuration = useMemo(
        () => selectedServices.reduce((sum, n) => sum + (info?.services.find((s) => s.name === n)?.duration ?? 0), 0),
        [selectedServices, info],
    );
    const totalPrice = useMemo(
        () => selectedServices.reduce((sum, n) => sum + (info?.services.find((s) => s.name === n)?.price ?? 0), 0),
        [selectedServices, info],
    );

    const telValid = normalizeTel(tel).length >= 10 && normalizeTel(tel).length <= 11;
    const canSubmit = selectedServices.length > 0 && !!date && !!selectedSlot && name.trim().length > 0 && telValid && !submitting;

    const submit = () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError('');
        fetch(`/api/book/${encodeURIComponent(slug)}/reserve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({date, startTime: selectedSlot, services: selectedServices, assigneeId: assigneeId !== ASSIGNEE_ANY ? assigneeId : null, name: name.trim(), tel: normalizeTel(tel)}),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (res.status === 201) { setResult(data as ReserveResult); return; }
                if (res.status === 409) {
                    const code = typeof data.error === 'string' ? data.error : '';
                    if (code === 'duplicate') {
                        setSubmitError('이미 같은 시간에 예약이 있습니다. 다른 시간을 선택해 주세요.');
                    } else if (code === 'unavailable_date') {
                        setSubmitError('선택하신 날짜는 예약할 수 없습니다. 다른 날짜를 선택해 주세요.');
                    } else {
                        // slot_taken · retry_exhausted: 슬롯이 방금 마감됨 → 재조회
                        setSubmitError('선택하신 시간이 방금 마감되었습니다. 다른 시간을 선택해 주세요.');
                    }
                    fetchSlots();
                    setSelectedSlot('');
                    return;
                }
                setSubmitError('예약에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            })
            .catch(() => setSubmitError('예약에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
            .finally(() => setSubmitting(false));
    };

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

    if (result) {
        return (
            <StyledWrap>
                <SeoHead title={`${info.storeName} 예약 완료`} />
                <StyledCard>
                    <StyledStore>{info.storeName}</StyledStore>
                    <StyledTitle>예약이 접수되었습니다</StyledTitle>
                    <StyledSummary>
                        <StyledSummaryRow><span>날짜</span><StyledSummaryValue>{result.date}</StyledSummaryValue></StyledSummaryRow>
                        <StyledSummaryRow><span>시간</span><StyledSummaryValue>{result.startTime} ~ {result.endTime}</StyledSummaryValue></StyledSummaryRow>
                        <StyledSummaryRow><span>{labels.service}</span><StyledSummaryValue>{result.serviceSummary}</StyledSummaryValue></StyledSummaryRow>
                    </StyledSummary>
                    <StyledNotice>예약이 정상 접수되었습니다. 아래 링크에서 예약 확인·변경·취소를 할 수 있어요. 링크를 저장해 두시면 편리합니다.</StyledNotice>
                    <StyledManageLink href={`/book/${encodeURIComponent(slug)}/r/${result.publicToken}`}>내 예약 확인·변경·취소</StyledManageLink>
                </StyledCard>
            </StyledWrap>
        );
    }

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
                            <StyledServiceCard key={s.name} type="button" $on={on} aria-pressed={on} onClick={() => toggleService(s.name)}>
                                <StyledServiceName>{s.name}</StyledServiceName>
                                <StyledServiceMeta>{s.duration}분 · {s.price.toLocaleString()}원</StyledServiceMeta>
                            </StyledServiceCard>
                        );
                    })}
                </StyledServiceList>

                {info.settings.allowAssigneeChoice && info.assignees.length > 0 && (
                    <>
                        <StyledSectionLabel>{labels.assignee} 선택</StyledSectionLabel>
                        <StyledSelect value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); setSelectedSlot(''); }}>
                            <option value={ASSIGNEE_ANY}>상관없음</option>
                            {info.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </StyledSelect>
                    </>
                )}

                {selectedServices.length > 0 && (
                    <>
                        <StyledSectionLabel>날짜 선택</StyledSectionLabel>
                        <StyledDateInput
                            type="date"
                            value={date}
                            min={localDateStr(0)}
                            max={localDateStr(info.settings.maxAdvanceDays)}
                            onChange={(e) => { setDate(e.target.value); setSelectedSlot(''); }}
                        />

                        {date && (
                            <>
                                <StyledSectionLabel>시간 선택</StyledSectionLabel>
                                {slotsLoading && <StyledMuted>시간을 불러오는 중…</StyledMuted>}
                                {!slotsLoading && slots.length === 0 && (
                                    <StyledMuted>
                                        {totalDuration === 0
                                            ? `선택하신 ${labels.service}는 소요시간이 0분이라 시간 예약을 할 수 없습니다. 다른 ${labels.service}를 선택해 주세요.`
                                            : '선택하신 날짜에 예약 가능한 시간이 없습니다.'}
                                    </StyledMuted>
                                )}
                                {!slotsLoading && slots.length > 0 && (
                                    <StyledSlotGrid>
                                        {slots.map((slot) => (
                                            <StyledSlotBtn key={slot} type="button" $on={selectedSlot === slot} aria-pressed={selectedSlot === slot} onClick={() => setSelectedSlot(slot)}>
                                                {slot}
                                            </StyledSlotBtn>
                                        ))}
                                    </StyledSlotGrid>
                                )}
                            </>
                        )}
                    </>
                )}

                {selectedSlot && (
                    <>
                        <StyledSectionLabel>예약자 정보</StyledSectionLabel>
                        <StyledField>
                            <StyledFieldLabel htmlFor="book-name">이름</StyledFieldLabel>
                            <StyledTextInput id="book-name" type="text" value={name} maxLength={40} placeholder="이름" onChange={(e) => setName(e.target.value)} />
                        </StyledField>
                        <StyledField>
                            <StyledFieldLabel htmlFor="book-tel">연락처</StyledFieldLabel>
                            <StyledTextInput id="book-tel" type="tel" inputMode="numeric" value={tel} placeholder="010-0000-0000" onChange={(e) => setTel(e.target.value)} onBlur={() => setTel((t) => formatTel(t))} />
                        </StyledField>

                        <StyledTotal>
                            <span>합계</span>
                            <StyledTotalValue>{totalPrice.toLocaleString()}원 · {totalDuration}분</StyledTotalValue>
                        </StyledTotal>
                    </>
                )}

                {submitError && <StyledError role="alert">{submitError}</StyledError>}

                <StyledNextBtn type="button" disabled={!canSubmit} onClick={submit}>
                    {submitting ? '예약 중…' : '예약하기'}
                </StyledNextBtn>
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
    background: #f4f6f8;
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
`;

const StyledSlotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
`;

const StyledSlotBtn = styled.button<{$on: boolean}>`
    height: 42px;
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

const StyledTotal = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding: 12px;
    background: #f4f6f8;
    border-radius: 10px;
    font-size: 14px;
    color: var(--dark-gray-color, #444);
`;

const StyledTotalValue = styled.strong`
    color: var(--black-color, #111);
    font-weight: 800;
`;

const StyledSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    padding: 16px;
    background: #f4f6f8;
    border-radius: 12px;
`;

const StyledSummaryRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;

const StyledSummaryValue = styled.strong`
    color: var(--black-color, #111);
    font-weight: 700;
    text-align: right;
`;

const StyledError = styled.p`
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--danger-color, #d64545);
`;

const StyledNextBtn = styled.button`
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

const StyledMuted = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;

const StyledManageLink = styled.a`
    display: block;
    margin-top: 4px;
    padding: 14px;
    border: 2px solid var(--brand-color, #6526d9);
    border-radius: 12px;
    background: var(--white-color, #fff);
    color: var(--brand-color, #6526d9);
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
`;
