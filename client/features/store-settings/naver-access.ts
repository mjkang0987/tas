// 네이버예약 연동을 어느 매장에 노출할지 정하는 목록.
//
// 연동 기능 자체는 동작하지만 아직 모든 매장에 열지 않는다. 그래서 기능을 지우지 않고
// "누구에게 보일지"만 여기서 통제한다 — 공개 범위를 넓힐 땐 이 목록만 고치면 된다.
//
// 판별 기준이 영문 매장명(`Store.bookingSlug`)인 이유: 오너에게 노출되는 유일한 매장 식별자다.
// DB의 cuid는 화면에 나오지 않아 사람이 목록에 적을 수 없다.
// (슬러그가 비었거나 바뀐 매장까지 감안한 최종 판정은 `server/naver-access.ts` 쪽에 있다.)

export const NAVER_BOOKING_ALLOWED_SLUGS: readonly string[] = ['hairsalonkimeun'];

export function isNaverBookingAllowedSlug(bookingSlug: string | null | undefined): boolean {
    if (typeof bookingSlug !== 'string') return false;

    // 저장 시 소문자로 정규화되지만(`server/api/store.ts`), 목록 대조는 입력을 믿지 않고 한 번 더 맞춘다.
    const normalized = bookingSlug.trim().toLowerCase();

    // 완전 일치만 통과 — 부분 일치를 허용하면 비슷한 슬러그를 만든 매장이 딸려 들어온다.
    return NAVER_BOOKING_ALLOWED_SLUGS.includes(normalized);
}
