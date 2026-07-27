// 앱 전역 폰트 스택(단일 소스).
// globalStyle(앱)과 policyCss(정책 문서 독립 HTML)가 함께 쓴다 — 두 곳이 갈리면
// 같은 문서가 앱 안에서와 풀페이지에서 다른 서체로 보인다.
//
// 기존 라틴 스택은 그대로 두고 **한글 폰트를 뒤에 덧붙이기만** 한다.
// 폰트 폴백은 글자 단위라, 라틴 폰트에 한글 글리프가 없으면 자동으로 다음 폰트로 넘어간다.
// (덧붙이기 전에는 한글용 폰트가 하나도 없어 브라우저 기본 sans-serif 로 떨어졌다.)
//
// 웹폰트는 싣지 않는다 — 각 OS의 기본 한글 서체를 쓰고 로딩 비용을 두지 않는다.
// Pretendard 는 설치돼 있으면 쓰고 없으면 자연히 건너뛴다.
//
// 적용 대상에 textarea·select 를 반드시 포함할 것. 빠져 있어 select 가 Arial 로 렌더됐다.
export const FONT_STACK = [
    // 라틴 (기존 값 유지)
    '"SF Pro AR"', '"SF Pro Gulf"', '"SF Pro Display"', '"SF Pro Icons"',
    '"Helvetica Neue"', '"Helvetica"', '"Arial"',
    // 한글 (신규)
    '"Apple SD Gothic Neo"', '"Pretendard Variable"', 'Pretendard',
    '"Malgun Gothic"', '"Noto Sans KR"',
    'sans-serif',
].join(', ');
