// WCAG 상대 휘도·대비. 색 표기는 #RGB · #RRGGBB(뒤 알파는 무시) · rgb()/rgba()(흰 바탕에 섞음) · hsl().

export type Rgb = [number, number, number];

export function parseColor(color: string): Rgb | null {
    const value = color.trim();
    const hsl = value.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
    if (hsl) {
        const [h, s, l] = [Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100];
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
        };
        return [f(0), f(8), f(4)];
    }
    const rgba = value.match(/^rgba?\(([^)]+)\)/);
    if (rgba) {
        const [r, g, b, a = '1'] = rgba[1].split(',').map((v) => v.trim());
        const alpha = Number(a);
        return [Number(r), Number(g), Number(b)].map((c) => c * alpha + 255 * (1 - alpha)) as Rgb;
    }
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!hex) return null;
    const full = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1].slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
    const f = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** 두 색의 대비(1~21). 읽을 수 없는 색이면 NaN. */
export function contrastRatio(a: string, b: string): number {
    const [ra, rb] = [parseColor(a), parseColor(b)];
    if (!ra || !rb) return NaN;
    const [la, lb] = [luminance(ra), luminance(rb)];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const LIGHT_TEXT = '#ffffff';
/** 순검정 — --black-color(#212121)로는 중간 밝기 바탕(#EA4335·#E91E8C 등)에서 흰·검 둘 다 4.5 를 못 넘는다.
 *  흰(#fff)·순검정 중 나은 쪽은 어떤 바탕에서도 4.58 이상이다. */
export const DARK_TEXT = '#000000';

/**
 * 색 바탕(메모 태그·담당자 라벨) 위 글자색 — 흰 글자와 검은 글자 중 대비가 큰 쪽.
 * 바탕색은 사장님이 고른 값이 저장돼 있어 바꿀 수 없다. 노랑(#FBBC04) 위 흰 글자는 1.6:1 이라 안 읽혔다.
 * 읽을 수 없는 색은 예전처럼 흰 글자.
 */
export function readableTextOn(background: string): string {
    const light = contrastRatio(LIGHT_TEXT, background);
    const dark = contrastRatio(DARK_TEXT, background);
    if (Number.isNaN(light) || Number.isNaN(dark)) return LIGHT_TEXT;
    return light >= dark ? LIGHT_TEXT : DARK_TEXT;
}
