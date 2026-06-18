import path from 'path';

const asides = ['day', 'three', 'week', 'month', 'year'];

const extraDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    /**
     * Cloud Run 컨테이너 배포용 self-contained 출력(.next/standalone).
     * 앱이 ../server 를 externalDir 로 import 하므로 트레이싱 루트를
     * repo 루트로 잡아야 server/ 와 client/prisma/generated 가 산출물에 포함됨.
     */
    output: 'standalone',
    outputFileTracingRoot: path.resolve('..'),
    /**
     * Prisma 런타임 패키지는 pnpm 심링크라 Next 트레이서가 자동으로 못 따라옴.
     * generated 클라이언트(@prisma/client/runtime) + driver adapter(pg)를 명시 포함.
     * 경로는 project 디렉터리(client/) 기준. .pnpm 버전 해시는 와일드카드로 회피.
     */
    outputFileTracingIncludes: {
        '**/*': [
            'node_modules/@prisma/client/**',
            'node_modules/@prisma/adapter-pg/**',
            '../node_modules/.pnpm/pg@*/node_modules/pg/**',
            '../node_modules/.pnpm/@prisma+driver-adapter-utils@*/node_modules/@prisma/driver-adapter-utils/**',
        ],
    },
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
            // /policies/<slug> → 독립 HTML 정책 문서 (앱 셸 없는 풀페이지)
            {source: '/policies/:slug', destination: '/api/policies/:slug'},
        ];
    },
};

export default nextConfig;
