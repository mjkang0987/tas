import 'dotenv/config';
import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: '../server/prisma/schema.prisma',
    migrations: {
        path: '../server/prisma/migrations',
        seed: 'node ../server/prisma/seed.mjs',
    },
    datasource: {
        // 마이그레이션은 direct(session, 5432) 연결을 써야 함 — Supabase Supavisor
        // 트랜잭션 풀러(6543)는 advisory lock/DDL 트랜잭션을 제대로 못 다룸.
        // 런타임 앱은 DATABASE_URL(풀러)을 쓰고, CLI만 DIRECT_URL을 우선 사용.
        url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    },
});
