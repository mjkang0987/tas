import {useCallback, useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {getStoreLabels} from '../../features/store-settings/labels';
import {formatTel, normalizeTel} from '../../features/customers/model';
import {SeoHead} from '../../components/ui/SeoHead';
import {formControlStyle} from '../../components/ui/FormControls';
import {LabelBadge} from '../../components/ui/LabelBadge';
import {
    PickerScrollRow, PillChip, DateCell, ServiceChoiceChip, ServiceChoiceWrap,
    SlotGrid, SlotCell, SlotLegend,
} from '../../components/booking/BookingPickers';

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
interface BookBusinessHour {
    dayIndex: number;
    openTime: string;
    closeTime: string;
    enabled: boolean;
}
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    businessHours: BookBusinessHour[];
    closedDates: string[];
    settings: {allowAssigneeChoice: boolean; noticeText: string | null; maxAdvanceDays: number};
}
interface ReserveResult {
    publicToken: string;
    date: string;
    startTime: string;
    endTime: string;
    serviceSummary: string;
}
// 하루 예약현황(용량표). /api/book/[slug]/day 응답.
interface DaySlotCapacity {
    time: string;
    maxDurationMin: number;
}
interface DayData {
    date: string;
    dateOk: boolean;
    businessHour: {openTime: string; closeTime: string; enabled: boolean} | null;
    slotIntervalMin: number;
    slots: DaySlotCapacity[];
    assignees: {id: string; working: boolean}[];
}

const ASSIGNEE_ANY = '__any__';
const DOW = ['월', '화', '수', '목', '금', '토', '일'];

// 오늘(로컬=KST) 기준 YYYY-MM-DD.
function localDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 서버 dayIndexOf와 동일(0=월 … 6=일).
function clientDayIndex(dateStr: string): number {
    return (new Date(`${dateStr}T12:00:00Z`).getUTCDay() + 6) % 7;
}

// "HH:MM" + 분 → "HH:MM" (종료 시각 계산용).
function addMinutes(hhmm: string, min: number): string {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + min;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// 날짜가 예약 불가(휴무일·영업요일 아님)인가 — 날짜 스트립 비활성 판정.
function isDateClosed(info: BookStoreInfo, dateStr: string): boolean {
    if (info.closedDates.includes(dateStr)) return true;
    const bh = info.businessHours.find((b) => b.dayIndex === clientDayIndex(dateStr));
    return !bh || !bh.enabled;
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
    const [day, setDay] = useState<DayData | null>(null);
    const [dayLoading, setDayLoading] = useState(false);
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

    // 정보 로드 후 예약 가능한 첫 날짜를 기본 선택.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (!info || date) return;
        for (let i = 0; i <= info.settings.maxAdvanceDays; i += 1) {
            const d = localDateStr(i);
            if (!isDateClosed(info, d)) { setDate(d); break; }
        }
    }, [info, date]);

    const labels = useMemo(() => getStoreLabels(info?.shopType ?? null), [info?.shopType]);

    // 선택 날짜(+담당자)의 용량표를 불러온다. selectedSlot 초기화는 날짜·담당자 핸들러가 담당.
    const fetchDay = useCallback(() => {
        if (!slug || !date) { setDay(null); return; }
        let alive = true;
        setDayLoading(true);
        const params = new URLSearchParams({date});
        if (assigneeId !== ASSIGNEE_ANY) params.set('assignee', assigneeId);
        fetch(`/api/book/${encodeURIComponent(slug)}/day?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('day failed'))))
            .then((data) => { if (alive) setDay(data as DayData); })
            .catch(() => { if (alive) setDay(null); })
            .finally(() => { if (alive) setDayLoading(false); });
        return () => { alive = false; };
    }, [slug, date, assigneeId]);

    // 날짜·담당자가 바뀌면 용량표 재조회. fetch-in-effect 표준 패턴이라 규칙 로컬 예외.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => fetchDay(), [fetchDay]);

    // 선택 담당자가 그날 휴무면 '상관없음'으로 되돌린다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (!day || assigneeId === ASSIGNEE_ANY) return;
        const a = day.assignees.find((x) => x.id === assigneeId);
        if (a && !a.working) { setAssigneeId(ASSIGNEE_ANY); setSelectedSlot(''); }
    }, [day, assigneeId]);

    const durationOf = useCallback(
        (n: string) => info?.services.find((s) => s.name === n)?.duration ?? 0,
        [info],
    );
    const totalDuration = useMemo(
        () => selectedServices.reduce((sum, n) => sum + durationOf(n), 0),
        [selectedServices, durationOf],
    );
    const totalPrice = useMemo(
        () => selectedServices.reduce((sum, n) => sum + (info?.services.find((s) => s.name === n)?.price ?? 0), 0),
        [selectedServices, info],
    );
    const minServiceDuration = useMemo(() => {
        const ds = (info?.services ?? []).map((s) => s.duration).filter((d) => d > 0);
        return ds.length ? Math.min(...ds) : 0;
    }, [info]);

    const capByTime = useMemo(() => {
        const m = new Map<string, number>();
        for (const s of day?.slots ?? []) m.set(s.time, s.maxDurationMin);
        return m;
    }, [day]);

    // 시간 활성: 이 시각에서 (선택 시술 총소요, 없으면 최소 시술소요)만큼 연속 예약 가능한가.
    const isTimeEnabled = useCallback((t: string) => {
        const cap = capByTime.get(t) ?? 0;
        const need = totalDuration > 0 ? totalDuration : minServiceDuration;
        return need > 0 && cap >= need;
    }, [capByTime, totalDuration, minServiceDuration]);

    // 시술 활성: 이미 선택된 건 항상(해제 가능). 시간 선택 시 그 시각에 맞아야, 아니면 어느 시각이든 맞으면.
    const isServiceEnabled = useCallback((name: string) => {
        const dur = durationOf(name);
        if (dur <= 0) return false;
        if (selectedServices.includes(name)) return true;
        const need = totalDuration + dur;
        if (selectedSlot) return (capByTime.get(selectedSlot) ?? 0) >= need;
        for (const cap of capByTime.values()) if (cap >= need) return true;
        return false;
    }, [durationOf, selectedServices, totalDuration, selectedSlot, capByTime]);

    const toggleService = (name: string) => {
        if (!isServiceEnabled(name)) return;
        const next = selectedServices.includes(name)
            ? selectedServices.filter((n) => n !== name)
            : [...selectedServices, name];
        setSelectedServices(next);
        // 선택 시간이 새 총소요를 못 담으면 시간 선택 해제.
        const nextTotal = next.reduce((sum, n) => sum + durationOf(n), 0);
        if (selectedSlot && (capByTime.get(selectedSlot) ?? 0) < nextTotal) setSelectedSlot('');
    };

    const pickDate = (d: string) => { setDate(d); setSelectedSlot(''); };
    const pickAssignee = (id: string) => { setAssigneeId(id); setSelectedSlot(''); };
    const pickSlot = (t: string) => { if (isTimeEnabled(t)) setSelectedSlot((prev) => (prev === t ? '' : t)); };

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
                        setSubmitError('선택하신 시간이 방금 마감되었습니다. 다른 시간을 선택해 주세요.');
                    }
                    fetchDay();
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
                    <StyledTitle>예약이 신청되었습니다</StyledTitle>
                    <StyledSummary>
                        <StyledSummaryRow><span>날짜</span><StyledSummaryValue>{result.date}</StyledSummaryValue></StyledSummaryRow>
                        <StyledSummaryRow><span>시간</span><StyledSummaryValue>{result.startTime} ~ {result.endTime}</StyledSummaryValue></StyledSummaryRow>
                        <StyledSummaryRow><span>{labels.service}</span><StyledSummaryValue>{result.serviceSummary}</StyledSummaryValue></StyledSummaryRow>
                    </StyledSummary>
                    <StyledNotice>예약 신청이 접수되었습니다. <strong>매장 확인 후 확정</strong>되며, 아래 링크에서 진행 상태를 확인하실 수 있어요. 링크를 저장해 두시면 편리합니다.</StyledNotice>
                    <StyledManageLink href={`/book/${encodeURIComponent(slug)}/r/${result.publicToken}`}>내 예약 확인·변경·취소</StyledManageLink>
                </StyledCard>
            </StyledWrap>
        );
    }

    const showAssignees = info.settings.allowAssigneeChoice && info.assignees.length > 0;
    const dateOffsets = Array.from({length: info.settings.maxAdvanceDays + 1}, (_, i) => i);

    // 하단 '예약 내용' 요약용 파생값.
    const selectedAssigneeName = assigneeId === ASSIGNEE_ANY
        ? '상관없음'
        : (info.assignees.find((a) => a.id === assigneeId)?.name ?? '상관없음');
    const selectedDateLabel = date
        ? `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${DOW[clientDayIndex(date)]})`
        : '미선택';
    const selectedEnd = selectedSlot && totalDuration > 0 ? addMinutes(selectedSlot, totalDuration) : '';
    const selectedServiceItems = selectedServices
        .map((n) => info.services.find((s) => s.name === n))
        .filter((s): s is BookServiceInfo => !!s);

    return (
        <StyledWrap>
            <SeoHead title={`${info.storeName} 예약`} />
            <StyledCard>
                <StyledStore>{info.storeName}</StyledStore>
                <StyledTitle>온라인 예약</StyledTitle>
                {info.settings.noticeText && <StyledNotice>{info.settings.noticeText}</StyledNotice>}

                {showAssignees && (
                    <>
                        <StyledSectionLabel>{labels.assignee} 선택</StyledSectionLabel>
                        <PickerScrollRow>
                            <PillChip type="button" $on={assigneeId === ASSIGNEE_ANY} aria-pressed={assigneeId === ASSIGNEE_ANY} onClick={() => pickAssignee(ASSIGNEE_ANY)}>
                                상관없음
                            </PillChip>
                            {info.assignees.map((a) => {
                                const working = day?.assignees.find((x) => x.id === a.id)?.working ?? true;
                                return (
                                    <PillChip
                                        key={a.id}
                                        type="button"
                                        $on={assigneeId === a.id}
                                        aria-pressed={assigneeId === a.id}
                                        disabled={!working}
                                        title={!working ? '해당 날짜 휴무' : undefined}
                                        onClick={() => pickAssignee(a.id)}
                                    >
                                        {a.name}{!working && <LabelBadge $tone="neutral">휴무</LabelBadge>}
                                    </PillChip>
                                );
                            })}
                        </PickerScrollRow>
                    </>
                )}

                <StyledSectionLabel>날짜 선택</StyledSectionLabel>
                <PickerScrollRow>
                    {dateOffsets.map((off) => {
                        const d = localDateStr(off);
                        const disabled = isDateClosed(info, d);
                        const di = clientDayIndex(d);
                        return (
                            <DateCell
                                key={d}
                                type="button"
                                $on={date === d}
                                $weekend={di >= 5}
                                aria-pressed={date === d}
                                disabled={disabled}
                                onClick={() => pickDate(d)}
                            >
                                <span className="dow">{off === 0 ? '오늘' : DOW[di]}</span>
                                <span className="day">{Number(d.slice(8, 10))}</span>
                            </DateCell>
                        );
                    })}
                </PickerScrollRow>

                <StyledSectionLabel>{labels.service} 선택</StyledSectionLabel>
                {info.services.length === 0 && <StyledMuted>등록된 {labels.service}가 없습니다.</StyledMuted>}
                <ServiceChoiceWrap>
                    {info.services.map((s) => {
                        const on = selectedServices.includes(s.name);
                        return (
                            <ServiceChoiceChip
                                key={s.name}
                                type="button"
                                $on={on}
                                aria-pressed={on}
                                disabled={!isServiceEnabled(s.name)}
                                onClick={() => toggleService(s.name)}
                            >
                                <span className="nm">{s.name}</span>
                                <span className="mt">{s.duration}분 · {s.price.toLocaleString()}원</span>
                            </ServiceChoiceChip>
                        );
                    })}
                </ServiceChoiceWrap>

                <StyledSectionLabel>예약 가능한 시간</StyledSectionLabel>
                {dayLoading && <StyledMuted>시간을 불러오는 중…</StyledMuted>}
                {!dayLoading && day && !day.dateOk && <StyledMuted>선택하신 날짜는 예약할 수 없습니다.</StyledMuted>}
                {!dayLoading && day && day.dateOk && day.slots.length === 0 && (
                    <StyledMuted>예약 가능한 시간이 없습니다.</StyledMuted>
                )}
                {!dayLoading && day && day.dateOk && day.slots.length > 0 && (
                    <>
                        <SlotGrid>
                            {day.slots.map((s) => (
                                <SlotCell
                                    key={s.time}
                                    type="button"
                                    $on={selectedSlot === s.time}
                                    aria-pressed={selectedSlot === s.time}
                                    disabled={!isTimeEnabled(s.time)}
                                    onClick={() => pickSlot(s.time)}
                                >
                                    {s.time}
                                </SlotCell>
                            ))}
                        </SlotGrid>
                        <SlotLegend>
                            <span><i className="ok" /> 예약가능</span>
                            <span><i className="off" /> 마감</span>
                        </SlotLegend>
                    </>
                )}

                {selectedSlot && selectedServices.length > 0 && (
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
                    </>
                )}

                {/* 하단 sticky '예약 내용' 요약 — 스크롤 내려도 담당자·날짜 등 선택이 항상 보인다. */}
                <StyledStickyFooter>
                    <StyledSummaryCard>
                        <StyledSummaryHead>예약 내용</StyledSummaryHead>
                        {showAssignees && (
                            <StyledSumRow>
                                <StyledSumLabel>{labels.assignee}</StyledSumLabel>
                                <StyledSumValue>{selectedAssigneeName}</StyledSumValue>
                            </StyledSumRow>
                        )}
                        <StyledSumRow>
                            <StyledSumLabel>날짜</StyledSumLabel>
                            <StyledSumValue>{selectedDateLabel}</StyledSumValue>
                        </StyledSumRow>
                        <StyledSumRow>
                            <StyledSumLabel>시간</StyledSumLabel>
                            <StyledSumValue $muted={!selectedSlot}>
                                {selectedSlot ? `${selectedSlot}${selectedEnd ? ` ~ ${selectedEnd}` : ''}` : '시간을 선택하세요'}
                            </StyledSumValue>
                        </StyledSumRow>
                        <StyledSumRow $top>
                            <StyledSumLabel>{labels.service}</StyledSumLabel>
                            {selectedServiceItems.length > 0 ? (
                                <StyledSumServiceList>
                                    {selectedServiceItems.map((s) => (
                                        <StyledSumServiceRow key={s.name}>
                                            <span className="nm">{s.name}</span>
                                            <span className="mt">{s.duration}분 · {s.price.toLocaleString()}원</span>
                                        </StyledSumServiceRow>
                                    ))}
                                </StyledSumServiceList>
                            ) : (
                                <StyledSumValue $muted>{labels.service}를 선택하세요</StyledSumValue>
                            )}
                        </StyledSumRow>
                        {selectedServiceItems.length > 0 && (
                            <StyledSumTotalRow>
                                <span>합계</span>
                                <strong>{totalPrice.toLocaleString()}원 · {totalDuration}분</strong>
                            </StyledSumTotalRow>
                        )}
                    </StyledSummaryCard>

                    {submitError && <StyledError role="alert">{submitError}</StyledError>}

                    <StyledNextBtn type="button" disabled={!canSubmit} onClick={submit}>
                        {submitting ? '예약 중…' : '예약하기'}
                    </StyledNextBtn>
                </StyledStickyFooter>
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
    background: var(--white-color);
    @media (max-width: 640px) { padding: 0; }
`;

// 온보딩 카드와 톤 정렬: 화이트 배경 + 카드 그림자(데스크탑), 모바일은 풀블리드.
// box-sizing:border-box 필수 — 없으면 width:100% + 좌우 padding이 더해져
// 모바일(max-width:none)에서 카드가 뷰포트보다 넓어져 가로 스크롤·배경 잘림이 생긴다.
const StyledCard = styled.div`
    box-sizing: border-box;
    width: 100%;
    max-width: 480px;
    margin: auto 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 32px 28px;
    background: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    @media (max-width: 640px) {
        max-width: none;
        border-radius: 0;
        box-shadow: none;
        min-height: 100vh;
        padding: 24px 18px;
    }
`;

const StyledStore = styled.strong`
    font-size: var(--small-font);
    color: var(--brand-color);
    font-weight: 700;
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: var(--big-font);
    font-weight: 800;
    color: var(--black-color);
`;

const StyledNotice = styled.p`
    margin: 4px 0 0;
    padding: 10px 12px;
    background: var(--brand-color-bg);
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    line-height: 1.5;
    color: var(--dark-gray-color);
`;

const StyledSectionLabel = styled.strong`
    display: block;
    margin-top: 6px;
    font-size: var(--font);
    font-weight: 700;
    color: var(--black-color);
`;

const StyledField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledFieldLabel = styled.label`
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color2);
`;

// 공유 formControlStyle 재사용(radius·포커스링·비활성 상태 디자인 가이드 준수).
const StyledTextInput = styled.input`
    ${formControlStyle};
    width: 100%;
    height: 40px;
    padding: 0 12px;
    font-size: var(--small-font);
`;

// 하단 sticky 요약 바. 카드 폭 풀블리드(negative margin)로 뷰포트 하단에 고정.
const StyledStickyFooter = styled.div`
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin: 8px -28px -32px;
    padding: 14px 28px calc(env(safe-area-inset-bottom, 0px) + 18px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--white-color);
    border-top: 1px solid var(--light-gray-color);
    box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.06);
    @media (max-width: 640px) {
        margin: 8px -18px -24px;
        padding: 12px 18px calc(env(safe-area-inset-bottom, 0px) + 16px);
    }
`;

const StyledSummaryCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    background: var(--gray-color2);
    border-radius: var(--radius-md);
`;

const StyledSummaryHead = styled.strong`
    font-size: var(--small-font);
    font-weight: 700;
    color: var(--black-color);
`;

const StyledSumRow = styled.div<{$top?: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: ${(p) => (p.$top ? 'flex-start' : 'center')};
    gap: 12px;
    font-size: var(--small-font);
`;

const StyledSumLabel = styled.span`
    flex: 0 0 auto;
    color: var(--dark-gray-color2);
`;

const StyledSumValue = styled.span<{$muted?: boolean}>`
    text-align: right;
    font-weight: 600;
    color: ${(p) => (p.$muted ? 'var(--dark-gray-color2)' : 'var(--black-color)')};
`;

const StyledSumServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: right;
`;

const StyledSumServiceRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;

    .nm { font-weight: 600; color: var(--black-color); }
    .mt { font-size: var(--xsmall-font); color: var(--dark-gray-color2); }
`;

const StyledSumTotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2px;
    padding-top: 8px;
    border-top: 1px solid var(--light-gray-color);
    font-size: var(--small-font);
    color: var(--dark-gray-color);

    strong { color: var(--black-color); font-weight: 800; }
`;

const StyledSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    padding: 16px;
    background: var(--gray-color2);
    border-radius: var(--radius-md);
`;

const StyledSummaryRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledSummaryValue = styled.strong`
    color: var(--black-color);
    font-weight: 700;
    text-align: right;
`;

const StyledError = styled.p`
    margin: 8px 0 0;
    font-size: var(--small-font);
    color: var(--danger-color);
`;

const StyledNextBtn = styled.button`
    height: 50px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand-color);
    color: var(--white-color);
    font-size: var(--big-font);
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledMuted = styled.p`
    margin: 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledManageLink = styled.a`
    display: block;
    margin-top: 4px;
    padding: 14px;
    border: 1px solid var(--brand-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--brand-color);
    font-size: var(--small-font);
    font-weight: 700;
    text-align: center;
    text-decoration: none;
`;
