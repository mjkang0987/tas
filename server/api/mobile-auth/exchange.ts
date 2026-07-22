import type {NextApiRequest, NextApiResponse} from 'next';

import {verifyMobileCode, signMobileAccess, MOBILE_ACCESS_TTL_SEC} from '../../auth/mobile-token';

// 1회성 code를 실제 API 인증용 access 토큰으로 교환한다.
// iOS가 커스텀 스킴 콜백에서 받은 code + 로그인 시작 시 만든 nonce를 보낸다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({error: 'Method not allowed'});
    }

    const {code, nonce} = (req.body ?? {}) as {code?: string; nonce?: string};
    if (!code) {
        return res.status(400).json({error: 'Missing code'});
    }

    const claims = verifyMobileCode(code);
    if (!claims) {
        return res.status(401).json({error: 'Invalid or expired code'});
    }

    // nonce 바인딩: code를 발급받은 그 로그인 시도(기기)만 교환 가능.
    if ((claims.nonce ?? '') !== (nonce ?? '')) {
        return res.status(401).json({error: 'Nonce mismatch'});
    }

    const accessToken = signMobileAccess({
        userId: claims.userId,
        storeId: claims.storeId,
        role: claims.role,
    });
    const expiresAt = Math.floor(Date.now() / 1000) + MOBILE_ACCESS_TTL_SEC;

    return res.status(200).json({accessToken, expiresAt});
}
