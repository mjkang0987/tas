import {useCallback, useRef, useState} from 'react';

// 요청 하나가 끝날 때까지 다음 요청을 막는다(발급·사용·취소 버튼 연타로 두 번 처리되는 것 방지).
// ref 로 막는 이유: setState 는 비동기라 아주 빠른 연속 클릭을 state 만으로는 못 막는다.
// busy 는 버튼 disabled 표시용.
export function useSingleFlight() {
    const runningRef = useRef(false);
    const [busy, setBusy] = useState(false);

    const run = useCallback(async (task: () => Promise<void>) => {
        if (runningRef.current) return;
        runningRef.current = true;
        setBusy(true);
        try {
            await task();
        } finally {
            runningRef.current = false;
            setBusy(false);
        }
    }, []);

    return {busy, run};
}
