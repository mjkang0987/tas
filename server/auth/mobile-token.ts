import {createHmac, timingSafeEqual, randomUUID} from 'node:crypto';

import type {AppRole} from './roles';

// 모바일(iOS/Android) 전용 토큰. 웹은 기존 NextAuth 쿠키 세션을 그대로 쓰고,
// 앱만 이 Bearer 토큰으로 인증한다. 외부 의존성 없이 node:crypto로 HS256 서명한다.
//
// 두 종류:
//  - code   : 로그인 완료 직후 발급하는 1회성 교환용(짧은 TTL). URL로 앱에 전달.
//  - access : code 교환으로 받는 실제 API 인증 토큰(긴 TTL). Keychain 보관.

export const MOBILE_CODE_TTL_SEC = 60;
export const MOBILE_ACCESS_TTL_SEC = 60 * 60 * 24 * 30; // 30일

interface BaseClaims {
    iat: number;
    exp: number;
}

interface CodeClaims extends BaseClaims {
    typ: 'code';
    jti: string;
    userId: string;
    storeId: string;
    role: AppRole;
    nonce: string;
}

interface AccessClaims extends BaseClaims {
    typ: 'access';
    userId: string;
    storeId: string;
    role: AppRole;
}

function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET is not set');
    }
    return secret;
}

function encodeSegment(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload: object, expiresInSec: number): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {alg: 'HS256', typ: 'JWT'};
    const body = {...payload, iat: now, exp: now + expiresInSec};
    const data = `${encodeSegment(header)}.${encodeSegment(body)}`;
    const signature = createHmac('sha256', getSecret()).update(data).digest('base64url');
    return `${data}.${signature}`;
}

function verify<T extends BaseClaims>(token: string): T | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    const [encodedHeader, encodedBody, signature] = parts;
    const data = `${encodedHeader}.${encodedBody}`;
    const expected = createHmac('sha256', getSecret()).update(data).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        return null;
    }

    let claims: T;
    try {
        claims = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8')) as T;
    } catch {
        return null;
    }

    if (typeof claims.exp !== 'number' || Math.floor(Date.now() / 1000) >= claims.exp) {
        return null;
    }

    return claims;
}

// MARK: - code(1회성 교환 토큰)

export function signMobileCode(input: {userId: string; storeId: string; role: AppRole; nonce: string}): string {
    const claims: Omit<CodeClaims, keyof BaseClaims> = {typ: 'code', jti: randomUUID(), ...input};
    return sign(claims, MOBILE_CODE_TTL_SEC);
}

export function verifyMobileCode(
    token: string
): {userId: string; storeId: string; role: AppRole; nonce: string} | null {
    const claims = verify<CodeClaims>(token);
    if (!claims || claims.typ !== 'code') {
        return null;
    }
    return {userId: claims.userId, storeId: claims.storeId, role: claims.role, nonce: claims.nonce ?? ''};
}

// MARK: - access(API 인증 토큰)

export function signMobileAccess(input: {userId: string; storeId: string; role: AppRole}): string {
    const claims: Omit<AccessClaims, keyof BaseClaims> = {typ: 'access', ...input};
    return sign(claims, MOBILE_ACCESS_TTL_SEC);
}

export function verifyMobileAccess(token: string): {userId: string; storeId: string; role: AppRole} | null {
    const claims = verify<AccessClaims>(token);
    if (!claims || claims.typ !== 'access') {
        return null;
    }
    return {userId: claims.userId, storeId: claims.storeId, role: claims.role};
}
