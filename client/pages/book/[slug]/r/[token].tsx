import {useCallback, useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {getStoreLabels} from '../../../../features/store-settings/labels';
import {SeoHead} from '../../../../components/ui/SeoHead';

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
}

interface BookServiceInfo {name: string; category: string; duration: number; price: number}
interface BookAssigneeInfo {id: string; name: string; color: string | null}
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    settings: {allowAssigneeChoice: boolean; noticeText: string | null; maxAdvanceDays: number};
}

const ASSIGNEE_ANY = '__any__';

const STATUS_LABEL: Record<ReservationView['status'], string> = {
    requested: '신청 접수 · 확정 대기',
    active: '예약 확정',
    completed: '방문 완료',
    cancelled: '취소됨',
    noshow: '노쇼',
};

function localDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ReservationManagePage() {
    const router = useRouter();
    const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
    const token = typeof router.query.token === 'string' ? router.query.token : '';

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

    const labels = useMemo(() => getStoreLabels(reservation?.shopType ?? null), [reservation?.shopType]);

    // 변경 폼 열 때 매장 정보(서비스·담당자·규칙) 로드
    const openChange = () => {
        setChangeOpen(true);
        setActionMsg('');
        if (store || !slug) return;
        fetch(`/api/book/${encodeURIComponent(slug)}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('store failed'))))
            .then((data) => setStore(data as BookStoreInfo))
            .catch(() => setActionMsg('예약 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
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
        if (!window.confirm('예약 취소를 요청하시겠어요? 매장 확인 후 취소됩니다.')) return;
        setBusy(true);
        setActionMsg('');
        fetch(`/api/book/reservation/${encodeURIComponent(token)}/request-cancel`, {method: 'POST'})
            .then(async (res) => {
                if (res.ok) { setActionMsg('취소 요청이 접수되었습니다. 매장 확인을 기다려 주세요.'); loadReservation(); return; }
                const data = await res.json().catch(() => ({}));
                setActionMsg(data.error === 'already_pending' ? '이미 처리 대기 중인 요청이 있습니다.' : '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            })
            .catch(() => setActionMsg('요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
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
                if (res.ok) { setChangeOpen(false); setActionMsg('변경 요청이 접수되었습니다. 매장 확인을 기다려 주세요.'); loadReservation(); return; }
                const data = await res.json().catch(() => ({}));
                const code = typeof data.error === 'string' ? data.error : '';
                if (code === 'already_pending') setActionMsg('이미 처리 대기 중인 요청이 있습니다.');
                else if (code === 'slot_taken') { setActionMsg('선택하신 시간이 방금 마감되었습니다. 다른 시간을 선택해 주세요.'); fetchSlots(); setSelectedSlot(''); }
                else if (code === 'unavailable_date') setActionMsg('선택하신 날짜는 예약할 수 없습니다.');
                else setActionMsg('요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            })
            .catch(() => setActionMsg('요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
            .finally(() => setBusy(false));
    };

    if (loading) {
        return <StyledWrap><StyledCard><StyledMuted>불러오는 중…</StyledMuted></StyledCard></StyledWrap>;
    }
    if (notFound || !reservation) {
        return (
            <StyledWrap>
                <SeoHead title="예약을 찾을 수 없습니다" />
                <StyledCard>
                    <StyledTitle>예약을 찾을 수 없습니다</StyledTitle>
                    <StyledMuted>링크가 올바른지 확인해 주세요.</StyledMuted>
                </StyledCard>
            </StyledWrap>
        );
    }

    const pending = reservation.pendingAction !== 'none';

    return (
        <StyledWrap>
            <SeoHead title={`${reservation.storeName} 예약 확인`} />
            <StyledCard>
                <StyledStore>{reservation.storeName}</StyledStore>
                <StyledTitle>내 예약</StyledTitle>

                <StyledStatusBadge $status={reservation.status}>{STATUS_LABEL[reservation.status]}</StyledStatusBadge>

                <StyledSummary>
                    <StyledSummaryRow><span>날짜</span><StyledSummaryValue>{reservation.date}</StyledSummaryValue></StyledSummaryRow>
                    <StyledSummaryRow><span>시간</span><StyledSummaryValue>{reservation.startTime} ~ {reservation.endTime}</StyledSummaryValue></StyledSummaryRow>
                    <StyledSummaryRow><span>{labels.service}</span><StyledSummaryValue>{reservation.serviceSummary}</StyledSummaryValue></StyledSummaryRow>
                    {reservation.assigneeName && <StyledSummaryRow><span>{labels.assignee}</span><StyledSummaryValue>{reservation.assigneeName}</StyledSummaryValue></StyledSummaryRow>}
                </StyledSummary>

                {pending && (
                    <StyledNotice>
                        {reservation.pendingAction === 'cancel' && '취소 요청이 접수되어 매장 확인을 기다리고 있습니다.'}
                        {reservation.pendingAction === 'change' && reservation.pendingChange && (
                            <>변경 요청이 접수되어 매장 확인을 기다리고 있습니다.<br />
                            요청: {reservation.pendingChange.date} {reservation.pendingChange.startTime}~{reservation.pendingChange.endTime} ({reservation.pendingChange.serviceSummary})</>
                        )}
                    </StyledNotice>
                )}

                {actionMsg && <StyledNotice role="status">{actionMsg}</StyledNotice>}

                {reservation.canRequest && !pending && !changeOpen && (
                    <StyledActions>
                        <StyledSecondaryBtn type="button" onClick={openChange} disabled={busy}>변경 요청</StyledSecondaryBtn>
                        <StyledDangerBtn type="button" onClick={submitCancel} disabled={busy}>취소 요청</StyledDangerBtn>
                    </StyledActions>
                )}

                {!reservation.canRequest && !pending && (
                    <StyledMuted>이 예약은 변경·취소 요청을 할 수 없는 상태입니다.</StyledMuted>
                )}

                {changeOpen && (
                    <>
                        <StyledSectionLabel>변경할 {labels.service} 선택</StyledSectionLabel>
                        {!store && <StyledMuted>불러오는 중…</StyledMuted>}
                        {store && (
                            <>
                                <StyledServiceList>
                                    {store.services.map((s) => {
                                        const on = selectedServices.includes(s.name);
                                        return (
                                            <StyledServiceCard key={s.name} type="button" $on={on} aria-pressed={on} onClick={() => toggleService(s.name)}>
                                                <StyledServiceName>{s.name}</StyledServiceName>
                                                <StyledServiceMeta>{s.duration}분 · {s.price.toLocaleString()}원</StyledServiceMeta>
                                            </StyledServiceCard>
                                        );
                                    })}
                                </StyledServiceList>

                                {store.settings.allowAssigneeChoice && store.assignees.length > 0 && (
                                    <>
                                        <StyledSectionLabel>{labels.assignee} 선택</StyledSectionLabel>
                                        <StyledSelect value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); setSelectedSlot(''); }}>
                                            <option value={ASSIGNEE_ANY}>상관없음</option>
                                            {store.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </StyledSelect>
                                    </>
                                )}

                                {selectedServices.length > 0 && (
                                    <>
                                        <StyledSectionLabel>날짜 선택</StyledSectionLabel>
                                        <StyledDateInput type="date" value={date} min={localDateStr(0)} max={localDateStr(store.settings.maxAdvanceDays)} onChange={(e) => { setDate(e.target.value); setSelectedSlot(''); }} />
                                        {date && (
                                            <>
                                                <StyledSectionLabel>시간 선택</StyledSectionLabel>
                                                {slotsLoading && <StyledMuted>시간을 불러오는 중…</StyledMuted>}
                                                {!slotsLoading && slots.length === 0 && <StyledMuted>예약 가능한 시간이 없습니다.</StyledMuted>}
                                                {!slotsLoading && slots.length > 0 && (
                                                    <StyledSlotGrid>
                                                        {slots.map((slot) => (
                                                            <StyledSlotBtn key={slot} type="button" $on={selectedSlot === slot} aria-pressed={selectedSlot === slot} onClick={() => setSelectedSlot(slot)}>{slot}</StyledSlotBtn>
                                                        ))}
                                                    </StyledSlotGrid>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                <StyledActions>
                                    <StyledSecondaryBtn type="button" onClick={() => { setChangeOpen(false); setActionMsg(''); }} disabled={busy}>취소</StyledSecondaryBtn>
                                    <StyledPrimaryBtn type="button" onClick={submitChange} disabled={!canSubmitChange}>{busy ? '요청 중…' : '변경 요청 보내기'}</StyledPrimaryBtn>
                                </StyledActions>
                            </>
                        )}
                    </>
                )}
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

const StyledActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 16px;
`;

const StyledPrimaryBtn = styled.button`
    flex: 1;
    height: 48px;
    border: none;
    border-radius: 12px;
    background: var(--brand-color, #6526d9);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledSecondaryBtn = styled.button`
    flex: 1;
    height: 48px;
    border: 2px solid var(--light-gray-color, #e4e7eb);
    border-radius: 12px;
    background: var(--white-color, #fff);
    color: var(--dark-gray-color, #444);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledDangerBtn = styled.button`
    flex: 1;
    height: 48px;
    border: 2px solid var(--danger-color, #d64545);
    border-radius: 12px;
    background: var(--white-color, #fff);
    color: var(--danger-color, #d64545);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
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

const StyledMuted = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;
