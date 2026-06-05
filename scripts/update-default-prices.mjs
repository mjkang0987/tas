#!/usr/bin/env node
/**
 * 온보딩 기본 서비스 평균가 자동 업데이트 스크립트
 * Claude API (web_search) 로 한국 미용 시술 전국 평균가를 조사해 onboarding.ts 를 갱신합니다.
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ONBOARDING_PATH = path.resolve(__dirname, '../server/api/onboarding.ts');

const PROMPT = `
한국 미용샵 시술 전국 평균 가격을 최신 정보로 조사해 주세요.
숨고, 모두닥, 카카오헤어샵, 네이버 예약 등 국내 플랫폼 기반으로 검색하세요.

아래 시술별 현재 전국 평균 가격(원)을 JSON으로만 반환하세요. 설명 없이 JSON만 출력하세요.

{
  "hair": [
    {"name": "커트", "price": 숫자},
    {"name": "일반펌", "price": 숫자},
    {"name": "볼륨매직", "price": 숫자},
    {"name": "전체염색", "price": 숫자},
    {"name": "부분염색", "price": 숫자},
    {"name": "두피/모발 클리닉", "price": 숫자}
  ],
  "nail": [
    {"name": "손 젤", "price": 숫자},
    {"name": "발 젤", "price": 숫자},
    {"name": "젤 제거", "price": 숫자},
    {"name": "손 케어", "price": 숫자},
    {"name": "발 케어", "price": 숫자},
    {"name": "네일아트", "price": 숫자}
  ],
  "waxing": [
    {"name": "브라질리언", "price": 숫자},
    {"name": "반다리", "price": 숫자},
    {"name": "전체다리", "price": 숫자},
    {"name": "겨드랑이", "price": 숫자},
    {"name": "눈썹", "price": 숫자},
    {"name": "코", "price": 숫자},
    {"name": "인중", "price": 숫자}
  ],
  "lash": [
    {"name": "클래식", "price": 숫자},
    {"name": "볼륨", "price": 숫자},
    {"name": "내추럴", "price": 숫자},
    {"name": "속눈썹 펌", "price": 숫자},
    {"name": "전체 리무브", "price": 숫자},
    {"name": "부분 리무브", "price": 숫자}
  ],
  "skin": [
    {"name": "기본 피부 관리", "price": 숫자},
    {"name": "수분 관리", "price": 숫자},
    {"name": "리프팅", "price": 숫자},
    {"name": "미백/화이트닝", "price": 숫자},
    {"name": "딥 클렌징", "price": 숫자},
    {"name": "풀 케어 패키지", "price": 숫자}
  ]
}
`;

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchUpdatedPrices() {
    const client = new Anthropic();

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools: [{type: 'web_search_20250305', name: 'web_search'}],
        messages: [{role: 'user', content: PROMPT}],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullText += event.delta.text;
        }
        if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens ?? 0;
        }
        if (event.type === 'message_start' && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens ?? 0;
        }
    }

    console.log(`토큰 사용: input=${inputTokens}, output=${outputTokens}`);

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`JSON 파싱 실패:\n${fullText}`);

    return JSON.parse(jsonMatch[0]);
}

function updatePricesInFile(content, prices) {
    let updated = content;

    for (const services of Object.values(prices)) {
        for (const {name, price} of services) {
            if (typeof price !== 'number') continue;
            const regex = new RegExp(
                `(\\{category: '[^']+', name: '${escapeRegex(name)}', duration: \\d+, price: )\\d+`,
                'g',
            );
            updated = updated.replace(regex, `$1${price}`);
        }
    }

    return updated;
}

async function main() {
    console.log(`[${new Date().toISOString()}] 가격 업데이트 시작`);

    const prices = await fetchUpdatedPrices();
    console.log('조회된 가격:', JSON.stringify(prices, null, 2));

    const original = fs.readFileSync(ONBOARDING_PATH, 'utf8');
    const updated = updatePricesInFile(original, prices);

    if (original === updated) {
        console.log('변경 없음 — 파일 업데이트 스킵');
        return;
    }

    fs.writeFileSync(ONBOARDING_PATH, updated, 'utf8');
    console.log(`파일 업데이트 완료: ${ONBOARDING_PATH}`);
}

main().catch((err) => {
    console.error('오류:', err);
    process.exit(1);
});
