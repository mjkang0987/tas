// AdSense 퍼블리셔 ID 단일 소스.
// NEXT_PUBLIC_* 는 빌드타임 인라인이라 배포 env 미설정 시 광고가 안 뜨므로 기본값을 둔다.
// 퍼블리셔 ID는 페이지 소스에 노출되는 공개값이라 하드코딩 무방(env로 오버라이드 가능).
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? 'ca-pub-5655041057903258';

/** 광고 유닛이 실제로 무언가를 그리는가. 슬롯 미설정이면 AdBanner 는 null 을 내므로,
 *  감싸는 자리(패딩·보더·safe-area)까지 렌더하면 내용 없는 띠만 남는다.
 *  개발에서는 자리 확인용 placeholder 가 뜨므로 true. */
export function isAdVisible(adSlot: string): boolean {
    if (process.env.NODE_ENV === 'development') return true;
    return !!ADSENSE_CLIENT && !!adSlot;
}
