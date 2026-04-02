import {useState, useEffect, useMemo, type DragEvent} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';
import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {getDailyRevenue, getMonthlyRevenue} from '../utils/revenue';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../utils/services';
import type {ServiceItem} from '../utils/services';
import type {Reservation, ReservationMap, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate, toDateKey} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {CustomerMap} from '../utils/customers';

import {ReservationDetail} from '../components/calendar/ReservationDetail';

import customersData from './api/customers.json';

type SettingsProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
};

type SettingsTab = 'revenue' | 'service';
type RevenueTab = 'daily' | 'monthly';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function formatMonthLabel(year: number, month: number): string {
    return `${year}년 ${month + 1}월`;
}

function formatShortDate(dateKey: string): string {
    const parts = dateKey.split('-');
    const d = Number(parts[2]);
    const date = new Date(dateKey + 'T00:00:00');
    return `${d}일 (${WEEKDAYS[date.getDay()]})`;
}

interface EditState {
    name: string;
    durationMinutes: string;
    price: string;
}

const EMPTY_FORM = {name: '', category: '', durationMinutes: '', price: ''};

/* ── Revenue Section ── */

interface RevenueSectionProps {
    reservationMap: ReservationMap;
    onSelectReservation: (reservation: Reservation) => void;
    view: RevenueTab;
    setView: (v: RevenueTab) => void;
    dateKey: string;
    setDateKey: (key: string) => void;
    year: number;
    month: number;
    setYearMonth: (y: number, m: number) => void;
}

const RevenueSection = ({reservationMap, onSelectReservation, view, setView, dateKey, setDateKey, year, month, setYearMonth}: RevenueSectionProps) => {
    const daily = getDailyRevenue(reservationMap, dateKey);
    const monthly = getMonthlyRevenue(reservationMap, year, month);

    const navigateDay = (offset: number) => {
        const d = new Date(dateKey + 'T00:00:00');
        d.setDate(d.getDate() + offset);
        setDateKey(toDateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    };

    const navigateMonth = (offset: number) => {
        const d = new Date(year, month + offset, 1);
        setYearMonth(d.getFullYear(), d.getMonth());
    };

    return (
        <>
            <StyledSubTabs>
                <StyledSubTab type="button" $active={view === 'daily'} onClick={() => setView('daily')}>일별</StyledSubTab>
                <StyledSubTab type="button" $active={view === 'monthly'} onClick={() => setView('monthly')}>월별</StyledSubTab>
            </StyledSubTabs>

            {view === 'daily' && (
                <StyledCardBody>
                    <StyledNav>
                        <button type="button" onClick={() => navigateDay(-1)} aria-label="이전 날">&#x276E;</button>
                        <span>{formatDateLabel(dateKey)}</span>
                        <button type="button" onClick={() => navigateDay(1)} aria-label="다음 날">&#x276F;</button>
                    </StyledNav>

                    {daily.count === 0 ? (
                        <StyledEmpty>예약 없음</StyledEmpty>
                    ) : (
                        <StyledList>
                            {daily.items.map((item) => {
                                const reservation = (reservationMap[dateKey] || []).find((r) => r.id === item.reservationId);
                                return (
                                    <StyledClickableRow key={item.reservationId}
                                                        onClick={() => reservation && onSelectReservation(reservation)}>
                                        <StyledTime>{item.startTime}</StyledTime>
                                        <StyledService>{item.service}</StyledService>
                                        <StyledPrice>{formatPrice(item.price)}</StyledPrice>
                                    </StyledClickableRow>
                                );
                            })}
                        </StyledList>
                    )}

                    <StyledSummary>
                        <span>{daily.count}건</span>
                        <strong>{formatPrice(daily.total)}</strong>
                    </StyledSummary>
                </StyledCardBody>
            )}

            {view === 'monthly' && (
                <StyledCardBody>
                    <StyledNav>
                        <button type="button" onClick={() => navigateMonth(-1)} aria-label="이전 달">&#x276E;</button>
                        <span>{formatMonthLabel(year, month)}</span>
                        <button type="button" onClick={() => navigateMonth(1)} aria-label="다음 달">&#x276F;</button>
                    </StyledNav>

                    {monthly.days.length === 0 ? (
                        <StyledEmpty>매출 없음</StyledEmpty>
                    ) : (
                        <StyledList>
                            {monthly.days.map((day) => (
                                <StyledClickableRow key={day.dateKey}
                                                    onClick={() => setDateKey(day.dateKey)}>
                                    <StyledDate>{formatShortDate(day.dateKey)}</StyledDate>
                                    <StyledCount>{day.count}건</StyledCount>
                                    <StyledPrice>{formatPrice(day.total)}</StyledPrice>
                                </StyledClickableRow>
                            ))}
                        </StyledList>
                    )}

                    <StyledSummary>
                        <span>{monthly.count}건</span>
                        <strong>{formatPrice(monthly.total)}</strong>
                    </StyledSummary>
                </StyledCardBody>
            )}
        </>
    );
};

/* ── Service Manage Section ── */

const ServiceManageSection = () => {
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const addService = useCalendarStore((s) => s.addService);
    const updateService = useCalendarStore((s) => s.updateService);
    const deleteService = useCalendarStore((s) => s.deleteService);
    const moveCategory = useCalendarStore((s) => s.moveCategory);
    const moveServiceInCategory = useCalendarStore((s) => s.moveServiceInCategory);
    const updateCategoryBaseColor = useCalendarStore((s) => s.updateCategoryBaseColor);

    const grouped = getGroupedCatalog(serviceCatalog);
    const categories = Array.from(grouped.keys());
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    const [editingName, setEditingName] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState>({name: '', durationMinutes: '', price: ''});
    const [form, setForm] = useState(EMPTY_FORM);
    const [newCategory, setNewCategory] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [dragOverName, setDragOverName] = useState<string | null>(null);
    const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

    const startEdit = (item: ServiceItem) => {
        setEditingName(item.name);
        setEditState({
            name: item.name,
            durationMinutes: String(item.durationMinutes),
            price: String(item.price),
        });
    };

    const saveEdit = (original: ServiceItem) => {
        const updated: ServiceItem = {
            name: editState.name.trim() || original.name,
            category: original.category,
            durationMinutes: Number(editState.durationMinutes) || 0,
            price: Number(editState.price) || 0,
        };
        updateService(original.name, updated);
        setEditingName(null);
    };

    const handleDelete = (name: string) => {
        if (confirm(`"${name}" 항목을 삭제하시겠습니까?`)) {
            deleteService(name);
            if (editingName === name) setEditingName(null);
        }
    };

    const handleAdd = () => {
        const name = form.name.trim();
        const category = form.category === '__new' ? newCategory.trim() : form.category.trim();
        if (!name || !category) return;

        addService({
            name,
            category,
            durationMinutes: Number(form.durationMinutes) || 0,
            price: Number(form.price) || 0,
        });
        setForm(EMPTY_FORM);
        setNewCategory('');
        setShowAdd(false);
    };

    const handleDragStart = (name: string) => {
        setDraggingName(name);
        setDragOverName(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, overName: string) => {
        if (draggingCategory) return;
        if (!draggingName || draggingName === overName) return;
        e.preventDefault();
        setDragOverName(overName);
    };

    const handleDrop = (targetName: string) => {
        if (draggingCategory) return;
        if (!draggingName || draggingName === targetName) return;
        moveServiceInCategory(draggingName, targetName);
        setDragOverName(null);
        setDraggingName(null);
    };

    const handleCategoryDragStart = (category: string) => {
        setDraggingCategory(category);
        setDragOverCategory(null);
        setDraggingName(null);
        setDragOverName(null);
    };

    const handleCategoryDragOver = (e: DragEvent<HTMLDivElement>, category: string) => {
        if (!draggingCategory || draggingCategory === category) return;
        e.preventDefault();
        setDragOverCategory(category);
    };

    const handleCategoryDrop = (category: string) => {
        if (!draggingCategory || draggingCategory === category) return;
        moveCategory(draggingCategory, category);
        setDragOverCategory(null);
        setDraggingCategory(null);
    };

    const handleDragEnd = () => {
        setDragOverName(null);
        setDraggingName(null);
        setDragOverCategory(null);
        setDraggingCategory(null);
    };

    return (
        <>
            <StyledServiceBody>
                {Array.from(grouped.entries()).map(([category, items]) => (
                    <StyledGroup key={category}
                                 onDragOver={(e) => handleCategoryDragOver(e, category)}
                                 onDrop={() => handleCategoryDrop(category)}
                                 onDragEnd={handleDragEnd}
                                 $isCategoryDragging={draggingCategory === category}
                                 $isCategoryDragOver={dragOverCategory === category && draggingCategory !== category}>
                        <StyledCategoryHeader>
                            <StyledCategoryLabel>
                                <StyledCategoryDragHandle
                                    draggable
                                    onDragStart={() => handleCategoryDragStart(category)}
                                    title="카테고리 순서 이동"
                                >
                                    ::
                                </StyledCategoryDragHandle>
                                <span>{category}</span>
                            </StyledCategoryLabel>
                            <StyledCategoryColorInput
                                type="color"
                                value={getCategoryBaseColor(category, categoryBaseColorMap)}
                                onChange={(e) => updateCategoryBaseColor(category, e.target.value)}
                                aria-label={`${category} 대표 컬러`}
                                title={`${category} 대표 컬러`}
                            />
                        </StyledCategoryHeader>
                        {items.map((item) => (
                            <StyledItem key={item.name}
                                        draggable={editingName !== item.name && !draggingCategory}
                                        onDragStart={() => handleDragStart(item.name)}
                                        onDragOver={(e) => handleDragOver(e, item.name)}
                                        onDrop={() => handleDrop(item.name)}
                                        onDragEnd={handleDragEnd}
                                        $isDragging={draggingName === item.name}
                                        $isDragOver={dragOverName === item.name && draggingName !== item.name}>
                                {editingName === item.name ? (
                                    <StyledEditRow>
                                        <StyledEditInput
                                            value={editState.name}
                                            onChange={(e) => setEditState({...editState, name: e.target.value})}
                                            placeholder="시술명"/>
                                        <StyledEditSmall
                                            type="number"
                                            value={editState.durationMinutes}
                                            onChange={(e) => setEditState({...editState, durationMinutes: e.target.value})}
                                            placeholder="분"/>
                                        <StyledEditSmall
                                            type="number"
                                            value={editState.price}
                                            onChange={(e) => setEditState({...editState, price: e.target.value})}
                                            placeholder="원"/>
                                        <StyledSaveBtn type="button" onClick={() => saveEdit(item)}>저장</StyledSaveBtn>
                                        <StyledCancelBtn type="button" onClick={() => setEditingName(null)}>취소</StyledCancelBtn>
                                    </StyledEditRow>
                                ) : (
                                    <StyledViewRow>
                                        <StyledDragHandle>::</StyledDragHandle>
                                        <StyledColorDot $color={getServiceColor(item.name, serviceColorMap)}/>
                                        <StyledName>{item.name}</StyledName>
                                        <StyledMeta>
                                            {formatDuration(item.durationMinutes)}
                                            {item.price > 0 && ` / ${formatPrice(item.price)}`}
                                        </StyledMeta>
                                        <StyledEditBtn type="button" onClick={() => startEdit(item)}>수정</StyledEditBtn>
                                        <StyledDeleteBtn type="button" onClick={() => handleDelete(item.name)}>삭제</StyledDeleteBtn>
                                    </StyledViewRow>
                                )}
                            </StyledItem>
                        ))}
                    </StyledGroup>
                ))}
            </StyledServiceBody>

            <StyledServiceFooter>
                {showAdd ? (
                    <StyledAddForm>
                        <StyledAddRow>
                            <select value={form.category}
                                    onChange={(e) => setForm({...form, category: e.target.value})}>
                                <option value="">카테고리</option>
                                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                                <option value="__new">+ 새 카테고리</option>
                            </select>
                            {form.category === '__new' && (
                                <StyledAddInput
                                    value={newCategory}
                                    placeholder="카테고리명"
                                    onChange={(e) => setNewCategory(e.target.value)}/>
                            )}
                        </StyledAddRow>
                        <StyledAddRow>
                            <StyledAddInput
                                value={form.name}
                                onChange={(e) => setForm({...form, name: e.target.value})}
                                placeholder="시술명"/>
                            <StyledAddSmall
                                type="number"
                                value={form.durationMinutes}
                                onChange={(e) => setForm({...form, durationMinutes: e.target.value})}
                                placeholder="소요시간(분)"/>
                            <StyledAddSmall
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({...form, price: e.target.value})}
                                placeholder="가격(원)"/>
                        </StyledAddRow>
                        <StyledAddActions>
                            <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            <StyledCancelBtn type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setNewCategory(''); }}>취소</StyledCancelBtn>
                        </StyledAddActions>
                    </StyledAddForm>
                ) : (
                    <StyledAddButton type="button" onClick={() => setShowAdd(true)}>+ 시술 추가</StyledAddButton>
                )}
            </StyledServiceFooter>
        </>
    );
};

/* ── Settings Page ── */

const Settings: NextPage<SettingsProps> = ({reservations, customers, history}) => {
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);

    const router = useRouter();
    const target = useCalendarStore((s) => s.target);
    const reservationMap = groupByDate(reservations);
    const customerMap: CustomerMap = toCustomerMap(customers);

    const now = new Date();
    const defaultDateKey = target.full
        ? toDateKey(target.fullYear, target.month, target.date)
        : toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    const q = router.query;
    const tab: SettingsTab = q.tab === 'service' ? 'service' : 'revenue';
    const revenueView: RevenueTab = q.view === 'monthly' ? 'monthly' : 'daily';
    const dateKey = typeof q.date === 'string' ? q.date : defaultDateKey;
    const revYear = typeof q.year === 'string' ? Number(q.year) : (target.full ? target.fullYear : now.getFullYear());
    const revMonth = typeof q.month === 'string' ? Number(q.month) - 1 : (target.full ? target.month : now.getMonth());

    const replaceQuery = (patch: Record<string, string>) => {
        router.replace({pathname: '/settings', query: patch}, undefined, {shallow: true});
    };

    const setTab = (t: SettingsTab) => {
        if (t === 'revenue') {
            replaceQuery({tab: 'revenue', view: revenueView, date: dateKey, year: String(revYear), month: String(revMonth + 1)});
        } else {
            replaceQuery({tab: t});
        }
    };

    const setRevenueView = (v: RevenueTab) => {
        replaceQuery({tab: 'revenue', view: v, date: dateKey, year: String(revYear), month: String(revMonth + 1)});
    };

    const setDateKey = (key: string) => {
        replaceQuery({tab: 'revenue', view: 'daily', date: key, year: String(revYear), month: String(revMonth + 1)});
    };

    const setYearMonth = (y: number, m: number) => {
        replaceQuery({tab: 'revenue', view: 'monthly', date: dateKey, year: String(y), month: String(m + 1)});
    };
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    useEffect(() => {
        setCustomerMap(customerMap);
        setReservationMap(reservationMap);
        setReservationHistory(history);
    }, [reservations, customers, history]);

    return (
        <StyledSection>
            <Head>
                <title>RESERVATION - 설정</title>
            </Head>
            <StyledHeading>설정</StyledHeading>
            <StyledPageTabs>
                <StyledPageTab type="button" $active={tab === 'revenue'} onClick={() => setTab('revenue')}>매출</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'service'} onClick={() => setTab('service')}>서비스 관리</StyledPageTab>
            </StyledPageTabs>
            <StyledContent>
                {tab === 'revenue' && <RevenueSection reservationMap={reservationMap}
                                                      onSelectReservation={setSelectedReservation}
                                                      view={revenueView}
                                                      setView={setRevenueView}
                                                      dateKey={dateKey}
                                                      setDateKey={setDateKey}
                                                      year={revYear}
                                                      month={revMonth}
                                                      setYearMonth={setYearMonth}/>}
                {tab === 'service' && <ServiceManageSection/>}
            </StyledContent>
            {selectedReservation && (
                <ReservationDetail reservation={selectedReservation}
                                   customerMap={customerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => setSelectedReservation(null)}
                                   onCustomerClick={() => {}}
                                   onUpdate={(prev, updated) => {
                                       updateReservation(prev, updated);
                                       setSelectedReservation(updated);
                                   }}
                                   onCancel={(reservation) => {
                                       cancelReservation(reservation);
                                       setSelectedReservation(null);
                                   }}/>
            )}
        </StyledSection>
    );
};

export default Settings;

export const getServerSideProps: GetServerSideProps<SettingsProps> = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.join(process.cwd(), 'pages/api/reservations.json'), 'utf-8');
    const data = JSON.parse(raw);

    return {
        props: {
            reservations: data.reservations,
            customers: customersData.customers,
            history: data.history ?? [],
        }
    };
};

/* ── Page Layout Styles ── */

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
`;

const StyledHeading = styled.h2`
    text-align: center;
    font-size: var(--big-font);
    font-weight: 600;
    padding: 20px 10px 10px;
`;

const StyledPageTabs = styled.div`
    display: flex;
    margin: 0 10px;
    border-bottom: 2px solid var(--light-gray-color);
`;

const StyledPageTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 10px;
    border: none;
    border-bottom: 2px solid ${(p) => p.$active ? 'var(--blue-color)' : 'transparent'};
    margin-bottom: -2px;
    background: none;
    font-size: 14px;
    font-weight: ${(p) => p.$active ? '600' : '400'};
    color: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    cursor: pointer;
`;

const StyledContent = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 10px 20px;
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const StyledCardBody = styled.div`
    display: flex;
    flex-direction: column;
`;

/* ── Revenue Styles ── */

const StyledSubTabs = styled.div`
    display: flex;
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledSubTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 10px;
    border: none;
    border-bottom: 2px solid ${(p) => p.$active ? 'var(--blue-color)' : 'transparent'};
    background: none;
    font-size: 13px;
    font-weight: ${(p) => p.$active ? '600' : '400'};
    color: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    cursor: pointer;
`;

const StyledNav = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);

    > button {
        border: none;
        background: none;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 8px;
        color: var(--dark-gray-color);
    }
`;

const StyledList = styled.div`
    padding: 0 16px;
`;

const StyledClickableRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--black-color-10);
    cursor: pointer;

    &:hover {
        background-color: var(--black-color-10);
    }
`;

const StyledTime = styled.span`
    flex-shrink: 0;
    width: 40px;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledDate = styled.span`
    flex-shrink: 0;
    width: 70px;
    font-size: 12px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledCount = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledService = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dark-gray-color);
`;

const StyledPrice = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    font-weight: 500;
    color: var(--black-color);
`;

const StyledSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);

    strong {
        font-size: 16px;
        color: var(--blue-color);
    }
`;

const StyledEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

/* ── Service Manage Styles ── */

const StyledServiceBody = styled.div`
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px 0;
`;

const StyledGroup = styled.div<{ $isCategoryDragging: boolean; $isCategoryDragOver: boolean }>`
    opacity: ${(p) => p.$isCategoryDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isCategoryDragOver ? 'var(--black-color-10)' : 'transparent'};
    border-radius: 4px;

    & + & {
        margin-top: 4px;
    }
`;

const StyledCategoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    padding: 6px 16px;
    background-color: var(--black-color-10);
    position: sticky;
    top: 0;
    z-index: 2;
`;

const StyledCategoryLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledCategoryDragHandle = styled.span`
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;
`;

const StyledCategoryColorInput = styled.input`
    width: 24px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background: none;
    cursor: pointer;
`;

const StyledItem = styled.div<{ $isDragging: boolean; $isDragOver: boolean }>`
    padding: 0 16px;
    border-bottom: 1px solid var(--black-color-10);
    opacity: ${(p) => p.$isDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isDragOver ? 'var(--black-color-10)' : 'transparent'};
`;

const StyledViewRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    font-size: 13px;
`;

const StyledDragHandle = styled.span`
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;
`;

const StyledColorDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(p) => p.$color};
`;

const StyledName = styled.span`
    color: var(--dark-gray-color);
`;

const StyledMeta = styled.span`
    flex: 1;
    text-align: right;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledEditBtn = styled.button`
    flex-shrink: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    background: none;
    font-size: 11px;
    padding: 2px 6px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledDeleteBtn = styled.button`
    flex-shrink: 0;
    border: 1px solid var(--danger-border);
    border-radius: 3px;
    background: none;
    font-size: 11px;
    padding: 2px 6px;
    color: var(--danger-color);
    cursor: pointer;
`;

const StyledEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 0;
`;

const StyledEditInput = styled.input`
    flex: 1;
    height: 28px;
    padding: 0 6px;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    font-size: 12px;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledEditSmall = styled.input`
    width: 60px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    font-size: 12px;
    text-align: right;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledSaveBtn = styled.button`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--blue-color);
    border-radius: 3px;
    background-color: var(--blue-color);
    color: #fff;
    font-size: 12px;
    cursor: pointer;
`;

const StyledCancelBtn = styled.button`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    background: none;
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledServiceFooter = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
`;

const StyledAddButton = styled.button`
    width: 100%;
    height: 34px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 4px;
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;

    &:hover {
        border-color: var(--blue-color);
        color: var(--blue-color);
    }
`;

const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledAddRow = styled.div`
    display: flex;
    gap: 4px;

    > select {
        height: 28px;
        padding: 0 4px;
        border: 1px solid var(--light-gray-color);
        border-radius: 3px;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;

        &:focus {
            border-color: var(--blue-color);
        }
    }
`;

const StyledAddInput = styled.input`
    flex: 1;
    height: 28px;
    padding: 0 6px;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    font-size: 12px;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledAddSmall = styled.input`
    width: 80px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    font-size: 12px;
    text-align: right;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledAddActions = styled.div`
    display: flex;
    gap: 4px;
    justify-content: flex-end;
`;
