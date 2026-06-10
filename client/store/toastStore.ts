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

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    show: (message, type = 'success') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({toasts: [...s.toasts, {id, message, type}]}));
        setTimeout(() => {
            set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)}));
        }, 3000);
    },
    dismiss: (id) => set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)})),
}));
