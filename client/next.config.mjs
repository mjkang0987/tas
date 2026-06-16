import path from 'path';

const asides = ['day', 'three', 'week', 'month', 'year'];

const extraDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        externalDir: true,
    },
    transpilePackages: ['next-auth', '@auth/core'],
    compiler: {
        styledComponents: true,
    },
    /**
     * LAN IP 등으로 접속할 때 HMR / dev 전용 요청이 막히지 않게 합니다.
     * 추가 호스트는 환경 변수: NEXT_DEV_ALLOWED_ORIGINS=host1,host2
     */
    allowedDevOrigins: ['172.29.59.30', 'dev.takeaseat.co.kr', ...extraDevOrigins],
    /**
     * pnpm 등에서 Turbopack이 워크스페이스 루트를 잘못 잡을 때
     * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
     */
    turbopack: {
        root: path.resolve('..'),
    },
    async rewrites() {
        return [
            ...asides.map((aside) => ({
                source: `/${aside}/:path*`,
                destination: '/',
            })),
            // /consent/<돌아갈 경로> → consent 페이지 (쿼리스트링 대신 슬래시 경로)
            {source: '/consent/:slug*', destination: '/consent'},
        ];
    },
};

export default nextConfig;
