import {useCalendarStore} from '../store/calendarStore';
import {getStoreLabels, type StoreLabels} from '../features/store-settings/labels';

// 현재 매장의 업종(shopType)에 맞는 "담당자"/"서비스" 표시 라벨을 반환.
export function useStoreLabels(): StoreLabels {
    const shopType = useCalendarStore((s) => s.shopType);
    return getStoreLabels(shopType);
}
