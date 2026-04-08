import {useState, useEffect, useMemo, type DragEvent} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';
import {useRouter} from 'next/router';

import styled, {css} from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {getDailyRevenue, getRangeRevenue, getRevenueInsights} from '../utils/revenue';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../utils/services';
import type {ServiceItem} from '../utils/services';
import type {Designer, DesignerStatus} from '../utils/designers';
import {WEEKDAY_LABELS, getDesignerColor, getDesignerStatus, splitDesignersByStatus} from '../utils/designers';
import type {Reservation, ReservationMap, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate, toDateKey} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {CustomerMap} from '../utils/customers';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';

import customersData from './api/customers.json';

type SettingsProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
};

type SettingsTab = 'revenue' | 'service' | 'designer' | 'store';
type RevenueDesignerKey = 'all' | `${number}`;
type RevenueQuickRange = 'month' | 'week' | 'today';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function getShortDateParts(dateKey: string): {monthDay: string; yearWeekday: string} {
    const parts = dateKey.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(dateKey + 'T00:00:00');
    return {
        monthDay: `${month}월 ${day}일`,
        yearWeekday: `${year}년 (${WEEKDAYS[date.getDay()]})`,
    };
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

const PAYMENT_METHOD_COLORS = ['#2D7FF9', '#00A896', '#FB8C00', '#E85D75', '#7E57C2', '#4C6EF5', '#8E8E93'] as const;

function buildRevenueLinePath(values: number[], width: number, height: number): {linePath: string; areaPath: string} {
    if (values.length === 0) return {linePath: '', areaPath: ''};

    const max = Math.max(...values, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((value, index) => {
        const x = values.length > 1 ? index * stepX : width / 2;
        const y = height - (value / max) * height;
        return {x, y};
    });
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return {linePath, areaPath};
}

function buildPaymentDonutGradient(colors: string[], totals: number[]): string {
    const sum = totals.reduce((acc, value) => acc + value, 0);
    if (sum <= 0 || colors.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)';

    let angle = 0;
    const segments = totals.map((total, index) => {
        const start = angle;
        angle += (total / sum) * 360;
        return `${colors[index]} ${start}deg ${angle}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
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
    const [detailDateKey, setDetailDateKey] = useState<string | null>(null);
    const selectedDesignerId = designerKey === 'all' ? null : Number(designerKey);
    const designerMap = useMemo(
        () => Object.fromEntries(designers.map((designer) => [designer.id, designer])),
        [designers]
    );
    const [fromDateKey, toDateKeyValue] = startDateKey <= endDateKey
        ? [startDateKey, endDateKey]
        : [endDateKey, startDateKey];
    const rangeRevenue = getRangeRevenue(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId);
    const revenueInsights = useMemo(
        () => getRevenueInsights(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId),
        [reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId]
    );
    const days = [...rangeRevenue.days].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const openedDateKey = detailDateKey && detailDateKey >= fromDateKey && detailDateKey <= toDateKeyValue
        ? detailDateKey
        : null;
    const layerDaily = openedDateKey ? getDailyRevenue(reservationMap, openedDateKey, selectedDesignerId) : null;
    const paymentChartItems = revenueInsights.payments.map((entry, index) => ({
        ...entry,
        color: PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length],
    }));
    const designerChartItems = revenueInsights.designers.map((entry) => {
        const matchedDesigner = entry.designerId != null ? designerMap[entry.designerId] : null;

        return {
            ...entry,
            name: matchedDesigner?.name ?? '미지정',
            color: getDesignerColor(matchedDesigner),
        };
    });
    const chartPath = buildRevenueLinePath(revenueInsights.series.map((item) => item.total), 320, 120);
    const linePeak = Math.max(...revenueInsights.series.map((item) => item.total), 0);
    const lineLow = Math.min(...revenueInsights.series.map((item) => item.total), 0);
    const paymentDonutGradient = buildPaymentDonutGradient(
        paymentChartItems.map((item) => item.color),
        paymentChartItems.map((item) => item.total)
    );

    return (
        <>
            <StyledRevenueStickyArea>
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
            </StyledRevenueStickyArea>
            <StyledCardBody>
                <StyledRevenueDashboard>
                    <StyledKpiGrid>
                        <StyledKpiCard>
                            <span>총 매출</span>
                            <strong>{formatPrice(rangeRevenue.total)}</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>예약 건수</span>
                            <strong>{rangeRevenue.count}건</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>객단가</span>
                            <strong>{formatPrice(revenueInsights.averagePrice)}</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>결제완료</span>
                            <strong>{formatPrice(revenueInsights.paidTotal)}</strong>
                        </StyledKpiCard>
                    </StyledKpiGrid>
                    <StyledChartGrid>
                        <StyledChartCard>
                            <StyledChartHeader>
                                <strong>기간별 매출 추이</strong>
                                <span>{fromDateKey} ~ {toDateKeyValue}</span>
                            </StyledChartHeader>
                            {revenueInsights.series.length === 0 ? (
                                <StyledChartEmpty>집계할 매출이 없습니다.</StyledChartEmpty>
                            ) : (
                                <>
                                    <StyledLineChartBox>
                                        <StyledChartMetaTop>{formatPrice(linePeak)}</StyledChartMetaTop>
                                        <StyledLineChart viewBox="0 0 320 120" preserveAspectRatio="none">
                                            <path d={chartPath.areaPath} fill="rgba(45, 127, 249, 0.14)" />
                                            <path d={chartPath.linePath} fill="none" stroke="var(--blue-color)" strokeWidth="3" strokeLinecap="round" />
                                        </StyledLineChart>
                                        <StyledChartMetaBottom>{formatPrice(lineLow)}</StyledChartMetaBottom>
                                    </StyledLineChartBox>
                                    <StyledChartAxis>
                                        <span>{fromDateKey.slice(5)}</span>
                                        <span>{toDateKeyValue.slice(5)}</span>
                                    </StyledChartAxis>
                                </>
                            )}
                        </StyledChartCard>
                        <StyledChartCard>
                            <StyledChartHeader>
                                <strong>디자이너별 매출</strong>
                                <span>{designerKey === 'all' ? '전체 기준' : '선택 디자이너 기준'}</span>
                            </StyledChartHeader>
                            {designerChartItems.length === 0 ? (
                                <StyledChartEmpty>디자이너 매출이 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledBarChartList>
                                    {designerChartItems.map((item) => {
                                        const ratio = linePeak > 0 ? (item.total / Math.max(...designerChartItems.map((entry) => entry.total), 1)) * 100 : 0;

                                        return (
                                            <StyledBarRow key={`${item.designerId ?? 'none'}-${item.name}`}>
                                                <StyledBarLabel>
                                                    <StyledColorSwatch $color={item.color} />
                                                    <span>{item.name}</span>
                                                </StyledBarLabel>
                                                <StyledBarTrack>
                                                    <StyledBarFill $color={item.color} $width={ratio} />
                                                </StyledBarTrack>
                                                <StyledBarValue>{formatPrice(item.total)}</StyledBarValue>
                                            </StyledBarRow>
                                        );
                                    })}
                                </StyledBarChartList>
                            )}
                        </StyledChartCard>
                        <StyledChartCard>
                            <StyledChartHeader>
                                <strong>결제수단 비중</strong>
                                <span>결제완료 기준</span>
                            </StyledChartHeader>
                            {paymentChartItems.length === 0 ? (
                                <StyledChartEmpty>결제 데이터가 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledPaymentChartWrap>
                                    <StyledDonutChart $gradient={paymentDonutGradient}>
                                        <div>
                                            <strong>{formatPrice(revenueInsights.paidTotal)}</strong>
                                            <span>결제합계</span>
                                        </div>
                                    </StyledDonutChart>
                                    <StyledLegendList>
                                        {paymentChartItems.map((item) => {
                                            const percent = revenueInsights.paidTotal > 0
                                                ? Math.round((item.total / revenueInsights.paidTotal) * 100)
                                                : 0;

                                            return (
                                                <StyledLegendItem key={item.method}>
                                                    <StyledBarLabel>
                                                        <StyledColorSwatch $color={item.color} />
                                                        <span>{item.method}</span>
                                                    </StyledBarLabel>
                                                    <StyledLegendValue>
                                                        <strong>{formatPrice(item.total)}</strong>
                                                        <span>{percent}%</span>
                                                    </StyledLegendValue>
                                                </StyledLegendItem>
                                            );
                                        })}
                                    </StyledLegendList>
                                </StyledPaymentChartWrap>
                            )}
                        </StyledChartCard>
                    </StyledChartGrid>
                </StyledRevenueDashboard>
                {days.length === 0 ? (
                    <StyledEmpty>매출 없음</StyledEmpty>
                ) : (
                    <StyledList>
                        {days.map((day) => {
                            const dateParts = getShortDateParts(day.dateKey);

                            return (
                                <StyledClickableRow key={day.dateKey}
                                                    onClick={() => {
                                                        setSelectedDateKey(day.dateKey);
                                                        setDetailDateKey(day.dateKey);
                                                    }}>
                                    <StyledDate>
                                        <StyledDateMonthDay>{dateParts.monthDay}</StyledDateMonthDay>
                                        <StyledDateYear>{dateParts.yearWeekday}</StyledDateYear>
                                    </StyledDate>
                                    <StyledCount>{day.count}건</StyledCount>
                                    <StyledPrice>{formatPrice(day.total)}</StyledPrice>
                                </StyledClickableRow>
                            );
                        })}
                    </StyledList>
                )}
                <StyledRevenueSummary>
                    <span>{rangeRevenue.count}건</span>
                    <strong>{formatPrice(rangeRevenue.total)}</strong>
                </StyledRevenueSummary>
            </StyledCardBody>
            {openedDateKey && layerDaily && (
                <StyledLayerBackdrop onClick={() => setDetailDateKey(null)}>
                    <StyledRevenueLayer onClick={(e) => e.stopPropagation()}>
                        <StyledRevenueLayerHeader>
                            <strong>{formatDateLabel(openedDateKey)} 상세</strong>
                            <StyledLayerCloseButton type="button" onClick={() => setDetailDateKey(null)}>닫기</StyledLayerCloseButton>
                        </StyledRevenueLayerHeader>
                        {layerDaily.count === 0 ? (
                            <StyledEmpty>예약 없음</StyledEmpty>
                        ) : (
                            <StyledList>
                                {layerDaily.items.map((item) => {
                                    const reservation = (reservationMap[openedDateKey] || []).find((r) => r.id === item.reservationId);
                                    return (
                                        <StyledClickableRow key={item.reservationId}
                                                            onClick={() => {
                                                                if (!reservation) return;
                                                                onSelectReservation(reservation);
                                                                setDetailDateKey(null);
                                                            }}>
                                            <StyledTime>{item.startTime}</StyledTime>
                                            <StyledService>{item.service}</StyledService>
                                            <StyledPrice>{formatPrice(item.price)}</StyledPrice>
                                        </StyledClickableRow>
                                    );
                                })}
                            </StyledList>
                        )}
                        <StyledSummary>
                            <span>{layerDaily.count}건</span>
                            <strong>{formatPrice(layerDaily.total)}</strong>
                        </StyledSummary>
                    </StyledRevenueLayer>
                </StyledLayerBackdrop>
            )}
        </>
    );
};

/* ── Service Manage Section ── */

const StoreManageSection = () => {
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateStoreBusinessHours = useCalendarStore((s) => s.updateStoreBusinessHours);
    const updateStoreClosedDates = useCalendarStore((s) => s.updateStoreClosedDates);
    const [businessHours, setBusinessHours] = useState(storeSettings.businessHours);
    const [closedDates, setClosedDates] = useState(storeSettings.closedDates);
    const [closedDateInput, setClosedDateInput] = useState('');
    const [closedDateError, setClosedDateError] = useState('');
    const [isEditingBusinessHours, setIsEditingBusinessHours] = useState(false);
    const [isEditingClosedDates, setIsEditingClosedDates] = useState(false);

    useEffect(() => {
        setBusinessHours(storeSettings.businessHours);
        setClosedDates(storeSettings.closedDates);
    }, [storeSettings]);

    const isBusinessHoursDirty = businessHours.start !== storeSettings.businessHours.start
        || businessHours.end !== storeSettings.businessHours.end;
    const isClosedDatesDirty = closedDates.join('|') !== storeSettings.closedDates.join('|');

    const handleSaveBusinessHours = () => {
        updateStoreBusinessHours(businessHours);
        setIsEditingBusinessHours(false);
    };

    const handleAddClosedDate = () => {
        if (!closedDateInput) {
            setClosedDateError('휴업일을 선택해 주세요.');
            return;
        }

        if (closedDates.includes(closedDateInput)) {
            setClosedDateError('이미 등록된 휴업일입니다.');
            return;
        }

        setClosedDates((prev) => [...prev, closedDateInput].sort());
        setClosedDateInput('');
        setClosedDateError('');
    };

    const handleSaveClosedDates = () => {
        updateStoreClosedDates(closedDates);
        setIsEditingClosedDates(false);
    };

    return (
        <StyledStoreSection>
            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>영업시간</StyledStoreCardTitle>
                    {!isEditingBusinessHours && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingBusinessHours(true)}>수정</StyledEditBtn>
                    )}
                </StyledStoreCardHeader>
                <StyledStoreFieldGrid>
                    <StyledRangeInputWrap>
                        <span>오픈</span>
                        <StyledDateInput
                            type="time"
                            value={businessHours.start}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, start: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                    <StyledRangeInputWrap>
                        <span>마감</span>
                        <StyledDateInput
                            type="time"
                            value={businessHours.end}
                            disabled={!isEditingBusinessHours}
                            onChange={(e) => setBusinessHours((prev) => ({...prev, end: e.target.value}))}
                        />
                    </StyledRangeInputWrap>
                </StyledStoreFieldGrid>
                {isEditingBusinessHours && (
                    <StyledStoreActionRow>
                        <StyledCancelBtn
                            type="button"
                            onClick={() => {
                                setBusinessHours(storeSettings.businessHours);
                                setIsEditingBusinessHours(false);
                            }}
                        >
                            취소
                        </StyledCancelBtn>
                        <StyledSaveBtn type="button" onClick={handleSaveBusinessHours} disabled={!isBusinessHoursDirty}>저장</StyledSaveBtn>
                    </StyledStoreActionRow>
                )}
            </StyledStoreCard>

            <StyledStoreCard>
                <StyledStoreCardHeader>
                    <StyledStoreCardTitle>휴업일</StyledStoreCardTitle>
                    {!isEditingClosedDates && (
                        <StyledEditBtn type="button" onClick={() => setIsEditingClosedDates(true)}>수정</StyledEditBtn>
                    )}
                </StyledStoreCardHeader>
                {isEditingClosedDates && (
                    <>
                        <StyledClosedDateAddRow>
                            <StyledDateInput
                                type="date"
                                value={closedDateInput}
                                onChange={(e) => {
                                    setClosedDateInput(e.target.value);
                                    setClosedDateError('');
                                }}
                            />
                            <StyledSaveBtn type="button" onClick={handleAddClosedDate}>추가</StyledSaveBtn>
                        </StyledClosedDateAddRow>
                        {closedDateError && <StyledAddNotice>{closedDateError}</StyledAddNotice>}
                    </>
                )}
                {closedDates.length === 0 ? (
                    <StyledEmpty>등록된 휴업일 없음</StyledEmpty>
                ) : (
                    <StyledClosedDateList>
                        {closedDates.map((date) => (
                            <StyledClosedDateItem key={date}>
                                <span>{formatDateLabel(date)}</span>
                                {isEditingClosedDates && (
                                    <StyledDeleteBtn
                                        type="button"
                                        onClick={() => setClosedDates((prev) => prev.filter((item) => item !== date))}
                                    >
                                        삭제
                                    </StyledDeleteBtn>
                                )}
                            </StyledClosedDateItem>
                        ))}
                    </StyledClosedDateList>
                )}
                {isEditingClosedDates && (
                    <StyledStoreActionRow>
                        <StyledCancelBtn
                            type="button"
                            onClick={() => {
                                setClosedDates(storeSettings.closedDates);
                                setClosedDateInput('');
                                setClosedDateError('');
                                setIsEditingClosedDates(false);
                            }}
                        >
                            취소
                        </StyledCancelBtn>
                        <StyledSaveBtn type="button" onClick={handleSaveClosedDates} disabled={!isClosedDatesDirty}>저장</StyledSaveBtn>
                    </StyledStoreActionRow>
                )}
            </StyledStoreCard>
        </StyledStoreSection>
    );
};

const ServiceManageSection = () => {
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const addService = useCalendarStore((s) => s.addService);
    const updateService = useCalendarStore((s) => s.updateService);
    const deleteService = useCalendarStore((s) => s.deleteService);
    const renameCategory = useCalendarStore((s) => s.renameCategory);
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
    const [addError, setAddError] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [dragOverName, setDragOverName] = useState<string | null>(null);
    const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

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
        if (!category) {
            setAddError(form.category === '__new'
                ? '새 카테고리명을 입력해 주세요.'
                : '카테고리를 선택하거나 새 카테고리를 추가해 주세요.');
            return;
        }
        if (!name) return;
        if (serviceCatalog.some((item) => item.name === name)) {
            setAddError(`"${name}" 시술은 이미 등록되어 있습니다.`);
            return;
        }

        addService({
            name,
            category,
            durationMinutes: Number(form.durationMinutes) || 0,
            price: Number(form.price) || 0,
        });
        setAddError('');
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

    const startCategoryEdit = (category: string) => {
        setEditingCategory(category);
        setEditingCategoryName(category);
    };

    const saveCategoryEdit = (category: string) => {
        const nextName = editingCategoryName.trim();
        if (!nextName) return;
        renameCategory(category, nextName);
        setEditingCategory(null);
        setEditingCategoryName('');
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
                            {editingCategory === category ? (
                                <StyledCategoryEditRow>
                                    <StyledCategoryEditInput
                                        value={editingCategoryName}
                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                        placeholder="카테고리명"
                                    />
                                    <StyledSaveBtn type="button" onClick={() => saveCategoryEdit(category)}>저장</StyledSaveBtn>
                                    <StyledCancelBtn type="button" onClick={() => {
                                        setEditingCategory(null);
                                        setEditingCategoryName('');
                                    }}>취소</StyledCancelBtn>
                                </StyledCategoryEditRow>
                            ) : (
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
                            )}
                            <StyledCategoryActions>
                                {editingCategory !== category && (
                                    <StyledEditBtn type="button" onClick={() => startCategoryEdit(category)}>이름수정</StyledEditBtn>
                                )}
                            <StyledCategoryColorInput
                                type="color"
                                value={getCategoryBaseColor(category, categoryBaseColorMap)}
                                onChange={(e) => updateCategoryBaseColor(category, e.target.value)}
                                aria-label={`${category} 대표 컬러`}
                                title={`${category} 대표 컬러`}
                            />
                            </StyledCategoryActions>
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
                                        <StyledServiceContent>
                                            <StyledServiceMainLine>
                                                <StyledName>{item.name}</StyledName>
                                                <StyledServiceActions>
                                                    <StyledEditBtn type="button" onClick={() => startEdit(item)}>수정</StyledEditBtn>
                                                    <StyledDeleteBtn type="button" onClick={() => handleDelete(item.name)}>삭제</StyledDeleteBtn>
                                                </StyledServiceActions>
                                            </StyledServiceMainLine>
                                            <StyledMeta>
                                                {formatDuration(item.durationMinutes)}
                                                {item.price > 0 && ` / ${formatPrice(item.price)}`}
                                            </StyledMeta>
                                        </StyledServiceContent>
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
                                    aria-label="시술 카테고리"
                                    onChange={(e) => {
                                        setForm({...form, category: e.target.value});
                                        setAddError('');
                                    }}>
                                <option value="">카테고리</option>
                                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                                <option value="__new">+ 새 카테고리</option>
                            </select>
                            {form.category === '__new' && (
                                <StyledAddInput
                                    value={newCategory}
                                    placeholder="카테고리명"
                                    onChange={(e) => {
                                        setNewCategory(e.target.value);
                                        setAddError('');
                                    }}/>
                            )}
                        </StyledAddRow>
                        {(addError || !form.category) && (
                            <StyledAddNotice>
                                {addError || '카테고리를 먼저 선택하거나 새 카테고리를 추가해 주세요.'}
                            </StyledAddNotice>
                        )}
                        <StyledAddRow>
                            <StyledAddInput
                                value={form.name}
                                onChange={(e) => {
                                    setForm({...form, name: e.target.value});
                                    setAddError('');
                                }}
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
                            <StyledCancelBtn type="button" onClick={() => {
                                setShowAdd(false);
                                setForm(EMPTY_FORM);
                                setNewCategory('');
                                setAddError('');
                            }}>취소</StyledCancelBtn>
                        </StyledAddActions>
                    </StyledAddForm>
                ) : (
                    <StyledAddButton type="button" onClick={() => {
                        setShowAdd(true);
                        setAddError('');
                    }}>+ 시술 추가</StyledAddButton>
                )}
            </StyledServiceFooter>
        </>
    );
};

/* ── Designer Manage Section ── */

const DESIGNER_STATUS_OPTIONS: DesignerStatus[] = ['재직', '휴직', '퇴직'];

interface DesignerCardProps {
    designer: Designer;
    isEditing: boolean;
    onUpdateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateDesignerDay: (designerId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (designerId: number) => void;
    onFinishEdit: () => void;
    onDeleteDesigner: (designer: Designer) => void;
}

const DesignerCard = ({
    designer,
    isEditing,
    onUpdateDesigner,
    onUpdateDesignerDay,
    onStartEdit,
    onFinishEdit,
    onDeleteDesigner,
}: DesignerCardProps) => (
    <StyledDesignerCard>
        <StyledDesignerHeader>
            <StyledDesignerNameInput
                value={designer.name}
                disabled={!isEditing}
                onChange={(e) => onUpdateDesigner(designer.id, {name: e.target.value})}
                placeholder="디자이너명"
            />
            <StyledDesignerStatusSelect
                value={getDesignerStatus(designer)}
                aria-label={`${designer.name} 상태`}
                disabled={!isEditing}
                onChange={(e) => {
                    const nextStatus = e.target.value as DesignerStatus;
                    const currentStatus = getDesignerStatus(designer);

                    if (nextStatus === currentStatus) return;
                    if (nextStatus === '퇴직' && !confirm(`"${designer.name}" 디자이너를 퇴직 처리하시겠습니까?`)) {
                        e.target.value = currentStatus;
                        return;
                    }

                    onUpdateDesigner(designer.id, {status: nextStatus});
                }}
            >
                {DESIGNER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </StyledDesignerStatusSelect>
            <StyledDesignerHeaderActions>
                {isEditing ? (
                    <>
                        <StyledDeleteBtn type="button" onClick={() => onDeleteDesigner(designer)}>삭제</StyledDeleteBtn>
                        <StyledCancelBtn type="button" onClick={onFinishEdit}>완료</StyledCancelBtn>
                    </>
                ) : (
                    <StyledEditBtn type="button" onClick={() => onStartEdit(designer.id)}>수정</StyledEditBtn>
                )}
            </StyledDesignerHeaderActions>
        </StyledDesignerHeader>
        <StyledDesignerMetaGrid>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>연락처</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    value={designer.phone ?? ''}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 연락처`}
                    onChange={(e) => onUpdateDesigner(designer.id, {phone: e.target.value})}
                    placeholder="010-0000-0000"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>메모</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    value={designer.note ?? ''}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 메모`}
                    onChange={(e) => onUpdateDesigner(designer.id, {note: e.target.value})}
                    placeholder="특이사항 메모"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>컬러</StyledDesignerMetaLabel>
                <StyledDesignerColorInput
                    type="color"
                    value={getDesignerColor(designer)}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 컬러`}
                    onChange={(e) => onUpdateDesigner(designer.id, {color: e.target.value})}
                />
            </StyledDesignerMetaField>
        </StyledDesignerMetaGrid>
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
                                aria-label={`${designer.name} ${label} 근무 여부`}
                                disabled={!isEditing}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {enabled: e.target.checked})}
                            />
                            <span>{day.enabled ? '근무' : '휴무'}</span>
                        </StyledDaySwitch>
                        <StyledTimeRange>
                            <StyledTimeInput
                                type="time"
                                value={day.start}
                                aria-label={`${designer.name} ${label} 시작 시간`}
                                disabled={!isEditing || !day.enabled}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {start: e.target.value})}
                            />
                            <StyledTimeRangeDivider>~</StyledTimeRangeDivider>
                            <StyledTimeInput
                                type="time"
                                value={day.end}
                                aria-label={`${designer.name} ${label} 종료 시간`}
                                disabled={!isEditing || !day.enabled}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {end: e.target.value})}
                            />
                        </StyledTimeRange>
                    </StyledScheduleRow>
                );
            })}
        </StyledScheduleList>
    </StyledDesignerCard>
);

interface DesignerSectionProps {
    title: string;
    designers: Designer[];
    editingDesignerId: number | null;
    onUpdateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateDesignerDay: (designerId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (designerId: number) => void;
    onFinishEdit: () => void;
    onDeleteDesigner: (designer: Designer) => void;
}

const DesignerSection = ({
    title,
    designers,
    editingDesignerId,
    onUpdateDesigner,
    onUpdateDesignerDay,
    onStartEdit,
    onFinishEdit,
    onDeleteDesigner,
}: DesignerSectionProps) => {
    if (designers.length === 0) return null;

    return (
        <StyledDesignerSection>
            <StyledDesignerSectionTitle>{title}</StyledDesignerSectionTitle>
            {designers.map((designer) => (
                <DesignerCard key={designer.id}
                              designer={designer}
                              isEditing={editingDesignerId === designer.id}
                              onUpdateDesigner={onUpdateDesigner}
                              onUpdateDesignerDay={onUpdateDesignerDay}
                              onStartEdit={onStartEdit}
                              onFinishEdit={onFinishEdit}
                              onDeleteDesigner={onDeleteDesigner}/>
            ))}
        </StyledDesignerSection>
    );
};

const DesignerManageSection = () => {
    const designers = useCalendarStore((s) => s.designers);
    const addDesigner = useCalendarStore((s) => s.addDesigner);
    const updateDesigner = useCalendarStore((s) => s.updateDesigner);
    const updateDesignerDay = useCalendarStore((s) => s.updateDesignerDay);
    const [newName, setNewName] = useState('');
    const [newStatus, setNewStatus] = useState<DesignerStatus>('재직');
    const [newPhone, setNewPhone] = useState('');
    const [newNote, setNewNote] = useState('');
    const [newColor, setNewColor] = useState(getDesignerColor({id: 1}));
    const [editingDesignerId, setEditingDesignerId] = useState<number | null>(null);
    const [isAddingDesigner, setIsAddingDesigner] = useState(false);
    const {active: activeDesigners, onLeave: onLeaveDesigners, resigned: resignedDesigners} = splitDesignersByStatus(designers);

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) return;
        addDesigner(name, newStatus, newPhone.trim(), newNote.trim(), newColor);
        setNewName('');
        setNewStatus('재직');
        setNewPhone('');
        setNewNote('');
        setNewColor(getDesignerColor({id: designers.length + 2}));
        setIsAddingDesigner(false);
    };

    const handleDeleteDesigner = (designer: Designer) => {
        if (!confirm(`"${designer.name}" 디자이너를 퇴직 처리하시겠습니까?`)) return;
        updateDesigner(designer.id, {status: '퇴직'});
        setEditingDesignerId(null);
    };

    return (
        <>
            <StyledDesignerBody>
                {designers.length === 0 && <StyledEmpty>디자이너 없음</StyledEmpty>}
                <DesignerSection title="재직자"
                                 designers={activeDesigners}
                                 editingDesignerId={editingDesignerId}
                                 onUpdateDesigner={updateDesigner}
                                 onUpdateDesignerDay={updateDesignerDay}
                                 onStartEdit={setEditingDesignerId}
                                 onFinishEdit={() => setEditingDesignerId(null)}
                                 onDeleteDesigner={handleDeleteDesigner}/>
                <DesignerSection title="휴직자"
                                 designers={onLeaveDesigners}
                                 editingDesignerId={editingDesignerId}
                                 onUpdateDesigner={updateDesigner}
                                 onUpdateDesignerDay={updateDesignerDay}
                                 onStartEdit={setEditingDesignerId}
                                 onFinishEdit={() => setEditingDesignerId(null)}
                                 onDeleteDesigner={handleDeleteDesigner}/>
                <DesignerSection title="퇴직자"
                                 designers={resignedDesigners}
                                 editingDesignerId={editingDesignerId}
                                 onUpdateDesigner={updateDesigner}
                                 onUpdateDesignerDay={updateDesignerDay}
                                 onStartEdit={setEditingDesignerId}
                                 onFinishEdit={() => setEditingDesignerId(null)}
                                 onDeleteDesigner={handleDeleteDesigner}/>
            </StyledDesignerBody>
            <StyledServiceFooter>
                <StyledDesignerFooterActions>
                    {isAddingDesigner ? (
                        <>
                            <StyledDesignerAddRow>
                                <StyledAddInput
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="새 디자이너명"
                                />
                                <StyledDesignerStatusSelect
                                    value={newStatus}
                                    aria-label="새 디자이너 상태"
                                    onChange={(e) => setNewStatus(e.target.value as DesignerStatus)}
                                >
                                    {DESIGNER_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </StyledDesignerStatusSelect>
                                <StyledAddInput
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    placeholder="연락처"
                                    aria-label="새 디자이너 연락처"
                                />
                                <StyledDesignerColorInput
                                    type="color"
                                    value={newColor}
                                    aria-label="새 디자이너 컬러"
                                    onChange={(e) => setNewColor(e.target.value)}
                                />
                                <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            </StyledDesignerAddRow>
                            <StyledDesignerMetaInput
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="메모"
                                aria-label="새 디자이너 메모"
                            />
                            <StyledCancelBtn type="button" onClick={() => {
                                setIsAddingDesigner(false);
                                setNewName('');
                                setNewStatus('재직');
                                setNewPhone('');
                                setNewNote('');
                                setNewColor(getDesignerColor({id: designers.length + 1}));
                            }}>취소</StyledCancelBtn>
                        </>
                    ) : (
                        <StyledEditBtn type="button" onClick={() => setIsAddingDesigner(true)}>디자이너 추가</StyledEditBtn>
                    )}
                </StyledDesignerFooterActions>
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
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
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
    const tab: SettingsTab = q.tab === 'service' || q.tab === 'designer' || q.tab === 'store' ? q.tab : 'revenue';
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
    const [selectedReservations, setSelectedReservations] = useState<Reservation[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

    useEffect(() => {
        setCustomerMap(customerMap);
        setReservationMap(reservationMap);
        setReservationHistory(history);
    }, [reservations, customers, history]);

    return (
        <StyledSection>
            <Head>
                <title>Chairtime - 설정</title>
            </Head>
            <StyledHeading>설정</StyledHeading>
            <StyledPageTabs>
                <StyledPageTab type="button" $active={tab === 'revenue'} onClick={() => setTab('revenue')}>매출</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'store'} onClick={() => setTab('store')}>매장관리</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'service'} onClick={() => setTab('service')}>서비스 관리</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'designer'} onClick={() => setTab('designer')}>디자이너 관리</StyledPageTab>
            </StyledPageTabs>
            <StyledContent>
                {tab === 'revenue' && <RevenueSection reservationMap={reservationMap}
                                                      designers={designers}
                                                      onSelectReservation={(reservation) => setSelectedReservations((prev) => [...prev, reservation])}
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
                {tab === 'store' && <StoreManageSection/>}
                {tab === 'service' && <ServiceManageSection/>}
                {tab === 'designer' && <DesignerManageSection/>}
            </StyledContent>
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={customerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => setSelectedReservations((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={(prev, updated) => {
                                       updateReservation(prev, updated);
                                       setSelectedReservations((current) => current.map((item) => item.id === prev.id ? updated : item));
                                   }}
                                   onCancel={(targetReservation) => {
                                       cancelReservation(targetReservation);
                                       setSelectedReservations((prev) => prev.filter((item) => item.id !== targetReservation.id));
                                   }}/>
            ))}
            {selectedCustomerId !== null && customerMap[selectedCustomerId] && (
                <CustomerDetail customer={customerMap[selectedCustomerId]}
                                reservationMap={storeReservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
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
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--white-color);
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

const StyledRevenueDashboard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0 8px;
`;

const StyledKpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

const StyledKpiCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 18px;
        color: var(--black-color);
    }
`;

const StyledChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 1080px) {
        grid-template-columns: 1fr;
    }
`;

const StyledChartCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 250px;
    padding: 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 16px;
    background: var(--white-color);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
`;

const StyledChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    strong {
        font-size: 14px;
        color: var(--black-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
        text-align: right;
    }
`;

const StyledChartEmpty = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledLineChartBox = styled.div`
    position: relative;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 6px;
    min-height: 180px;
    padding: 12px;
    border-radius: 14px;
    background:
        linear-gradient(to top, rgba(15, 23, 42, 0.05) 1px, transparent 1px) 0 0 / 100% 33.33%,
        linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
`;

const StyledChartMetaTop = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledChartMetaBottom = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledLineChart = styled.svg`
    width: 100%;
    height: 120px;
    overflow: visible;
`;

const StyledChartAxis = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledBarChartList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledBarRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 88px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
`;

const StyledBarLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    color: var(--dark-gray-color);

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const StyledColorSwatch = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(props) => props.$color};
`;

const StyledBarTrack = styled.div`
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: #edf2f7;
    overflow: hidden;
`;

const StyledBarFill = styled.div<{ $color: string; $width: number }>`
    width: ${(props) => `${props.$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${(props) => props.$color};
`;

const StyledBarValue = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledPaymentChartWrap = styled.div`
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 16px;
    align-items: center;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
        justify-items: center;
    }
`;

const StyledDonutChart = styled.div<{ $gradient: string }>`
    position: relative;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: ${(props) => props.$gradient};

    &::after {
        content: '';
        position: absolute;
        inset: 22px;
        border-radius: 50%;
        background: var(--white-color);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
    }

    > div {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        text-align: center;
    }

    strong {
        font-size: 14px;
        color: var(--black-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledLegendList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledLegendItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const StyledLegendValue = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;

    strong {
        font-size: 12px;
        color: var(--black-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledRevenueStickyArea = styled.div`
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--white-color);
    border-bottom: 1px solid var(--light-gray-color);
`;

const compactInputStyle = css`
    height: 30px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    font-size: 12px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }

    &:disabled {
        background: var(--gray-color2);
        color: var(--dark-gray-color2);
    }
`;

const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;

    &:hover {
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

const footerActionStackStyle = css`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledRangeFilter = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: flex-end;
    gap: 8px;
    padding: 8px 0;
`;

const StyledRangeInputWrap = styled.label`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDateInput = styled.input`
    width: 100%;
    appearance: none;
    height: 30px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    font-size: 12px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    padding: 0 8px;
    color: var(--dark-gray-color);

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
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
    ${actionButtonStyle};
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 13px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledDesignerTabs = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px 16px;
    overflow-x: auto;
    overscroll-behavior: auto;
`;

const StyledDesignerTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    ${actionButtonStyle};
    min-height: 30px;
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 14px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
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
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    width: 96px;
`;

const StyledDateMonthDay = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledDateYear = styled.span`
    font-size: 10px;
    color: var(--dark-gray-color2);
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

const StyledRevenueSummary = styled(StyledSummary)`
    position: sticky;
    bottom: 0;
    z-index: 2;
    background: var(--white-color);
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    margin-top: 8px;
    box-shadow: 0 -8px 18px rgba(0, 0, 0, 0.06);
`;

const StyledEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledLayerBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
`;

const StyledRevenueLayer = styled.div`
    width: min(560px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: var(--white-color);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
`;

const StyledRevenueLayerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);
`;

const StyledLayerCloseButton = styled.button`
    border: 1px solid var(--light-gray-color);
    background: var(--white-color);
    color: var(--dark-gray-color);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
`;

/* ── Service Manage Styles ── */

const StyledStoreSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
`;

const StyledStoreCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
`;

const StyledStoreCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledStoreCardTitle = styled.strong`
    font-size: 14px;
    color: var(--dark-gray-color);
`;

const StyledStoreFieldGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledStoreActionRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    @media (max-width: 640px) {
        justify-content: stretch;
    }
`;

const StyledClosedDateAddRow = styled.div`
    display: flex;
    gap: 8px;

    @media (max-width: 640px) {
        flex-direction: column;
    }
`;

const StyledClosedDateList = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--black-color-10);
`;

const StyledClosedDateItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--black-color-10);
    font-size: 13px;
    color: var(--dark-gray-color);
`;

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
    gap: 8px;
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
    min-width: 0;
`;

const StyledCategoryActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledCategoryEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
`;

const StyledCategoryEditInput = styled.input`
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    outline: none;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
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

const StyledServiceContent = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledServiceMainLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        row-gap: 6px;
    }
`;

const StyledServiceActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: auto;

    @media (max-width: 640px) {
        margin-left: 0;
    }
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
    align-self: center;
`;

const StyledName = styled.span`
    flex: 1;
    min-width: 0;
    color: var(--dark-gray-color);
`;

const StyledMeta = styled.span`
    display: block;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledEditBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    font-size: 11px;
    color: var(--dark-gray-color);
`;

const StyledDeleteBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--danger-border);
    background: var(--danger-bg);
    font-size: 11px;
    color: var(--danger-color);
`;

const StyledEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 0;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledEditInput = styled.input`
    flex: 1;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
`;

const StyledEditSmall = styled.input`
    width: 60px;
    ${compactInputStyle};
    padding: 0 4px;
    text-align: right;

    @media (max-width: 640px) {
        flex: 1;
        width: auto;
        min-width: 0;
    }
`;

const StyledSaveBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--blue-color);
    background-color: var(--blue-color);
    color: #fff;
`;

const StyledCancelBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    color: var(--dark-gray-color);
`;

const StyledServiceFooter = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
`;

const StyledAddButton = styled.button`
    width: 100%;
    ${actionButtonStyle};
    border: 1px dashed var(--light-gray-color);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);

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

    @media (max-width: 640px) {
        flex-direction: column;
    }

    > select {
        ${compactInputStyle};
        padding: 0 4px;

        @media (max-width: 640px) {
            width: 100%;
        }
    }
`;

const StyledAddInput = styled.input`
    flex: 1;
    ${compactInputStyle};
    padding: 0 6px;
`;

const StyledAddNotice = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--red-color);
`;

const StyledAddSmall = styled.input`
    width: 80px;
    ${compactInputStyle};
    padding: 0 4px;
    text-align: right;

    @media (max-width: 640px) {
        width: 100%;
    }
`;

const StyledAddActions = styled.div`
    display: flex;
    gap: 4px;
    justify-content: flex-end;

    @media (max-width: 640px) {
        justify-content: stretch;
    }
`;

/* ── Designer Manage Styles ── */

const StyledDesignerBody = styled.div`
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerSectionTitle = styled.strong`
    padding: 0 2px;
    font-size: 12px;
    color: var(--dark-gray-color2);
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

    @media (max-width: 640px) {
        flex-wrap: wrap;
        align-items: flex-start;
    }
`;

const StyledDesignerHeaderActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: auto;

    @media (max-width: 640px) {
        margin-left: 0;
    }
`;

const StyledDesignerMetaGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 180px) minmax(0, 1fr) 96px;
    gap: 8px;
    margin-bottom: 10px;

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
    }
`;

const StyledDesignerMetaField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const StyledDesignerMetaLabel = styled.label`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerColorInput = styled.input`
    width: 100%;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    cursor: pointer;
`;

const StyledDesignerNameInput = styled.input`
    flex: 1;
    ${compactInputStyle};
    min-height: 30px;
    padding: 0 8px;
    font-size: 13px;

    @media (max-width: 640px) {
        width: auto;
        max-width: 100%;
    }
`;

const StyledDesignerMetaInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;
`;

const StyledDesignerStatusSelect = styled.select`
    flex-shrink: 0;
    ${compactInputStyle};
    min-height: 28px;
    padding: 0 8px;
    font-size: 11px;
    color: var(--dark-gray-color2);

    @media (max-width: 640px) {
        width: auto;
        max-width: 100%;
    }
`;


const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledScheduleRow = styled.div`
    display: grid;
    grid-template-columns: 28px 70px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    font-size: 12px;

    @media (max-width: 640px) {
        grid-template-columns: 28px 1fr;
        gap: 8px;
    }
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

    @media (max-width: 640px) {
        justify-content: flex-start;
    }
`;

const StyledTimeRange = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    @media (max-width: 640px) {
        grid-column: 2;
    }
`;

const StyledTimeRangeDivider = styled.span`
    flex-shrink: 0;
`;

const StyledTimeInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
    border-radius: 4px;
`;

const StyledDesignerAddRow = styled.div`
    display: flex;
    gap: 6px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        align-items: flex-start;
    }

    > * {
        max-width: 100%;
    }
`;

const StyledDesignerFooterActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    ${StyledEditBtn},
    ${StyledCancelBtn} {
        max-width: 100%;
    }

    @media (max-width: 640px) {
        justify-content: flex-start;
    }
`;
