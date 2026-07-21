import {useCallback, useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {
    BOOK_STRINGS, formatDurationL, formatPriceL, localizedStoreLabels,
    statusLabelL, dowLabelL, todayLabelL, pickI18n, type I18nText,
} from '../../../../features/booking/i18n';
import {SeoHead} from '../../../../components/ui/SeoHead';
import {LabelBadge} from '../../../../components/ui/LabelBadge';
import {LangSwitcher, useBookLang, LANG_BAR_OFFSET} from '../../../../components/booking/LangSwitcher';
import {
    PickerScrollRow, PillChip, DateCell, ServiceChoiceChip, ServiceChoiceWrap,
    SlotGrid, SlotCell,
} from '../../../../components/booking/BookingPickers';

interface PendingChange {
    date: string;
    startTime: string;
    endTime: string;
    serviceSummary: string;
}
interface ReservationView {
    status: 'active' | 'completed' | 'cancelled' | 'noshow' | 'requested';
    date: string;
    startTime: string;
    endTime: string;
    serviceSummary: string;
    assigneeName: string | null;
    customerName: string | null;
    storeName: string;
    shopType: string | null;
    slug: string | null;
    pendingAction: 'none' | 'cancel' | 'change';
    pendingChange: PendingChange | null;
    canRequest: boolean;
    canCancel: boolean;
    // 상태별 오너 안내문구(#139): 확정·취소일 때만 서버가 채운다. 없으면 null.
    statusMessage: {text: string | null; i18n: I18nText} | null;
    // 오너가 남긴 승인/거절/취소 사유(선택). 없으면 상태별 기본문구로 대체.
    decisionReason: string | null;
}

interface BookServiceInfo {name: string; category: string; duration: number; price: number}
interface BookAssigneeInfo {id: string; name: string; color: string | null; offDays: number[]}
interface BookBusinessHour {dayIndex: number; openTime: string; closeTime: string; enabled: boolean}
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    businessHours: BookBusinessHour[];
    closedDates: string[];
    settings: {allowAssigneeChoice: boolean; noticeText: string | null; maxAdvanceDays: number};
}

const ASSIGNEE_ANY = '__any__';

function localDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 서버 dayIndexOf와 동일(0=월…6=일).
function clientDayIndex(dateStr: string): number {
    return (new Date(`${dateStr}T12:00:00Z`).getUTCDay() + 6) % 7;
}

// 매장 휴무일·영업요일 아님 → 날짜 비활성.
function isDateClosed(store: BookStoreInfo, dateStr: string): boolean {
    if (store.closedDates.includes(dateStr)) return true;
    const bh = store.businessHours.find((b) => b.dayIndex === clientDayIndex(dateStr));
    return !bh || !bh.enabled;
}

export default function ReservationManagePage() {
    const router = useRouter();
    const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
    const token = typeof router.query.token === 'string' ? router.query.token : '';

    const [lang, setLang] = useBookLang();
    const t = BOOK_STRINGS[lang];

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [reservation, setReservation] = useState<ReservationView | null>(null);
    const [actionMsg, setActionMsg] = useState<string>('');
    const [busy, setBusy] = useState(false);

    // 변경 요청 폼
    const [changeOpen, setChangeOpen] = useState(false);
    const [store, setStore] = useState<BookStoreInfo | null>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [assigneeId, setAssigneeId] = useState<string>(ASSIGNEE_ANY);
    const [date, setDate] = useState<string>('');
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    const loadReservation = useCallback(() => {
        if (!token) return;
        setLoading(true);
        fetch(`/api/book/reservation/${encodeURIComponent(token)}`)
            .then((res) => {
                if (res.status === 404) { setNotFound(true); return null; }
                return res.ok ? res.json() : Promise.reject(new Error('load failed'));
            })
            .then((data) => { if (data) setReservation(data as ReservationView); })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [token]);

    // 최초 로드. loadReservation이 로딩 플래그를 세우는 표준 fetch-in-effect 패턴이라 규칙 로컬 예외.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadReservation(); }, [loadReservation]);

    const labels = useMemo(() => localizedStoreLabels(reservation?.shopType ?? null, lang), [reservation?.shopType, lang]);

    // 변경 폼 열 때 매장 정보(서비스·담당자·규칙) 로드
    const openChange = () => {
        setChangeOpen(true);
        setActionMsg('');
        // 현재 예약 날짜를 기본 선택(날짜 스트립에서 하이라이트).
        if (reservation && !date) setDate(reservation.date);
        if (store || !slug) return;
        fetch(`/api/book/${encodeURIComponent(slug)}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('store failed'))))
            .then((data) => setStore(data as BookStoreInfo))
            .catch(() => setActionMsg(t.storeLoadFailed));
    };

    // 담당자 선택 시 현재 날짜가 그 담당자 휴무면 근무하는 첫 날짜로 이동(예약 화면과 동일).
    const pickChangeAssignee = (id: string) => {
        setAssigneeId(id);
        setSelectedSlot('');
        if (!store) return;
        const off = id !== ASSIGNEE_ANY ? (store.assignees.find((a) => a.id === id)?.offDays ?? []) : [];
        if (date && off.includes(clientDayIndex(date))) {
            for (let i = 0; i <= store.settings.maxAdvanceDays; i += 1) {
                const d = localDateStr(i);
                if (!isDateClosed(store, d) && !off.includes(clientDayIndex(d))) { setDate(d); break; }
            }
        }
    };

    const toggleService = (name: string) => {
        setSelectedServices((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
        setSelectedSlot('');
    };

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => fetchSlots(), [fetchSlots]);

    const submitCancel = () => {
        if (busy) return;
        if (!window.confirm(t.confirmCancel)) return;
        setBusy(true);
        setActionMsg('');
        fetch(`/api/book/reservation/${encodeURIComponent(token)}/request-cancel`, {method: 'POST'})
            .then(async (res) => {
                if (res.ok) { setActionMsg(t.cancelRequested); loadReservation(); return; }
                const data = await res.json().catch(() => ({}));
                setActionMsg(data.error === 'already_pending' ? t.alreadyPending : t.requestFailed);
            })
            .catch(() => setActionMsg(t.requestFailed))
            .finally(() => setBusy(false));
    };

    const canSubmitChange = selectedServices.length > 0 && !!date && !!selectedSlot && !busy;

    const submitChange = () => {
        if (!canSubmitChange) return;
        setBusy(true);
        setActionMsg('');
        fetch(`/api/book/reservation/${encodeURIComponent(token)}/request-change`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({date, startTime: selectedSlot, services: selectedServices, assigneeId: assigneeId !== ASSIGNEE_ANY ? assigneeId : null}),
        })
            .then(async (res) => {
                if (res.ok) { setChangeOpen(false); setActionMsg(t.changeRequested); loadReservation(); return; }
                const data = await res.json().catch(() => ({}));
                const code = typeof data.error === 'string' ? data.error : '';
                if (code === 'already_pending') setActionMsg(t.alreadyPending);
                else if (code === 'slot_taken') { setActionMsg(t.errSlotTaken); fetchSlots(); setSelectedSlot(''); }
                else if (code === 'unavailable_date') setActionMsg(t.dateUnavailable);
                else setActionMsg(t.requestFailed);
            })
            .catch(() => setActionMsg(t.requestFailed))
            .finally(() => setBusy(false));
    };

    if (loading) {
        return (
            <StyledWrap>
                <StyledCard><StyledMuted>{t.loading}</StyledMuted></StyledCard>
                <LangSwitcher lang={lang} onChange={setLang} />
            </StyledWrap>
        );
    }
    if (notFound || !reservation) {
        return (
            <StyledWrap>
                <SeoHead title={t.resNotFoundTitle} />
                <StyledCard>
                    <StyledTitle>{t.resNotFoundTitle}</StyledTitle>
                    <StyledMuted>{t.resNotFoundDesc}</StyledMuted>
                </StyledCard>
                <LangSwitcher lang={lang} onChange={setLang} />
            </StyledWrap>
        );
    }

    const pending = reservation.pendingAction !== 'none';
    // 확정/취소 상태에서 오너가 설정한 안내문구(선택 언어, 비면 한국어 폴백). 없으면 미표시.
    const statusMsg = reservation.statusMessage
        ? pickI18n(reservation.statusMessage.i18n, lang, reservation.statusMessage.text ?? '')
        : '';
    // 오너가 남긴 개별 사유(원문 표시). 없으면 확정/취소 상태에 한해 기본문구로 대체.
    const decisionMsg = reservation.decisionReason
        ? reservation.decisionReason
        : reservation.status === 'active' ? t.decisionApprovedDefault
        : reservation.status === 'cancelled' ? t.decisionCancelledDefault
        : '';

    return (
        <StyledWrap>
            <SeoHead title={`${reservation.storeName} · ${t.myReservation}`} />
            <StyledCard>
                <StyledStore>{reservation.storeName}</StyledStore>
                <StyledTitle>{t.myReservation}</StyledTitle>

                <StyledStatusBadge $status={reservation.status}>{statusLabelL(reservation.status, lang)}</StyledStatusBadge>

                <StyledSummary>
                    <StyledSummaryRow><span>{t.date}</span><StyledSummaryValue>{reservation.date}</StyledSummaryValue></StyledSummaryRow>
                    <StyledSummaryRow><span>{t.time}</span><StyledSummaryValue>{reservation.startTime} ~ {reservation.endTime}</StyledSummaryValue></StyledSummaryRow>
                    <StyledSummaryRow><span>{labels.service}</span><StyledSummaryValue>{reservation.serviceSummary}</StyledSummaryValue></StyledSummaryRow>
                    {reservation.assigneeName && <StyledSummaryRow><span>{labels.assignee}</span><StyledSummaryValue>{reservation.assigneeName}</StyledSummaryValue></StyledSummaryRow>}
                </StyledSummary>

                {decisionMsg && (
                    <StyledNotice>
                        {reservation.decisionReason && <StyledNoticeLabel>{t.decisionReasonLabel}</StyledNoticeLabel>}
                        {decisionMsg}
                    </StyledNotice>
                )}

                {statusMsg && <StyledNotice>{statusMsg}</StyledNotice>}

                {pending && (
                    <StyledNotice>
                        {reservation.pendingAction === 'cancel' && t.pendingCancel}
                        {reservation.pendingAction === 'change' && reservation.pendingChange && (
                            <>{t.pendingChangePrefix}<br />
                            {t.requestLabel}: {reservation.pendingChange.date} {reservation.pendingChange.startTime}~{reservation.pendingChange.endTime} ({reservation.pendingChange.serviceSummary})</>
                        )}
                    </StyledNotice>
                )}

                {actionMsg && <StyledNotice role="status">{actionMsg}</StyledNotice>}

                {(reservation.canRequest || reservation.canCancel) && !pending && !changeOpen && (
                    <StyledActions>
                        {reservation.canRequest && <StyledSecondaryBtn type="button" onClick={openChange} disabled={busy}>{t.changeRequestBtn}</StyledSecondaryBtn>}
                        {reservation.canCancel && <StyledDangerBtn type="button" onClick={submitCancel} disabled={busy}>{t.cancelRequestBtn}</StyledDangerBtn>}
                    </StyledActions>
                )}

                {reservation.status === 'requested' && !pending && (
                    <StyledNotice>{t.requestedNotice}</StyledNotice>
                )}

                {!reservation.canRequest && !reservation.canCancel && !pending && reservation.status !== 'requested' && (
                    <StyledMuted>{t.noActionAvailable}</StyledMuted>
                )}

                {changeOpen && (
                    <>
                        {!store && <StyledMuted>{t.loading}</StyledMuted>}
                        {store && (
                            <>
                                {store.settings.allowAssigneeChoice && store.assignees.length > 0 && (
                                    <>
                                        <StyledSectionLabel>{t.selectAssignee(labels.assignee)}</StyledSectionLabel>
                                        <PickerScrollRow>
                                            <PillChip type="button" $on={assigneeId === ASSIGNEE_ANY} aria-pressed={assigneeId === ASSIGNEE_ANY} onClick={() => pickChangeAssignee(ASSIGNEE_ANY)}>
                                                {t.anyAssignee}
                                            </PillChip>
                                            {store.assignees.map((a) => {
                                                const off = date ? a.offDays.includes(clientDayIndex(date)) : false;
                                                return (
                                                    <PillChip key={a.id} type="button" $on={assigneeId === a.id} aria-pressed={assigneeId === a.id} disabled={off} title={off ? t.dayOffTitle : undefined} onClick={() => pickChangeAssignee(a.id)}>
                                                        {a.name}{off && <LabelBadge $tone="neutral">{t.dayOff}</LabelBadge>}
                                                    </PillChip>
                                                );
                                            })}
                                        </PickerScrollRow>
                                    </>
                                )}

                                <StyledSectionLabel>{t.selectDate}</StyledSectionLabel>
                                <PickerScrollRow>
                                    {Array.from({length: store.settings.maxAdvanceDays + 1}, (_, i) => i).map((off) => {
                                        const d = localDateStr(off);
                                        const di = clientDayIndex(d);
                                        const assigneeOff = assigneeId !== ASSIGNEE_ANY ? (store.assignees.find((a) => a.id === assigneeId)?.offDays ?? []) : [];
                                        const disabled = isDateClosed(store, d) || assigneeOff.includes(di);
                                        return (
                                            <DateCell key={d} type="button" $on={date === d} $weekend={di >= 5} aria-pressed={date === d} disabled={disabled} onClick={() => { setDate(d); setSelectedSlot(''); }}>
                                                <span className="dow">{off === 0 ? todayLabelL(lang) : dowLabelL(di, lang)}</span>
                                                <span className="day">{Number(d.slice(8, 10))}</span>
                                            </DateCell>
                                        );
                                    })}
                                </PickerScrollRow>

                                <StyledSectionLabel>{t.selectServiceToChange(labels.service)}</StyledSectionLabel>
                                <ServiceChoiceWrap>
                                    {store.services.map((s) => {
                                        const on = selectedServices.includes(s.name);
                                        return (
                                            <ServiceChoiceChip key={s.name} type="button" $on={on} aria-pressed={on} onClick={() => toggleService(s.name)}>
                                                <span className="nm">{s.name}</span>
                                                <span className="mt">{formatDurationL(s.duration, lang)} · {formatPriceL(s.price, lang)}</span>
                                            </ServiceChoiceChip>
                                        );
                                    })}
                                </ServiceChoiceWrap>

                                {selectedServices.length > 0 && date && (
                                    <>
                                        <StyledSectionLabel>{t.selectTime}</StyledSectionLabel>
                                        {slotsLoading && <StyledMuted>{t.loadingTime}</StyledMuted>}
                                        {!slotsLoading && slots.length === 0 && <StyledMuted>{t.noAvailableTime}</StyledMuted>}
                                        {!slotsLoading && slots.length > 0 && (
                                            <SlotGrid>
                                                {slots.map((slot) => (
                                                    <SlotCell key={slot} type="button" $on={selectedSlot === slot} aria-pressed={selectedSlot === slot} onClick={() => setSelectedSlot(slot)}>{slot}</SlotCell>
                                                ))}
                                            </SlotGrid>
                                        )}
                                    </>
                                )}

                                <StyledActions>
                                    <StyledSecondaryBtn type="button" onClick={() => { setChangeOpen(false); setActionMsg(''); }} disabled={busy}>{t.changeCancel}</StyledSecondaryBtn>
                                    <StyledPrimaryBtn type="button" onClick={submitChange} disabled={!canSubmitChange}>{busy ? t.changeSubmitting : t.changeSubmit}</StyledPrimaryBtn>
                                </StyledActions>
                            </>
                        )}
                    </>
                )}
            </StyledCard>
            <LangSwitcher lang={lang} onChange={setLang} />
        </StyledWrap>
    );
}

export const getServerSideProps = async () => ({props: {}});

const StyledWrap = styled.div`
    min-height: 100%;
    display: flex;
    justify-content: center;
    /* 하단 여백은 고정 언어 바 높이만큼 확보(콘텐츠가 바에 가리지 않도록). */
    padding: 24px 16px ${LANG_BAR_OFFSET};
    box-sizing: border-box;
    background: var(--white-color);
    @media (max-width: 640px) { padding: 0 0 ${LANG_BAR_OFFSET}; }
`;

// 예약 화면과 동일 톤: box-sizing:border-box(모바일 가로 오버플로 방지), 화이트 배경 + 그림자.
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
        min-height: 100dvh;
        padding: 24px 18px;
    }
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

const StyledStatusBadge = styled.span<{$status: ReservationView['status']}>`
    align-self: flex-start;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: ${(p) => (p.$status === 'active' ? 'var(--brand-color, #6526d9)'
        : p.$status === 'requested' ? 'var(--caution-color, #a88417)'
        : p.$status === 'completed' ? 'var(--success-color, #2f9e44)'
        : 'var(--dark-gray-color2, #667)')};
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

const StyledNoticeLabel = styled.strong`
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-color, #6526d9);
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
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;

const StyledSummaryValue = styled.strong`
    color: var(--black-color, #111);
    font-weight: 700;
    text-align: right;
`;

const StyledActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 16px;
`;

// 디자인 가이드/StyledActionButton 정렬: radius 8(--radius-lg), weight 600/500,
// 1px 토큰 보더, shadow-sm, 취소는 danger-outline. 공용 페이지라 터치 높이(48px)는 유지.
const StyledPrimaryBtn = styled.button`
    flex: 1;
    height: 48px;
    border: none;
    border-radius: var(--radius-lg);
    background: var(--brand-color);
    color: var(--white-color);
    font-size: 15px;
    font-weight: 600;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledSecondaryBtn = styled.button`
    flex: 1;
    height: 48px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    color: var(--dark-gray-color);
    font-size: 15px;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledDangerBtn = styled.button`
    flex: 1;
    height: 48px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    color: var(--danger-color);
    font-size: 15px;
    font-weight: 600;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledMuted = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;
