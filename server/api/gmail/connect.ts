import crypto from 'node:crypto';

import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession, requireRole} from '../../auth/api-session';
import {isNaverBookingEnabledStore} from '../../naver-access';
import {GMAIL_OAUTH_SCOPE, buildStateCookie, getBaseUrl, getRedirectUri} from './oauth-shared';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    // 노출 대상이 아닌 매장은 연동 시작 자체를 막는다. UI를 숨기는 것만으로는
    // URL을 직접 치면 연결이 만들어지고, 그 연결이 다시 노출 조건이 돼 게이트가 무력해진다.
    if (!(await isNaverBookingEnabledStore(session.storeId))) {
        return res.status(403).json({error: 'Naver booking integration is not available for this store'});
    }

    if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
        return res.redirect(302, '/settings/naver?gmail=error&reason=config');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const secure = getBaseUrl(req).startsWith('https');
    res.setHeader('Set-Cookie', buildStateCookie(state, 600, secure));

    const params = new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID,
        redirect_uri: getRedirectUri(req),
        response_type: 'code',
        scope: GMAIL_OAUTH_SCOPE,
        access_type: 'offline',
        // 로그인 계정과 다른 Gmail 계정도 선택할 수 있도록 계정 선택 화면 강제
        prompt: 'consent select_account',
        state,
    });

    return res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
