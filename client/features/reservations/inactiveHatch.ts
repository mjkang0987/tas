/**
 * 끝난 예약(취소·노쇼) 카드의 빗금 한 겹.
 *
 * 취소는 무채색, 노쇼는 붉은 기운 — 카드에서 상태 글자를 뺀 뒤로 둘을 가르는 건 이 색뿐이다.
 * (노쇼가 붉은 건 매출이 빈 자리라 눈에 걸려야 하기 때문이다.)
 *
 * **한 곳에 둔 이유**: 같은 문자열이 타임라인 카드·목록 카드·월 칸 카드에 복사돼 있었고,
 * 타임라인만 붉게 바꿨더니 한 화면 안에서 같은 노쇼가 빨강과 회색으로 갈렸다.
 */
export function inactiveHatch(noshow?: boolean): string {
    const stripe = noshow ? 'rgba(201, 58, 48, 0.18)' : 'rgba(0, 0, 0, 0.05)';
    return `repeating-linear-gradient(-45deg, ${stripe} 0 6px, transparent 6px 12px)`;
}
