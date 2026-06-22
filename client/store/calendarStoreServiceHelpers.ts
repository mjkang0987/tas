import type {ServiceItem} from '../utils/services';
import {
    buildCatalogMap,
    calcEndTime,
    joinServiceNames,
    parseServiceString,
    sumDurationMinutes,
    sumPrice,
} from '../utils/services';
import {hasCompletedPayment} from '../features/reservations/model';
import type {Reservation, ReservationMap} from '../utils/reservations';
import {groupCatalogByCategory, reorder} from './calendarStoreHelpers';

export function buildAddedServiceState(serviceCatalog: ServiceItem[], item: ServiceItem) {
    return [...serviceCatalog, item];
}

export function buildUpdatedServiceState(serviceCatalog: ServiceItem[], name: string, updated: ServiceItem) {
    return serviceCatalog.map((service) => service.name === name ? updated : service);
}

export function buildDeletedServiceState(serviceCatalog: ServiceItem[], name: string) {
    return serviceCatalog.filter((service) => service.name !== name);
}

export function buildRenamedCategoryState(
    serviceCatalog: ServiceItem[],
    categoryBaseColorMap: Record<string, string>,
    prevCategory: string,
    nextCategory: string
) {
    const trimmed = nextCategory.trim();
    if (!trimmed || trimmed === prevCategory) return null;
    if (serviceCatalog.some((item) => item.category === trimmed)) return null;

    const nextCatalog = serviceCatalog.map((item) => (
        item.category === prevCategory ? {...item, category: trimmed} : item
    ));

    const nextCategoryBaseColorMap = {...categoryBaseColorMap};
    if (prevCategory in nextCategoryBaseColorMap) {
        nextCategoryBaseColorMap[trimmed] = nextCategoryBaseColorMap[prevCategory];
        delete nextCategoryBaseColorMap[prevCategory];
    }

    return {
        serviceCatalog: nextCatalog,
        categoryBaseColorMap: nextCategoryBaseColorMap,
    };
}

export function buildMovedCategoryState(
    serviceCatalog: ServiceItem[],
    dragCategory: string,
    targetCategory: string
) {
    if (dragCategory === targetCategory) return null;

    const grouped = groupCatalogByCategory(serviceCatalog);
    const categories = Array.from(grouped.keys());
    const dragIndex = categories.indexOf(dragCategory);
    const targetIndex = categories.indexOf(targetCategory);

    if (dragIndex === -1 || targetIndex === -1) return null;

    const nextCategories = reorder(categories, dragIndex, targetIndex);
    return nextCategories.flatMap((category) => grouped.get(category) || []);
}

export function buildMovedServiceInCategoryState(
    serviceCatalog: ServiceItem[],
    dragName: string,
    targetName: string
) {
    if (dragName === targetName) return null;

    const dragIndex = serviceCatalog.findIndex((service) => service.name === dragName);
    const targetIndex = serviceCatalog.findIndex((service) => service.name === targetName);

    if (dragIndex === -1 || targetIndex === -1) return null;

    const targetItem = serviceCatalog[targetIndex];
    const nextCatalog = [...serviceCatalog];
    const [moved] = nextCatalog.splice(dragIndex, 1);
    const movedWithCategory: ServiceItem = {...moved, category: targetItem.category};
    const insertIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextCatalog.splice(insertIndex, 0, movedWithCategory);
    return nextCatalog;
}

/* ------------------------------------------------------------------ */
/*  서비스 변경 → 기존 예약 일괄 반영                                   */
/* ------------------------------------------------------------------ */

export interface ReservationServiceUpdate {
    prev: Reservation;
    updated: Reservation;
}

function localTodayKey(): string {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
}

function minutesBetween(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
}

// '앞으로의 미결제 예약'만 대상: 오늘 이후 + active + 결제·완료 전
function isApplicableReservation(reservation: Reservation, todayKey: string): boolean {
    const status = reservation.status ?? 'active';
    if (status !== 'active') return false;
    if (reservation.date < todayKey) return false;
    if (hasCompletedPayment(reservation)) return false;
    return true;
}

/**
 * 서비스 카탈로그의 소요시간/가격(또는 이름) 변경을 기존 예약에 일괄 반영한다.
 * - 대상: 오늘 이후의 active·미결제 예약 중 해당 서비스를 포함한 건.
 * - 수동조정 보존: 저장된 가격이 '구 카탈로그 합계'와 다르면 가격 유지,
 *   저장된 소요시간이 '구 카탈로그 합계'와 다르면 종료시간 유지.
 */
export function buildServiceCatalogReservationUpdates(
    reservationMap: ReservationMap,
    originalName: string,
    updatedName: string,
    prevCatalog: ServiceItem[],
    nextCatalog: ServiceItem[],
): {nextReservationMap: ReservationMap; updates: ReservationServiceUpdate[]} {
    const oldCatalogMap = buildCatalogMap(prevCatalog);
    const newCatalogMap = buildCatalogMap(nextCatalog);
    const oldKnownNames = new Set(prevCatalog.map((s) => s.name));
    const todayKey = localTodayKey();

    const updates: ReservationServiceUpdate[] = [];
    const nextReservationMap: ReservationMap = {};

    for (const [dateKey, reservations] of Object.entries(reservationMap)) {
        let dateChanged = false;
        const nextList = reservations.map((reservation) => {
            if (!isApplicableReservation(reservation, todayKey)) return reservation;

            const names = parseServiceString(reservation.service, oldKnownNames);
            if (!names.includes(originalName)) return reservation;

            const oldTotalPrice = sumPrice(names, oldCatalogMap);
            const oldTotalDuration = sumDurationMinutes(names, oldCatalogMap);
            const priceIsManual = (reservation.price ?? 0) !== oldTotalPrice;
            const durationIsManual = minutesBetween(reservation.startTime, reservation.endTime) !== oldTotalDuration;

            const newNames = names.map((name) => (name === originalName ? updatedName : name));
            const nextService = joinServiceNames(newNames);
            const nextPrice = priceIsManual ? (reservation.price ?? 0) : sumPrice(newNames, newCatalogMap);
            const nextEndTime = durationIsManual
                ? reservation.endTime
                : calcEndTime(reservation.startTime, sumDurationMinutes(newNames, newCatalogMap));

            if (nextService === reservation.service
                && nextPrice === (reservation.price ?? 0)
                && nextEndTime === reservation.endTime) {
                return reservation;
            }

            const updated: Reservation = {
                ...reservation,
                service: nextService,
                price: nextPrice,
                endTime: nextEndTime,
            };
            updates.push({prev: reservation, updated});
            dateChanged = true;
            return updated;
        });
        nextReservationMap[dateKey] = dateChanged ? nextList : reservations;
    }

    return {nextReservationMap, updates};
}
