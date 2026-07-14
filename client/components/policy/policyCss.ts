// 정책 문서 공통 스타일 (styled-components 비의존, 순수 문자열).
// - 인라인 페이지: policyStyles.ts의 PolicyBody가 이 문자열을 styled.div에 주입 → 컴포넌트 스코프
// - 풀페이지(API): renderPolicyHtml이 <style>에 그대로 사용 → 문서 전역
// 두 곳이 같은 문자열을 쓰므로 스타일을 한 곳에서만 관리한다.

export const POLICY_VARS_LIGHT = `
    --tas-bg: #ffffff;
    --tas-fg: #1f2328;
    --tas-muted: #57606a;
    --tas-accent: #6526d9;
    --tas-accent-soft: #f1ecfb;
    --tas-border: #e4e7eb;
`;

export const POLICY_VARS_DARK = `
    --tas-bg: #0d1117;
    --tas-fg: #e6edf3;
    --tas-muted: #9198a1;
    --tas-accent: #a78bfa;
    --tas-accent-soft: #1c1730;
    --tas-border: #30363d;
`;

// 요소 규칙(맨 앞 선택자가 bare). styled-components에선 컴포넌트 하위로 스코프되고,
// 풀페이지 <style>에선 문서 전역에 적용된다(문서에 정책 콘텐츠만 있으므로 안전).
export const POLICY_ELEMENT_CSS = `
    h1 {
        font-size: 1.9rem;
        line-height: 1.3;
        margin: 0 0 0.4em;
        border-bottom: 3px solid var(--tas-accent);
        padding-bottom: 0.4em;
    }
    h2 {
        font-size: 1.25rem;
        margin: 2em 0 0.6em;
        color: var(--tas-accent);
    }
    .policy-subhead {
        display: block;
        font-size: 1.05rem;
        font-weight: 700;
        margin: 1.4em 0 0.4em;
    }
    p {
        margin: 0.6em 0;
    }
    ol,
    ul {
        margin: 0.4em 0 0.8em;
        padding-left: 1.4em;
    }
    li {
        margin: 0.25em 0;
    }
    blockquote {
        margin: 1em 0;
        padding: 0.6em 1em;
        background: var(--tas-accent-soft);
        border-left: 4px solid var(--tas-accent);
        color: var(--tas-muted);
        border-radius: 4px;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        font-size: 0.95rem;
    }
    th,
    td {
        border: 1px solid var(--tas-border);
        padding: 0.5em 0.7em;
        text-align: left;
        vertical-align: top;
    }
    th {
        background: var(--tas-accent-soft);
    }
    hr {
        border: 0;
        border-top: 1px solid var(--tas-border);
        margin: 2em 0;
    }
    a {
        color: var(--tas-accent);
    }
    em {
        color: var(--tas-muted);
    }
`;

// 풀페이지(독립 HTML) 문자열 생성. API 라우트에서 text/html로 응답한다.
export function renderPolicyHtml(headTitle: string, h1Title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${headTitle}</title><style>
:root{${POLICY_VARS_LIGHT}}
html,body{margin:0;background:var(--tas-bg);}
.tas-doc{max-width:820px;margin:0 auto;padding:40px 20px 80px;color:var(--tas-fg);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;line-height:1.75;font-size:16px;word-break:keep-all;}
${POLICY_ELEMENT_CSS}
@media (prefers-color-scheme:dark){:root{${POLICY_VARS_DARK}}}
</style></head>
<body><main class="tas-doc" id="tas-document">
<h1>${h1Title}</h1>
${body}
</main></body></html>`;
}
