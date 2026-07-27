// 앱 전역 폰트 스택(단일 소스).
// globalStyle(앱)과 policyCss(정책 문서 독립 HTML)가 함께 쓴다 — 두 곳이 갈리면
// 같은 문서가 앱 안에서와 풀페이지에서 다른 서체로 보인다.
//
// 설계 메모
// - 한글 폰트를 명시한다. 이전 스택("SF Pro AR"·"SF Pro Gulf"·Helvetica·Arial)은 라틴 폰트뿐이라
//   한글이 전부 브라우저 기본 sans-serif 로 떨어졌다. ("SF Pro AR"은 아랍어 변형이라 의도와도 달랐다.)
// - 웹폰트는 싣지 않는다. 각 OS의 기본 한글 서체를 쓰고 로딩 비용을 두지 않는다.
//   Pretendard 는 설치돼 있으면 쓰고 없으면 자연히 건너뛴다.
// - 적용 대상에 textarea·select 를 반드시 포함할 것. 빠져 있어 select 가 Arial 로 렌더됐다.
export const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, "Malgun Gothic", "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif';
