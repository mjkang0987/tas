import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../client/auth';
import {signMobileCode} from '../../auth/mobile-token';

// 모바일 로그인 완료 지점. iOS는 ASWebAuthenticationSession으로 웹 로그인을 열고,
// NextAuth OAuth 성공 후 callbackUrl=/api/mobile-auth/complete 로 돌아온다.
// 여기서 세션을 읽어 1회성 code를 발급하고 커스텀 스킴으로 앱에 돌려보낸다.
const APP_CALLBACK = 'tasios://auth/callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await auth(req, res);
    const nonce = typeof req.query.nonce === 'string' ? req.query.nonce : '';

    // 세션 유효 + 매장/권한 확정(온보딩 완료)이어야 발급. 그 외는 오류 사유와 함께 앱으로 복귀.
    if (!session?.user?.id || !session.user.storeId || !session.user.role) {
        const reason = session?.user?.id ? 'no_store' : 'no_session';
        return res.redirect(302, `${APP_CALLBACK}?error=${reason}`);
    }

    const code = signMobileCode({
        userId: session.user.id,
        storeId: session.user.storeId,
        role: session.user.role,
        nonce,
    });

    return res.redirect(302, `${APP_CALLBACK}?code=${encodeURIComponent(code)}`);
}
