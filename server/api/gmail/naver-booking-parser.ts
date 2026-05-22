export interface NaverBookingData {
    bookingId: string;
    bookingUrl: string;
    customerName: string;
    designerName: string;
    appointmentDate: string;
    appointmentTime: string;
    services: Array<{name: string; price: number}>;
    deposit: number;
    memo: string;
}

export function parseNaverBookingEmail(html: string): NaverBookingData | null {
    const bookingId = extractLabelValue(html, '예약번호');
    if (!bookingId) return null;

    const customerNameRaw = extractLabelValue(html, '예약자명') ?? '';
    const customerName = customerNameRaw.replace(/님$/, '').trim();

    const designerName = extractLabelValue(html, '예약상품') ?? '';

    const dateTimeRaw = extractLabelValue(html, '이용일시') ?? '';
    const {date, time} = parseDateTimeKorean(dateTimeRaw);

    const {services, deposit} = parseServices(html);
    const memo = extractLabelValue(html, '요청사항') ?? '';

    const bookingUrl = extractBookingDetailUrl(html);

    return {
        bookingId,
        bookingUrl,
        customerName,
        designerName,
        appointmentDate: date,
        appointmentTime: time,
        services,
        deposit,
        memo,
    };
}

export function parseNaverCancellationEmail(html: string): {bookingId: string} | null {
    const bookingId = extractLabelValue(html, '예약번호');
    if (!bookingId) return null;
    return {bookingId};
}

function extractLabelValue(html: string, label: string): string | null {
    const patterns = [
        new RegExp(`${label}[\\s\\S]*?<\\/td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i'),
        new RegExp(`${label}[\\s\\S]*?<\\/th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i'),
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
            return stripHtml(match[1]).trim();
        }
    }

    return null;
}

function stripHtml(str: string): string {
    return str
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseDateTimeKorean(raw: string): {date: string; time: string} {
    // "2026.05.16.(토) 오후 6:00" or "2026.05.16.(토) 오전 10:00"
    const dateMatch = raw.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    const timeMatch = raw.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);

    let date = '';
    if (dateMatch) {
        const y = dateMatch[1];
        const m = dateMatch[2].padStart(2, '0');
        const d = dateMatch[3].padStart(2, '0');
        date = `${y}-${m}-${d}`;
    }

    let time = '';
    if (timeMatch) {
        const period = timeMatch[1];
        let hour = parseInt(timeMatch[2], 10);
        const minute = timeMatch[3];

        if (period === '오후' && hour < 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;

        time = `${String(hour).padStart(2, '0')}:${minute}`;
    }

    return {date, time};
}

function parseServices(html: string): {services: Array<{name: string; price: number}>; deposit: number} {
    // "선택메뉴" section: "남성커트 18,000원 = 5,000원"
    const menuSection = extractLabelValue(html, '선택메뉴') ?? extractLabelValue(html, '메뉴') ?? '';
    if (!menuSection) return {services: [], deposit: 0};

    const services: Array<{name: string; price: number}> = [];
    let deposit = 0;

    // Global match: "서비스명 금액원" (optionally followed by "= 예약금원")
    // Service names may contain any characters (numbers, +, /, -, · etc.)
    const pattern = /(.+?)\s+([\d,]+)원(?:\s*=\s*([\d,]+)원)?/g;
    let match;
    while ((match = pattern.exec(menuSection)) !== null) {
        services.push({
            name: match[1].trim(),
            price: parseKoreanNumber(match[2]),
        });
        if (match[3]) {
            deposit += parseKoreanNumber(match[3]);
        }
    }

    return {services, deposit};
}

function extractBookingDetailUrl(html: string): string {
    const match = html.match(/<a[^>]+href=["'](https?:\/\/partner\.booking\.naver\.com[^"']+)["'][^>]*>[\s\S]*?자세히\s*보기[\s\S]*?<\/a>/i);
    return match?.[1]?.replace(/&amp;/g, '&').trim() ?? '';
}

function parseKoreanNumber(str: string): number {
    return parseInt(str.replace(/,/g, ''), 10) || 0;
}
