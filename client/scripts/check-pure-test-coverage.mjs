#!/usr/bin/env node
// 순수 모듈을 변경했으면 그 모듈을 import 하는 테스트가 있어야 한다.
//
// 왜 "순수 모듈"만인가: 런타임 import 가 없는 모듈(타입 임포트만 있거나 아예 없음)은
// DB·React 환경 없이 바로 단위 테스트가 된다. 테스트를 안 쓸 핑계가 없는 범위다.
// React 컴포넌트·API 핸들러는 별도 환경이 필요하므로 이 게이트의 대상이 아니다.
//
// 왜 "변경분만"인가: 도입 시점에 순수 모듈 12개 중 테스트가 있는 건 1개였다.
// 전체를 막으면 아무것도 머지되지 않는다. 건드리는 파일부터 갚아 나간다.
//
// 판정은 파일명이 아니라 **import 관계**로 한다.
// (`model.ts` 의 테스트가 `dateKey.test.ts` 일 수 있다.)
//
// ⚠️ 한계: 이 게이트가 보장하는 것은 "테스트가 이 모듈을 import 한다"까지다.
//    "제대로 테스트한다"는 보장하지 못한다 — 쓰지 않는 import 하나로 통과시킬 수 있다.
//    테스트의 질은 `/test` 규약(변이 검사 의무)과 코드리뷰가 담당한다. 바닥이지 천장이 아니다.
//
// 사용: node scripts/check-pure-test-coverage.mjs [baseRef]

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const WATCHED = /^client\/features\/.+\.ts$/;

function git(...args) {
    return execFileSync('git', args, {cwd: REPO, encoding: 'utf8'}).trim();
}

function resolveBaseRef(explicit) {
    // 워크플로 기준 브랜치는 main 이다(CLAUDE.md `Development Workflow`). develop 은 배포 경로가 아니라
    // 통합 사전경보용이므로 base 로 삼으면 변경분 판정이 어긋난다.
    const candidates = explicit ? [explicit] : ['origin/main', 'origin/HEAD'];
    for (const ref of candidates) {
        try {
            git('rev-parse', '--verify', '--quiet', ref);
            return ref;
        } catch {
            /* 다음 후보 */
        }
    }
    return null;
}

// 런타임 의존이 하나라도 있으면 순수하지 않다(타입 임포트/재export 는 런타임에 지워진다).
// `export {x} from './y'` 도 런타임 재export 이므로 의존으로 센다.
function isPure(source) {
    return !source.split('\n').some((line) => {
        if (/^import\s+type\s/.test(line) || /^export\s+type\s/.test(line)) return false;
        if (/^import\s/.test(line)) return true;
        return /^export\s.*\sfrom\s/.test(line);
    });
}

// import 스펙을 실제 파일 경로로 해석한다. 상대경로만 대상(패키지는 무시).
function resolveSpec(fromFile, spec) {
    if (!spec.startsWith('.')) return null;
    const base = resolve(dirname(fromFile), spec);
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        if (existsSync(cand) && !cand.endsWith('/')) return cand;
    }
    return null;
}

// 주석 안의 `from './x'` 가 커버리지로 오인되지 않게 먼저 걷어낸다.
// 상대경로 스펙만 쓰므로 URL(`https://`) 이 잘려도 결과에 영향이 없다.
function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function importedPaths(testFile) {
    const src = stripComments(readFileSync(testFile, 'utf8'));
    const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    return new Set(specs.map((s) => resolveSpec(testFile, s)).filter(Boolean));
}

const baseRef = resolveBaseRef(process.argv[2]);
if (!baseRef) {
    // CI 에서 기준 ref 가 없으면 게이트가 통째로 무력화된다. 조용히 통과시키지 않는다.
    // (actions/checkout 의 fetch-depth 가 0 이 아니면 base 브랜치 ref 가 없다.)
    const msg = '비교 기준 ref 를 찾지 못했습니다(얕은 클론 등).';
    if (process.env.CI) {
        console.error(`\n🛑 ${msg} CI 에서는 게이트를 건너뛸 수 없습니다.`);
        console.error('   actions/checkout 에 fetch-depth: 0 이 설정돼 있는지 확인하세요.\n');
        process.exit(1);
    }
    console.log(`⚠️  ${msg} 로컬이므로 건너뜁니다.`);
    process.exit(0);
}

// 커밋된 변경(CI 경로) + 스테이지·워킹 트리(로컬 커밋 전 경로)를 모두 본다.
const changed = [...new Set([
    ...git('diff', '--name-only', '--diff-filter=ACM', `${baseRef}...HEAD`).split('\n'),
    ...git('diff', '--name-only', '--diff-filter=ACM', 'HEAD').split('\n'),
    ...git('diff', '--name-only', '--diff-filter=ACM', '--cached', 'HEAD').split('\n'),
])].filter((f) => WATCHED.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'));

if (changed.length === 0) {
    console.log(`✅ 검사 대상 순수 모듈 변경 없음 (기준: ${baseRef})`);
    process.exit(0);
}

// 저장소의 모든 테스트가 import 하는 파일 집합
const covered = new Set();
// 추적 파일 + 아직 add 하지 않은 새 파일까지 본다.
// (새 테스트를 쓰고 `git add` 전에 돌리면 "테스트가 없다"고 잘못 막힌다.)
const testFiles = git('ls-files', '--cached', '--others', '--exclude-standard', 'client')
    .split('\n')
    .filter((f) => f.endsWith('.test.ts'));
for (const t of testFiles) {
    for (const p of importedPaths(resolve(REPO, t))) covered.add(p);
}

const missing = [];
for (const f of changed) {
    const abs = resolve(REPO, f);
    if (!existsSync(abs)) continue;
    if (!isPure(readFileSync(abs, 'utf8'))) continue; // 런타임 의존 → 대상 아님
    if (!covered.has(abs)) missing.push(f);
}

if (missing.length > 0) {
    console.error(`\n🛑 순수 모듈을 변경했는데 이를 import 하는 테스트가 없습니다 (기준: ${baseRef})\n`);
    for (const f of missing) console.error(`   - ${f}`);
    console.error('\n   이 모듈들은 DB·React 없이 바로 테스트됩니다. `/test` 규약을 따르세요.');
    console.error('   테스트 위치는 자유이며, 해당 모듈을 import 하기만 하면 됩니다.\n');
    process.exit(1);
}

console.log(`✅ 변경된 순수 모듈 ${changed.length}개 전부 테스트가 있습니다 (기준: ${baseRef})`);
