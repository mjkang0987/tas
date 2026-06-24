#!/usr/bin/env node
/**
 * 예약 종료시간(endTime) 재계산 스크립트
 *
 * 배경: 예약의 endTime 은 생성 시점에 "startTime + 서비스 duration 합"으로 계산해
 *       저장된다. 이후 서비스 duration 을 바꿔도 기존 예약 endTime 은 갱신되지 않는다.
 *       이 스크립트는 현재 서비스 카탈로그(매장별) 기준으로 endTime 을 다시 계산한다.
 *
 * 대상: status='active' AND paymentCompleted=false 인 예약, 전체 매장.
 *       (완료/결제완료 건은 기록 보존을 위해 제외)
 *
 * 사용법:
 *   node scripts/recalc-reservation-endtimes.mjs            # dry-run (미리보기만, DB 미변경)
 *   node scripts/recalc-reservation-endtimes.mjs --apply    # 실제 DB 반영
 *
 * 연결: DIRECT_URL(없으면 DATABASE_URL). client/.env(.local) 로드.
 */

import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// client 패키지 컨텍스트로 의존성 로드 (seed.mjs 와 동일 패턴, Prisma 7 driver adapter 필수)
const require = createRequire(new URL('../client/package.json', import.meta.url));
// .env 우선순위: .env.local > .env
require('dotenv').config({path: path.resolve(__dirname, '../client/.env')});
require('dotenv').config({path: path.resolve(__dirname, '../client/.env.local'), override: true});

const {PrismaPg} = require('@prisma/adapter-pg');
const {PrismaClient} = await import('../client/prisma/generated/prisma/client.ts');

const APPLY = process.argv.includes('--apply');
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DIRECT_URL / DATABASE_URL 이 설정되어 있지 않습니다 (client/.env).');
    process.exit(1);
}

// ── 접속 대상 표시 + 운영 DB 보호 ───────────────────────────────────────────
// 주의: 이 스크립트는 DIRECT_URL 을 우선 사용한다. .env.local 이 DATABASE_URL 만
//       localhost 로 덮어써도 .env 의 DIRECT_URL(운영)이 그대로 선택될 수 있으니
//       반드시 아래 host 출력을 확인할 것.
const dbHost = (() => {
    try {
        return new URL(connectionString).host;
    } catch {
        return '(파싱 실패)';
    }
})();
const isLocalDb = /^(localhost|127\.0\.0\.1)(:|$)/.test(dbHost);

console.log(`\n🔌 접속 대상 DB: ${dbHost}  ${isLocalDb ? '(로컬)' : '⚠️  운영/원격으로 보임'}`);

if (APPLY && !isLocalDb) {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const answer = await rl.question(
        `\n⚠️  운영/원격 DB(${dbHost})에 실제 변경(--apply)을 적용하려고 합니다.\n   계속하려면 정확히 "APPLY" 를 입력하세요: `,
    );
    rl.close();
    if (answer.trim() !== 'APPLY') {
        console.log('🛑 취소되었습니다. (입력값 불일치)');
        process.exit(1);
    }
}

const prisma = new PrismaClient({adapter: new PrismaPg({connectionString})});

// ── client/features/services/model.ts 에서 이식 ────────────────────────────
// 구 명칭 → 현 명칭 (카탈로그에 현명칭만 있어도 구명칭 예약을 매칭)
const LEGACY_NAME_MAP = {
    '남자 일반펌': '일반펌',
    '남자 디자인펌': '디자인펌',
    '여자 일반펌': '일반펌',
    '여자 디자인펌': '디자인펌',
    '셋팅펌': '디지털/셋팅',
    '남자 매직': '매직',
    '여자 매직': '매직',
    '다운펌+커트': '디자인펌',
    '펌 롤': '일반펌',
    '펌 매직': '매직',
    '뿌리/전체(멋내기)': '전체염색',
    '뿌리/전체(새치)': '뿌리염색',
};

// 매장 서비스 목록 → (name → duration) 맵. LEGACY 별칭도 포함.
function buildDurationMap(services) {
    const map = new Map(services.map((s) => [s.name, s.duration]));
    for (const [legacy, current] of Object.entries(LEGACY_NAME_MAP)) {
        if (map.has(current) && !map.has(legacy)) {
            map.set(legacy, map.get(current));
        }
    }
    return map;
}

// serviceSummary 문자열 → 서비스명 배열 (greedy: '+' 포함 서비스명 보존)
function parseServiceString(str, knownNames) {
    if (!str || !str.trim()) return [];
    const parts = str.split('+').map((s) => s.trim()).filter(Boolean);
    if (!knownNames || parts.length <= 1) return parts;

    const result = [];
    let i = 0;
    while (i < parts.length) {
        let matched = false;
        for (let j = parts.length; j > i + 1; j--) {
            const combined = parts.slice(i, j).join('+');
            if (knownNames.has(combined)) {
                result.push(combined);
                i = j;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result.push(parts[i]);
            i++;
        }
    }
    return result;
}

// 시작시간("HH:MM") + 분 → 종료시간("HH:MM")
function calcEndTime(startTime, durationMinutes) {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
// ───────────────────────────────────────────────────────────────────────────

function fmtDate(d) {
    return new Date(d).toISOString().slice(0, 10);
}

async function main() {
    console.log(`\n🔧 예약 종료시간 재계산 — ${APPLY ? '⚠️  APPLY (실제 DB 반영)' : 'DRY-RUN (미리보기만)'}`);
    console.log(`   대상: status='active' & paymentCompleted=false / 전체 매장\n`);

    const stores = await prisma.store.findMany({select: {id: true, name: true}});

    const changes = [];      // 종료시간이 바뀌는 예약 (모든 서비스 인식 성공)
    const partial = [];      // 일부 서비스만 인식 — duration 부정확 → 자동 변경 안 함(수동 검토)
    const unknown = [];      // duration 합 0 (전부 미인식) — 변경 안 함
    let scanned = 0;

    for (const store of stores) {
        const [services, reservations] = await Promise.all([
            prisma.service.findMany({where: {storeId: store.id}, select: {name: true, duration: true}}),
            prisma.reservation.findMany({
                where: {storeId: store.id, status: 'active', paymentCompleted: false, serviceSummary: {not: ''}},
                select: {id: true, date: true, startTime: true, endTime: true, serviceSummary: true, assigneeId: true},
            }),
        ]);

        const durationMap = buildDurationMap(services);
        const knownNames = new Set(durationMap.keys());

        for (const r of reservations) {
            scanned++;
            const names = parseServiceString(r.serviceSummary, knownNames);
            let total = 0;
            let allKnown = true;
            for (const n of names) {
                if (durationMap.has(n)) total += durationMap.get(n);
                else allKnown = false;
            }

            if (total <= 0) {
                unknown.push({store: store.name, date: fmtDate(r.date), startTime: r.startTime, serviceSummary: r.serviceSummary});
                continue;
            }

            // 일부만 인식되면 duration 합이 부정확(너무 짧음) → 자동 변경 금지, 검토 목록으로
            if (!allKnown) {
                partial.push({
                    store: store.name, id: r.id, date: fmtDate(r.date), startTime: r.startTime,
                    service: r.serviceSummary, oldEnd: r.endTime, recalcEnd: calcEndTime(r.startTime, total),
                });
                continue;
            }

            const newEndTime = calcEndTime(r.startTime, total);
            if (newEndTime !== r.endTime) {
                changes.push({
                    storeId: store.id,
                    store: store.name,
                    id: r.id,
                    date: fmtDate(r.date),
                    assigneeId: r.assigneeId,
                    service: r.serviceSummary,
                    startTime: r.startTime,
                    oldEnd: r.endTime,
                    newEnd: newEndTime,
                });
            }
        }
    }

    // 겹침 감지: 같은 (매장·담당자·날짜) 에서 새 endTime 이 다음 예약 startTime 을 침범
    const changeIds = new Set(changes.map((c) => c.id));
    const effectiveEnd = new Map(changes.map((c) => [c.id, c.newEnd]));
    const overlaps = [];
    // 전체 active+미결제 예약을 다시 모아 그룹핑(변경분은 newEnd 기준)
    const allActive = await prisma.reservation.findMany({
        where: {status: 'active', paymentCompleted: false},
        select: {id: true, storeId: true, assigneeId: true, date: true, startTime: true, endTime: true},
    });
    const groups = new Map();
    for (const r of allActive) {
        const key = `${r.storeId}|${r.assigneeId ?? 'none'}|${fmtDate(r.date)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    }
    for (const list of groups.values()) {
        list.sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < list.length - 1; i++) {
            const cur = list[i];
            const next = list[i + 1];
            const curEnd = effectiveEnd.get(cur.id) ?? cur.endTime;
            if (curEnd > next.startTime) {
                overlaps.push({
                    storeId: cur.storeId,
                    date: fmtDate(cur.date),
                    curId: cur.id,
                    curEnd,
                    changedByScript: changeIds.has(cur.id),
                    nextId: next.id,
                    nextStart: next.startTime,
                });
            }
        }
    }

    // ── 리포트 출력 ──
    console.log(`스캔한 예약: ${scanned}건`);
    console.log(`종료시간 변경 대상(전부 인식): ${changes.length}건`);
    console.log(`일부만 인식(자동 변경 안 함, 수동 검토): ${partial.length}건`);
    console.log(`전부 미인식(변경 안 함): ${unknown.length}건`);
    console.log(`겹침 경고: ${overlaps.length}건\n`);

    if (changes.length) {
        console.log('── 변경 대상 (자동 적용) ──');
        for (const c of changes) {
            console.log(`  [${c.store}] ${c.date} ${c.startTime} ${c.service} : ${c.oldEnd} → ${c.newEnd}`);
        }
        console.log('');
    }
    if (partial.length) {
        console.log('── ⚠️ 일부만 인식 (서비스명 일부가 카탈로그/LEGACY에 없음 → 자동 변경 안 함, 수동 확인) ──');
        for (const p of partial) {
            console.log(`  [${p.store}] ${p.date} ${p.startTime} "${p.service}" : 현재 ${p.oldEnd} (인식분만으론 ${p.recalcEnd})`);
        }
        console.log('');
    }
    if (overlaps.length) {
        console.log('── ⚠️ 겹침 경고 (재계산 후 다음 예약과 시간 충돌 가능) ──');
        for (const o of overlaps) {
            const src = o.changedByScript ? '(이번 변경분)' : '(기존)';
            console.log(`  ${o.date} 예약 endTime ${o.curEnd} ${src} > 다음 예약 시작 ${o.nextStart}`);
        }
        console.log('');
    }
    if (unknown.length) {
        console.log('── 미인식 서비스 (카탈로그/LEGACY 매칭 실패 → 변경 안 함) ──');
        for (const u of unknown) {
            console.log(`  [${u.store}] ${fmtDate(u.date)} ${u.startTime} "${u.serviceSummary}"`);
        }
        console.log('');
    }

    // 미리보기 파일 저장
    const outDir = path.resolve(__dirname, '../');
    const outPath = path.join(outDir, 'recalc-endtimes-preview.json');
    fs.writeFileSync(outPath, JSON.stringify({generatedAt: new Date().toISOString(), apply: APPLY, scanned, changes, partial, overlaps, unknown}, null, 2));
    console.log(`📄 미리보기 저장: ${outPath}`);

    if (!APPLY) {
        console.log('\n✅ DRY-RUN 종료. 실제 반영하려면 --apply 옵션으로 다시 실행하세요.');
        await prisma.$disconnect();
        return;
    }

    // ── 실제 반영 ──
    console.log(`\n⚠️  ${changes.length}건을 실제 업데이트합니다...`);
    let updated = 0;
    for (const c of changes) {
        await prisma.reservation.update({where: {id: c.id}, data: {endTime: c.newEnd}});
        updated++;
    }
    console.log(`✅ 완료: ${updated}건 업데이트됨.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ 실패:', e);
    await prisma.$disconnect();
    process.exit(1);
});
