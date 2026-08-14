import {useEffect, useRef} from 'react';
import styled, {keyframes} from 'styled-components';

/**
 * 로딩 중 **테두리를 따라 걸어 다니는** 공룡.
 *
 * `clipnote`(웹·iOS)의 `RunningDino` 이식. 도트·움직임·수치를 그대로 옮겨 세 곳이 같은 장면을
 * 보여 준다(4프레임 47×45 스프라이트, `public/dino-run.png`).
 *
 * ## 왜 이런 모양인가
 *
 * - **안쪽에서 벽을 밟는다.** 바깥에 세우면 상자 밖으로 나가는 만큼이 잘린다. 대신 천장
 *   면에서는 거꾸로 매달려 걷는다.
 * - **네 면을 모두 걷는다.** 끊기는 구간이 없어 한 바퀴가 이어진다.
 * - **출발점은 매번 다르다.** 늘 같은 자리에서 나오면 두 번째부터는 그냥 배경이 된다.
 * - **코너는 점프로 돈다.** 앞뒤 30px를 하나의 도약으로 묶어 각도를 나눠 돌린다. 즉시 꺾으면
 *   걷다가 몸만 홱 돌아가 순간이동처럼 보인다.
 * - **속도와 한 바퀴 시간을 둘 다 건다.** 속도만 고정하면 큰 창에서 한 바퀴가 10초씩 걸려
 *   모서리에서 꿈틀대고, 시간만 고정하면 작은 창에서 총알이 된다.
 * - **프레임은 시간이 아니라 걸은 거리로 넘긴다.** 시간 기준이면 빨리 달릴수록 다리가 헛돈다.
 *
 * ## JS가 붙기 전에도 보여야 한다
 *
 * 이 공룡이 뜨는 가장 긴 대기는 **부팅 오버레이**(`_app.tsx`)인데, 그 시점은 번들을 받아
 * 하이드레이션하는 중이라 정작 effect가 아직 안 돈다. 그래서 바닥 왕복을 CSS로 깔아 두고
 * (`patrol`·`step`), effect가 뜨면 **애니메이션을 끄고** 네 면 걷기를 이어받는다.
 * 끄지 않으면 소용이 없다 — 실행 중인 CSS 애니메이션은 인라인 `transform`보다 우선한다.
 *
 * 상자는 `absolute inset: 0`이라 **부모(오버레이)의 안쪽**을 그대로 쓴다. 뷰포트 단위를 쓰면
 * `backdrop="blur"`처럼 오버레이에 패딩이 있는 경우 바닥이 상자 밖으로 나간다.
 */

const FRAME_COUNT = 4;
/** 원본 도트 크기(px). 스프라이트가 이 크기로 가로 4칸이다. */
const SPRITE_W = 47;
const SPRITE_H = 45;
/** 그려질 높이(px)와 그에 맞춘 폭. */
const HEIGHT = 34;
const WIDTH = (HEIGHT * SPRITE_W) / SPRITE_H;
/** 네 프레임을 한 번 도는 데 걷는 거리(px). */
const STRIDE = 36;
/** 목표 속도(px/초)와 한 바퀴 시간의 상·하한(초). 둘 다 걸어야 창 크기에 안 휘둘린다. */
const TARGET_SPEED = 110;
const LAP_MIN = 3;
const LAP_MAX = 24;
/** 코너를 넘는 동안 지나가는 거리(px)와 도약 높이(px). */
const TURN_SPAN = 30;
const JUMP = 12;
/** 뛰는 동안 고정할 프레임(0부터). 다리가 벌어진 자세라 도약으로 읽힌다. */
const LEAP_FRAME = 1;
/** 반시계로 도는 네 면 — 오른쪽 → 위 → 왼쪽 → 아래. (0=위 1=오른쪽 2=아래 3=왼쪽) */
const ROUTE = [1, 0, 3, 2];
/** CSS 왕복 한 바퀴(초)와 프레임 전환 주기(초). */
const CSS_LAP = 14;
const CSS_STEP = 0.48;

type Spot = {x: number; y: number; angle: number; frame: number};
type Vector = {x: number; y: number};

function sideLength(side: number, w: number, h: number): number {
    return side % 2 === 0 ? w : h;
}

/** 면 위 `distance` 지점. **반시계**로 훑는다(위는 오른쪽에서 왼쪽으로). */
function edgePoint(side: number, distance: number, w: number, h: number): Vector {
    if (side === 0) return {x: w - distance, y: 0};
    if (side === 1) return {x: w, y: h - distance};
    if (side === 2) return {x: distance, y: h};
    return {x: 0, y: distance};
}

/** 그 벽의 안쪽 방향. 공룡은 상자 안에 서서 벽을 밟는다. */
function inward(side: number): Vector {
    if (side === 0) return {x: 0, y: 1};
    if (side === 1) return {x: -1, y: 0};
    if (side === 2) return {x: 0, y: -1};
    return {x: 1, y: 0};
}

/** 그 거리에서 **걸어가고 있을 때**의 자리와 각도. */
function standing(distance: number, lengths: number[], w: number, h: number) {
    // 한 바퀴가 이어지므로 거리도 감싼다 — 마지막 모서리의 도약이 총 둘레를 넘어선 지점을
    // 묻기 때문이다.
    const total = lengths.reduce((sum, n) => sum + n, 0);
    let walked = ((distance % total) + total) % total;
    let index = 0;
    while (index < lengths.length - 1 && walked >= lengths[index]) {
        walked -= lengths[index];
        index += 1;
    }
    const side = ROUTE[index];
    const edge = edgePoint(side, Math.min(walked, lengths[index]), w, h);
    const into = inward(side);
    // 발이 벽에 닿도록 중심을 안쪽으로 반 칸 민다. 스프라이트는 아랫변이 곧 발바닥이다.
    const standoff = HEIGHT / 2;
    return {
        x: edge.x + into.x * standoff,
        y: edge.y + into.y * standoff,
        // 180°를 더해 발이 바깥(벽)을 향하게 한다. 천장 면에서는 거꾸로 매달린다.
        angle: side * 90 + 180,
    };
}

/** 코너를 넘는 동작. 코너 근처가 아니면 null. */
function turning(
    distance: number,
    lengths: number[],
    w: number,
    h: number,
): Omit<Spot, 'frame'> | null {
    // 짧은 면에서 도약 구간이 면보다 길면 앞뒤 코너가 겹친다.
    const span = Math.min(TURN_SPAN, Math.min(...lengths));
    if (span <= 0) return null;

    const total = lengths.reduce((sum, n) => sum + n, 0);
    let corner = 0;
    for (let i = 0; i < lengths.length; i++) {
        corner += lengths[i];
        // 마지막 모서리는 출발선과 같은 자리다. 갓 출발한 지점(거리가 0 근처)도 그 도약의
        // 뒷부분이므로 한 바퀴를 더해 함께 본다 — 이걸 빼면 거기서만 각도가 툭 꺾인다.
        let entered = distance - (corner - span / 2);
        if (entered < 0 && i === lengths.length - 1) {
            entered = distance + total - (corner - span / 2);
        }
        if (entered < 0 || entered > span) continue;

        const p = entered / span;
        const before = standing(corner - span / 2, lengths, w, h);
        const after = standing(corner + span / 2, lengths, w, h);
        // 두 벽의 안쪽 방향을 합치면 코너에서 상자 안을 향하는 대각선이 된다.
        const a = inward(ROUTE[i]);
        const b = inward(ROUTE[(i + 1) % ROUTE.length]);
        const len = Math.hypot(a.x + b.x, a.y + b.y) || 1;
        const height = Math.sin(p * Math.PI) * JUMP;
        return {
            x: before.x + (after.x - before.x) * p + ((a.x + b.x) / len) * height,
            y: before.y + (after.y - before.y) * p + ((a.y + b.y) / len) * height,
            // 반시계로 도니 각도는 항상 90° 줄어든다.
            angle: before.angle - 90 * p,
        };
    }
    return null;
}

function spotAt(elapsed: number, offset: number, w: number, h: number): Spot | null {
    const lengths = ROUTE.map((side) => sideLength(side, w, h));
    const total = lengths.reduce((sum, n) => sum + n, 0);
    if (total <= 0) return null;

    const lap = Math.min(Math.max(total / TARGET_SPEED, LAP_MIN), LAP_MAX);
    const progress = (((elapsed / lap + offset) % 1) + 1) % 1;
    const distance = total * progress;

    const turn = turning(distance, lengths, w, h);
    if (turn) return {...turn, frame: LEAP_FRAME};
    return {
        ...standing(distance, lengths, w, h),
        frame: Math.floor(distance / (STRIDE / FRAME_COUNT)) % FRAME_COUNT,
    };
}

export function RunningDino() {
    const box = useRef<HTMLDivElement>(null);
    const dino = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const frame = box.current;
        const sprite = dino.current;
        if (!frame || !sprite) return;

        // CSS 기본 동작(바닥 왕복)을 끄고 좌표를 직접 잡는다. 끄지 않으면 소용이 없다 —
        // 실행 중인 CSS 애니메이션이 인라인 스타일보다 우선해서 아래 transform을 계속 덮는다.
        // 기준점도 바닥(bottom)에서 상자 왼쪽 위(top)로 옮긴다 — spotAt이 그 기준으로 센다.
        sprite.style.animation = 'none';
        sprite.style.bottom = 'auto';
        sprite.style.top = '0';

        // 상자 크기는 **매 프레임 재지 않는다.** 크기를 읽으면 브라우저가 레이아웃을 강제로
        // 계산하는데, 바로 다음 줄에서 `transform`을 쓰므로 초당 60번 읽기-쓰기가 엇갈린다
        // (레이아웃 스래싱). 창이 바뀔 때만 다시 잰다.
        let width = frame.clientWidth;
        let height = frame.clientHeight;
        const observer = new ResizeObserver(([entry]) => {
            width = entry.contentRect.width;
            height = entry.contentRect.height;
        });
        observer.observe(frame);

        // **React 상태로 그리지 않는다.** 좌표가 초당 60번 바뀌는데 그때마다 리렌더하면
        // 장식 하나 때문에 화면 전체가 다시 그려진다. DOM을 직접 만진다.
        const draw = (elapsed: number) => {
            const spot = spotAt(elapsed, offset, width, height);
            if (!spot) return;
            sprite.style.backgroundPosition = `-${spot.frame * WIDTH}px 0`;
            sprite.style.transform =
                `translate(${spot.x - WIDTH / 2}px, ${spot.y - HEIGHT / 2}px) rotate(${spot.angle}deg)`;
        };

        // 출발점은 마운트 때 한 번만 뽑는다. 매 프레임 뽑으면 순간이동한다.
        const offset = Math.random();

        // 동작 줄이기가 켜져 있으면 움직이지 않는다 — 전정기관 장애가 있는 사용자에게 화면을
        // 가로지르는 반복 운동은 불편을 준다. 세워는 두되 걷지 않는다.
        // `matchMedia?.`는 저장소의 기존 표기를 따른다(`pages/book/[slug].tsx`) — 이 API가 없는
        // 환경에서 터지지 않게 한다.
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            draw(0);
            return () => observer.disconnect();
        }

        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            draw((now - start) / 1000);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, []);

    return (
        <StyledBox ref={box} aria-hidden>
            <StyledSprite ref={dino} />
        </StyledBox>
    );
}

/** JS가 아직 안 돌 때의 기본 동작 — 바닥을 좌우로 왕복한다. */
const patrol = keyframes`
    0% { left: 0; transform: scaleX(1); }
    48% { left: calc(100% - ${WIDTH}px); transform: scaleX(1); }
    /* 끝에서 몸을 돌린다. 안 돌리면 뒤로 미끄러지는 것처럼 보인다. */
    50% { left: calc(100% - ${WIDTH}px); transform: scaleX(-1); }
    98% { left: 0; transform: scaleX(-1); }
    100% { left: 0; transform: scaleX(1); }
`;

/** 스프라이트를 가로 4칸으로 늘려 두고 한 칸씩 민다. */
const step = keyframes`
    to { background-position-x: -${WIDTH * FRAME_COUNT}px; }
`;

const StyledBox = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
`;

const StyledSprite = styled.span`
    position: absolute;
    left: 0;
    bottom: 0;
    display: block;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background-image: url('/dino-run.png');
    background-size: ${WIDTH * FRAME_COUNT}px ${HEIGHT}px;
    /* 없으면 47px 도트를 34px로 줄일 때 브라우저가 뭉갠다. */
    image-rendering: pixelated;
    animation:
        ${patrol} ${CSS_LAP}s linear infinite,
        ${step} ${CSS_STEP}s steps(${FRAME_COUNT}) infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;
