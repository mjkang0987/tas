import {useState, useEffect, useMemo, type DragEvent} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';
import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {getDailyRevenue, getRangeRevenue} from '../utils/revenue';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../utils/services';
import type {ServiceItem} from '../utils/services';
import type {Designer} from '../utils/designers';
import {WEEKDAY_LABELS} from '../utils/designers';
import type {Reservation, ReservationMap, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate, toDateKey} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {CustomerMap} from '../utils/customers';

import {ReservationDetail} from '../components/calendar/ReservationDetail';
import {CustomerDetail} from '../components/calendar/CustomerDetail';

import customersData from './api/customers.json';

type SettingsProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
};

type SettingsTab = 'revenue' | 'service' | 'designer';
type RevenueDesignerKey = 'all' | `${number}`;
type RevenueQuickRange = 'month' | 'week' | 'today';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function formatShortDate(dateKey: string): string {
    const parts = dateKey.split('-');
    const d = Number(parts[2]);
    const date = new Date(dateKey + 'T00:00:00');
    return `${d}일 (${WEEKDAYS[date.getDay()]})`;
}

function isValidDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00');
    return !Number.isNaN(d.getTime()) && toDateKey(d.getFullYear(), d.getMonth(), d.getDate()) === value;
}

function shiftDateKey(baseDate: Date, days: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
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
    designers: Designer[];
    onSelectReservation: (reservation: Reservation) => void;
    designerKey: RevenueDesignerKey;
    setDesignerKey: (v: RevenueDesignerKey) => void;
    startDateKey: string;
    setStartDateKey: (key: string) => void;
    endDateKey: string;
    setEndDateKey: (key: string) => void;
    selectedDateKey: string;
    setSelectedDateKey: (key: string) => void;
    quickRange: RevenueQuickRange | null;
    setQuickRange: (range: RevenueQuickRange) => void;
}

const RevenueSection = ({
    reservationMap,
    designers,
    onSelectReservation,
    designerKey,
    setDesignerKey,
    startDateKey,
    setStartDateKey,
    endDateKey,
    setEndDateKey,
    selectedDateKey,
    setSelectedDateKey,
    quickRange,
    setQuickRange
}: RevenueSectionProps) => {
    const selectedDesignerId = designerKey === 'all' ? null : Number(designerKey);
    const [fromDateKey, toDateKeyValue] = startDateKey <= endDateKey
        ? [startDateKey, endDateKey]
        : [endDateKey, startDateKey];
    const rangeRevenue = getRangeRevenue(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId);
    const selectedDailyKey = selectedDateKey < fromDateKey || selectedDateKey > toDateKeyValue ? toDateKeyValue : selectedDateKey;
    const daily = getDailyRevenue(reservationMap, selectedDailyKey, selectedDesignerId);
    const days = [...rangeRevenue.days].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return (
        <>
            <StyledRangeFilter>
                <StyledRangeInputWrap>
                    <span>시작일</span>
                    <StyledDateInput type="date"
                                     value={startDateKey}
                                     onChange={(e) => setStartDateKey(e.target.value)}/>
                </StyledRangeInputWrap>
                <StyledRangeDivider>~</StyledRangeDivider>
                <StyledRangeInputWrap>
                    <span>종료일</span>
                    <StyledDateInput type="date"
                                     value={endDateKey}
                                     onChange={(e) => setEndDateKey(e.target.value)}/>
                </StyledRangeInputWrap>
            </StyledRangeFilter>
            <StyledQuickFilters>
                <StyledQuickFilterButton type="button"
                                         $active={quickRange === 'month'}
                                         onClick={() => setQuickRange('month')}>
                    한 달
                </StyledQuickFilterButton>
                <StyledQuickFilterButton type="button"
                                         $active={quickRange === 'week'}
                                         onClick={() => setQuickRange('week')}>
                    일주일
                </StyledQuickFilterButton>
                <StyledQuickFilterButton type="button"
                                         $active={quickRange === 'today'}
                                         onClick={() => setQuickRange('today')}>
                    오늘
                </StyledQuickFilterButton>
            </StyledQuickFilters>
            <StyledDesignerTabs>
                <StyledDesignerTab type="button"
                                   $active={designerKey === 'all'}
                                   onClick={() => setDesignerKey('all')}>
                    전체
                </StyledDesignerTab>
                {designers.map((designer) => {
                    const key = String(designer.id) as RevenueDesignerKey;

                    return (
                        <StyledDesignerTab key={designer.id}
                                           type="button"
                                           $active={designerKey === key}
                                           onClick={() => setDesignerKey(key)}>
                            {designer.name}
                        </StyledDesignerTab>
                    );
                })}
            </StyledDesignerTabs>
            <StyledCardBody>
                {days.length === 0 ? (
                    <StyledEmpty>매출 없음</StyledEmpty>
                ) : (
                    <StyledList>
                        {days.map((day) => (
                            <StyledClickableRow key={day.dateKey}
                                                onClick={() => setSelectedDateKey(day.dateKey)}>
                                <StyledDate>{formatShortDate(day.dateKey)}</StyledDate>
                                <StyledCount>{day.count}건</StyledCount>
                                <StyledPrice>{formatPrice(day.total)}</StyledPrice>
                            </StyledClickableRow>
                        ))}
                    </StyledList>
                )}
                <StyledSummary>
                    <span>{rangeRevenue.count}건</span>
                    <strong>{formatPrice(rangeRevenue.total)}</strong>
                </StyledSummary>
            </StyledCardBody>
            <StyledDetailTitle>{formatDateLabel(selectedDailyKey)} 상세</StyledDetailTitle>
            <StyledCardBody>
                {daily.count === 0 ? (
                    <StyledEmpty>예약 없음</StyledEmpty>
                ) : (
                    <StyledList>
                        {daily.items.map((item) => {
                            const reservation = (reservationMap[selectedDailyKey] || []).find((r) => r.id === item.reservationId);
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

/* ── Designer Manage Section ── */

const DesignerManageSection = () => {
    const designers = useCalendarStore((s) => s.designers);
    const addDesigner = useCalendarStore((s) => s.addDesigner);
    const updateDesigner = useCalendarStore((s) => s.updateDesigner);
    const updateDesignerDay = useCalendarStore((s) => s.updateDesignerDay);
    const deleteDesigner = useCalendarStore((s) => s.deleteDesigner);

    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) return;
        addDesigner(name);
        setNewName('');
    };

    return (
        <>
            <StyledDesignerBody>
                {designers.length === 0 && <StyledEmpty>디자이너 없음</StyledEmpty>}
                {designers.map((designer: Designer) => (
                    <StyledDesignerCard key={designer.id}>
                        <StyledDesignerHeader>
                            <StyledDesignerNameInput
                                value={designer.name}
                                onChange={(e) => updateDesigner(designer.id, {name: e.target.value})}
                                placeholder="디자이너명"
                            />
                            <StyledDeleteBtn type="button" onClick={() => deleteDesigner(designer.id)}>삭제</StyledDeleteBtn>
                        </StyledDesignerHeader>
                        <StyledScheduleList>
                            {WEEKDAY_LABELS.map((label, dayIndex) => {
                                const day = designer.schedule[dayIndex];
                                if (!day) return null;

                                return (
                                    <StyledScheduleRow key={`${designer.id}-${label}`}>
                                        <StyledDayLabel>{label}</StyledDayLabel>
                                        <StyledDaySwitch>
                                            <input
                                                type="checkbox"
                                                checked={day.enabled}
                                                onChange={(e) => updateDesignerDay(designer.id, dayIndex, {enabled: e.target.checked})}
                                            />
                                            <span>{day.enabled ? '근무' : '휴무'}</span>
                                        </StyledDaySwitch>
                                        <StyledTimeInput
                                            type="time"
                                            value={day.start}
                                            disabled={!day.enabled}
                                            onChange={(e) => updateDesignerDay(designer.id, dayIndex, {start: e.target.value})}
                                        />
                                        <span>~</span>
                                        <StyledTimeInput
                                            type="time"
                                            value={day.end}
                                            disabled={!day.enabled}
                                            onChange={(e) => updateDesignerDay(designer.id, dayIndex, {end: e.target.value})}
                                        />
                                    </StyledScheduleRow>
                                );
                            })}
                        </StyledScheduleList>
                    </StyledDesignerCard>
                ))}
            </StyledDesignerBody>
            <StyledServiceFooter>
                <StyledDesignerAddRow>
                    <StyledAddInput
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="새 디자이너명"
                    />
                    <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                </StyledDesignerAddRow>
            </StyledServiceFooter>
        </>
    );
};

/* ── Settings Page ── */

const Settings: NextPage<SettingsProps> = ({reservations, customers, history}) => {
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const designers = useCalendarStore((s) => s.designers);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);

    const router = useRouter();
    const target = useCalendarStore((s) => s.target);
    const reservationMap = groupByDate(reservations);
    const customerMap: CustomerMap = toCustomerMap(customers);

    const now = new Date();
    const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStartKey = toDateKey(now.getFullYear(), now.getMonth(), 1);
    const revenue30DaysStartKey = shiftDateKey(now, -30);
    const revenueWeekStartKey = shiftDateKey(now, -7);

    const q = router.query;
    const tab: SettingsTab = q.tab === 'service' || q.tab === 'designer' ? q.tab : 'revenue';
    const parsedDesignerId = typeof q.designer === 'string' ? Number(q.designer) : NaN;
    const revenueDesignerKey: RevenueDesignerKey = Number.isInteger(parsedDesignerId) && parsedDesignerId > 0
        ? String(parsedDesignerId) as RevenueDesignerKey
        : 'all';
    const startDateKey = typeof q.start === 'string' && isValidDateKey(q.start) ? q.start : monthStartKey;
    const endDateKey = typeof q.end === 'string' && isValidDateKey(q.end) ? q.end : todayKey;
    const selectedDateKey = typeof q.date === 'string' && isValidDateKey(q.date) ? q.date : endDateKey;
    const quickRange: RevenueQuickRange | null = startDateKey === revenue30DaysStartKey && endDateKey === todayKey
        ? 'month'
        : startDateKey === revenueWeekStartKey && endDateKey === todayKey
            ? 'week'
            : startDateKey === todayKey && endDateKey === todayKey
                ? 'today'
                : null;

    const replaceQuery = (patch: Record<string, string>) => {
        router.replace({pathname: '/settings', query: patch}, undefined, {shallow: true});
    };

    const setTab = (t: SettingsTab) => {
        if (t === 'revenue') {
            replaceQuery({
                tab: 'revenue',
                designer: revenueDesignerKey,
                start: startDateKey,
                end: endDateKey,
                date: selectedDateKey,
            });
        } else {
            replaceQuery({tab: t});
        }
    };

    const setRevenueDesigner = (designer: RevenueDesignerKey) => {
        replaceQuery({
            tab: 'revenue',
            designer,
            start: startDateKey,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueStartDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: key,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueEndDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: startDateKey,
            end: key,
            date: selectedDateKey,
        });
    };

    const setRevenueSelectedDate = (key: string) => {
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: startDateKey,
            end: endDateKey,
            date: key,
        });
    };

    const setRevenueQuickRange = (range: RevenueQuickRange) => {
        if (range === 'today') {
            replaceQuery({
                tab: 'revenue',
                designer: revenueDesignerKey,
                start: todayKey,
                end: todayKey,
                date: todayKey,
            });
            return;
        }

        const start = range === 'week' ? revenueWeekStartKey : revenue30DaysStartKey;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start,
            end: todayKey,
            date: todayKey,
        });
    };
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

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
                <StyledPageTab type="button" $active={tab === 'designer'} onClick={() => setTab('designer')}>디자이너 관리</StyledPageTab>
            </StyledPageTabs>
            <StyledContent>
                {tab === 'revenue' && <RevenueSection reservationMap={reservationMap}
                                                      designers={designers}
                                                      onSelectReservation={setSelectedReservation}
                                                      designerKey={revenueDesignerKey}
                                                      setDesignerKey={setRevenueDesigner}
                                                      startDateKey={startDateKey}
                                                      setStartDateKey={setRevenueStartDate}
                                                      endDateKey={endDateKey}
                                                      setEndDateKey={setRevenueEndDate}
                                                      selectedDateKey={selectedDateKey}
                                                      setSelectedDateKey={setRevenueSelectedDate}
                                                      quickRange={quickRange}
                                                      setQuickRange={setRevenueQuickRange}/>}
                {tab === 'service' && <ServiceManageSection/>}
                {tab === 'designer' && <DesignerManageSection/>}
            </StyledContent>
            {selectedReservation && (
                <ReservationDetail reservation={selectedReservation}
                                   customerMap={customerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => setSelectedReservation(null)}
                                   onCustomerClick={(customerId) => setSelectedCustomerId(customerId)}
                                   onUpdate={(prev, updated) => {
                                       updateReservation(prev, updated);
                                       setSelectedReservation(updated);
                                   }}
                                   onCancel={(reservation) => {
                                       cancelReservation(reservation);
                                       setSelectedReservation(null);
                                   }}/>
            )}
            {selectedCustomerId !== null && customerMap[selectedCustomerId] && (
                <CustomerDetail customer={customerMap[selectedCustomerId]}
                                reservationMap={storeReservationMap}
                                onClose={() => setSelectedCustomerId(null)}/>
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
    overscroll-behavior: auto;
`;

const StyledCardBody = styled.div`
    display: flex;
    flex-direction: column;
`;

/* ── Revenue Styles ── */

const StyledRangeFilter = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledRangeInputWrap = styled.label`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDateInput = styled.input`
    height: 30px;
    border: 1px solid var(--light-gray-color);
    border-radius: 6px;
    padding: 0 8px;
    font-size: 12px;
    color: var(--dark-gray-color);
`;

const StyledRangeDivider = styled.span`
    flex-shrink: 0;
    padding-bottom: 6px;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledQuickFilters = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px 16px 0;
`;

const StyledQuickFilterButton = styled.button<{ $active: boolean }>`
    height: 26px;
    padding: 0 10px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 13px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
    font-size: 12px;
    cursor: pointer;
`;

const StyledDesignerTabs = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px 16px;
    overflow-x: auto;
    overscroll-behavior: auto;
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledDesignerTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 14px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
    font-size: 12px;
    cursor: pointer;
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

const StyledDetailTitle = styled.h3`
    margin: 12px 16px 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
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
    overscroll-behavior: auto;
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

/* ── Designer Manage Styles ── */

const StyledDesignerBody = styled.div`
    overflow-y: auto;
    overscroll-behavior: auto;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerCard = styled.div`
    border: 1px solid var(--light-gray-color);
    border-radius: 6px;
    padding: 10px 12px;
    background-color: var(--white-color);
`;

const StyledDesignerHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const StyledDesignerNameInput = styled.input`
    flex: 1;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    font-size: 13px;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledScheduleRow = styled.div`
    display: grid;
    grid-template-columns: 28px 70px minmax(0, 1fr) 12px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    font-size: 12px;
`;

const StyledDayLabel = styled.span`
    color: var(--dark-gray-color);
    font-weight: 600;
`;

const StyledDaySwitch = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--dark-gray-color2);
`;

const StyledTimeInput = styled.input`
    width: 100%;
    min-width: 0;
    height: 28px;
    padding: 0 6px;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    font-size: 12px;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
`;

const StyledDesignerAddRow = styled.div`
    display: flex;
    gap: 6px;
`;
