export function roundToHalfHour(h: number, m: number): { hour: number; rounded: number } {
    let rounded = 0;
    if (m < 15) {
        rounded = 0;
    } else if (m < 45) {
        rounded = 30;
    } else {
        rounded = 0;
        h += 1;
    }
    return { hour: h, rounded };
}

export function pad(n: number): string {
    return String(n).padStart(2, '0');
}
