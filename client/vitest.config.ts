import {defineConfig} from 'vitest/config';

// 순수 함수 단위 테스트 전용 설정.
// DB·React 렌더링이 필요한 테스트는 아직 없다(별도 환경 구성 필요).
export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: [
            '**/node_modules/**',
            '**/.next/**',
            'prisma/generated/**',
        ],
    },
});
