import type {NextApiRequest, NextApiResponse} from 'next';

import {POLICIES, applyPolicyVars, isPolicySlug} from '../../../content/policies';
import {renderPolicyHtml} from '../../../components/policy/policyCss';

// 풀페이지(독립 HTML) 정책 문서. 앱 셸 없이 공개 URL로 접근(예: Google OAuth 검수용).
// next.config의 rewrite로 /policies/:slug → /api/policies/:slug 로 연결된다.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const {slug} = req.query;

    if (!isPolicySlug(slug)) {
        res.status(404).send('Not found');
        return;
    }

    const {navTitle, docTitle, body} = POLICIES[slug];
    // 이 경로는 매장 컨텍스트가 없다 → 매장명 토큰은 일반 표현으로 폴백된다.
    const html = renderPolicyHtml(`${navTitle} | TAS`, docTitle, applyPolicyVars(body));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);
}
