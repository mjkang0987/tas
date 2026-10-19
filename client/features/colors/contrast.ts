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

function toHsl([r, g, b]: Rgb): [number, number, number] {
    const [rn, gn, bn] = [r / 255, g / 255, b / 255];
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * 흰 글자를 얹는 색 바탕(메모 태그·담당자 라벨) — 흰 글자가 4.5:1 이 될 때까지 **같은 색을 진하게**(색상·채도 유지, 밝기만 내림).
 * 바탕은 사장님이 고른 색이라 다른 색으로 바꾸지 않는다. 이미 충분히 진하면 그대로. 노랑(#FBBC04 → 흰 1.6:1)은 진한 황토색이 된다.
 * 읽을 수 없는 색(var() 등)은 그대로 돌려준다.
 */
export function backgroundForWhiteText(color: string): string {
    const rgb = parseColor(color);
    if (!rgb) return color;
    if (contrastRatio('#ffffff', color) >= 4.5) return color;
    const [h, s, l] = toHsl(rgb);
    for (let next = l; next > 0; next -= 0.01) {
        const candidate = hslToHex(h, s, next);
        if (contrastRatio('#ffffff', candidate) >= 4.5) return candidate;
    }
    return '#000000';
}
