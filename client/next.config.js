const path = require('path');

/** @type {import('next').NextConfig} */
const asides = ['day', 'three', 'week', 'month', 'year'];

const extraDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const nextConfig = {
    reactStrictMode: true,
    compiler       : {
        styledComponents: true
    },
    /**
     * LAN IP 등으로 접속할 때 HMR / dev 전용 요청이 막히지 않게 합니다.
     * 추가 호스트는 환경 변수: NEXT_DEV_ALLOWED_ORIGINS=host1,host2
     */
    allowedDevOrigins: ['172.29.59.30', ...extraDevOrigins],
    /**
     * pnpm 등에서 Turbopack이 워크스페이스 루트를 잘못 잡을 때
     * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
     */
    turbopack: {
        root: path.resolve(__dirname)
    },
    async rewrites() {
        return asides.map((aside) => ({
            source     : `/${aside}/:path*`,
            destination: '/'
        }));
    }
};

module.exports = nextConfig;
