import {useCallback, useMemo, useRef, useState} from 'react';

import {useCalendarStore} from '../../store/calendarStore';
import {getSelectableCustomers, sortCustomersByName} from '../../utils/customers';

// 회원권·쿠폰 발급 폼의 고객 고르기 상태. `CustomerAutocomplete`에 그대로 펼쳐 넣는다.
// onEdit: 검색어를 바꾸거나 고객을 고를 때(발급 오류 문구 지우기 등).
export function useIssueCustomerPicker(onEdit?: () => void) {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const [customerId, setCustomerId] = useState(0);
    const [query, setQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // 삭제(익명 처리)된 고객에게는 발급하지 않는다(서버도 거부).
    const customers = useMemo(
        () => sortCustomersByName(getSelectableCustomers(customerMap)),
        [customerMap]
    );
    const filteredCustomers = useMemo(() => (
        query.trim()
            ? customers.filter((c) => c.name.includes(query) || c.tel.includes(query))
            : customers
    ), [customers, query]);
    const customerName = useCallback(
        (legacyId: number) => customerMap[legacyId]?.name ?? `#${legacyId}`,
        [customerMap]
    );

    const reset = () => {
        setCustomerId(0);
        setQuery('');
    };

    const autocompleteProps = {
        query,
        showSuggestions,
        filteredCustomers,
        selectedId: customerId,
        onChangeQuery: (value: string) => {
            setQuery(value);
            setCustomerId(0);
            setShowSuggestions(true);
            onEdit?.();
        },
        onFocus: () => {
            clearTimeout(blurTimer.current);
            setShowSuggestions(true);
        },
        // 제안 목록을 누르는 동안 입력칸 blur 가 먼저 와도 선택이 먹도록 닫기를 늦춘다.
        onBlur: () => {
            blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
        },
        onSelect: (id: number) => {
            const c = customerMap[id];
            setCustomerId(id);
            if (c) setQuery(c.name);
            setShowSuggestions(false);
            onEdit?.();
        },
    };

    return {customerId, customerName, reset, autocompleteProps};
}
