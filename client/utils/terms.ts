// 이용약관 / 개인정보처리방침(+처리위탁) 동의 버전.
// 약관 본문을 개정하면 이 값을 올려 전체 사용자에게 재동의를 받는다.
// (날짜 기반: YYYY-MM-DD)
export const CURRENT_TERMS_VERSION = '2026-06-16';

// 게스트(미로그인) 동의 여부를 서버에서도 읽기 위한 쿠키 이름.
// localStorage 는 서버가 못 보므로, 미들웨어(proxy.ts)와 SSR(pages/index.tsx)이
// "게스트로 쓰는 중"을 판별할 수 있는 유일한 신호다.
// 쿠키를 심는 쪽은 `features/local-db/storage.ts` 이며, features/** 가 바깥을 import 하지
// 않는 경계라 그쪽은 같은 이름을 따로 선언한다 — 값을 바꾸면 양쪽을 함께 고칠 것.
export const GUEST_TERMS_COOKIE = 'tas-guest-terms';
