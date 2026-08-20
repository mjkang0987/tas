import {create} from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastStore {
    toasts: Toast[];
    show: (message: string, type?: ToastType) => void;
    dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
    toasts: [],
    show: (message, type = 'success') => {
        // 같은 문구가 이미 떠 있으면 겹쳐 쌓지 않는다. 한 번의 사용자 동작이 서버 쓰기를
        // 여러 건 일으키는 경로가 있어(예: 예약 취소 → 예약 PATCH + 고객 PUT), 서버가
        // 죽으면 같은 안내가 여러 장 쌓인다. 오프라인에선 화면을 덮는다.
        if (get().toasts.some((t) => t.message === message && t.type === type)) return;

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({toasts: [...s.toasts, {id, message, type}]}));
        setTimeout(() => {
            set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)}));
        }, 3000);
    },
    dismiss: (id) => set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)})),
}));
