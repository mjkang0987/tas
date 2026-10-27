import {createGlobalStyle} from 'styled-components';
import {FONT_STACK} from './fontStack';

export const GlobalStyle = createGlobalStyle`
    :root {
        /* 본문 스케일 — 10·11·12·13·14·16·18. 이 밖의 값은 쓰지 않는다. */
        --big-font: 18px;
        --large-font: 16px;
        --font: 14px;
        /* 14와 12 사이 단계. 이미 설정·매출 화면 34곳에서 쓰이던 값을 토큰화한 것. */
        --medium-font: 13px;
        --small-font: 12px;
        --xsmall-font: 11px;
        --tiny-font: 10px;
        /* 디스플레이 스케일 — 페이지 타이틀·상태 아이콘 등 본문 밖의 큰 글자. */
        --display-sm: 24px;
        --display-md: 32px;
        --display-lg: 64px;

        --black-color: hsl(0, 0%, 13%);
        --black-color-10: hsla(0, 0%, 0%, .03);
        --gray-color: hsl(0, 0%, 86%);
        --gray-color2: hsl(0, 0%, 96%);
        --dark-gray-color: hsl(0, 0%, 32%);
        --dark-gray-color2: hsl(0, 0%, 43%); /* 흰 5.1 · 옅은 회색(#F7F7F7) 4.8 — 45% 는 회색 바탕에서 4.43 */
        --light-gray-color: hsl(0, 0%, 89%);
        /* 매출 추이 막대 hover — 막대(--brand-color)에서 채도만 낮춘 톤 */
        --trend-bar-hover: hsl(261, 40%, 60%);
        --white-color: hsl(0, 0%, 100%);
        --blue-color: hsl(196, 100%, 32%); /* 글자로 많이 써서 흰 바탕 4.5:1 이상(예전 45% 는 2.7) */
        --orange-color: hsl(27, 100%, 50%);

        --white-color-80: hsla(0, 0%, 100%, .8);
        --white-color-60: hsla(0, 0%, 100%, .6);
        --white-color-40: hsla(0, 0%, 100%, .4);

        --brand-color: #6526d9;
        --brand-color-bg: rgba(101, 38, 217, 0.08);
        --brand-color-border: rgba(101, 38, 217, 0.2);

        --danger-color: #c93a30;
        --danger-bg: #fef2f2;
        --danger-border: #fecaca;
        --warning-color: #C5221F; /* 흰 바탕 5.8:1(예전 #EA4335 3.9) — 노쇼 문구·버튼 */
        --warning-bg: #FCE8E6;
        --warning-border: #f5c6c2;
        --warning-text: #92400E;
        --warning-bg-soft: #FEF3C7;
        --warning-border-soft: #FCD34D;
        --success-color: #24753a;
        --success-text: #15803d;
        --success-bg: rgba(34, 197, 94, 0.12);
        --success-border: rgba(34, 197, 94, 0.2);
        --caution-color: #806600;

        /* 캘린더 휴무 배경 — 시간축 눈금선이 비쳐야 하므로 반투명이다(불투명 색은 선을 덮는다).
           임시 휴업일은 오너가 직접 찍은 날이라 눈에 띄게(적색), 정기 휴무는 매주 반복이라 가라앉힌다(회색). */
        --closed-date-bg: rgba(201, 58, 48, .07);
        --closed-weekday-bg: rgba(0, 0, 0, .05);

        --neutral-text: #475569;
        --neutral-bg: rgba(241, 245, 249, 0.92);
        --neutral-border: rgba(203, 213, 225, 0.95);

        --info-color: #1660cc; /* 연한 info 배경 위 글자 대비 4.5 이상(예전 #2d7ff9 는 3.4) */
        --info-bg: rgba(45, 127, 249, 0.1);
        --info-border: rgba(45, 127, 249, 0.2);

        /* 흰 글자를 얹는 배지 바탕이라 대비 4.5 이상으로(예전 #2DB400 은 2.8). 로고·네이버 로그인 버튼은 브랜드 규정 색(#03C75A) 그대로. */
        --naver-color: #208200;
        --naver-color-dark: #1A6B00;
        /* 네이버 바로가기 글자 — 흰 바탕 4.5 이상(브랜드 #03C75A 는 2.3) */
        --naver-link: #00803C;

        /* 신규 고객 배지 — iOS Badges.swift 의 NewCustomerBadge 와 같은 값(#00A896, 바탕 15%). */
        --new-customer-color: #00A896;
        --new-customer-bg: rgba(0, 168, 150, .15);
        --unassigned-color: #8E8E93;

        --notification-unread-bg: #f0f8ff;
        --notification-unread-bg-hover: #e3f1fc;
        --notification-text: #111827;

        --toast-bg: #1e293b;
        --link-color-light: #60a5fa;
        /* 누르면 다른 레이어로 가는 이름(고객명 등) — 흰 바탕 5.3:1 */
        --link-color: #1967D2;
        --muted-text: #64748b;

        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;

        --gap-xs: 4px;
        --gap-sm: 6px;
        --gap-md: 8px;
        --gap-lg: 10px;

        --border-color: hsl(0, 0%, 80%);
        /* 달력 눈금선·칼럼 구분선 — 내용보다 뒤로 물러나야 해서 테두리색보다 흐리다. */
        --calendar-grid-line: hsl(0, 0%, 96%);
        --shadow-sm: 0 1px 4px rgba(0, 0, 0, .08);
        --shadow-md: 0 4px 16px rgba(0, 0, 0, .12);
        --cancelled-color: hsl(220, 9%, 62%);
        /* 눈금은 정시 두 자리뿐이다(TimelineTitle) — 모바일과 같은 폭으로 둔다. */
        --timeline-col: 44px;

        --dot-size: 10px;

        --sticky-backdrop: blur(.8px) saturate(180%);

        /* 떠 보이는 표면(모바일 하단 탭바). 알약 반경은 기존 --chip-radius,
           테두리는 기존 --white-color-60 을 쓴다 — 같은 값의 토큰을 새로 만들지 않는다. */
        --glass-bg: rgba(255, 255, 255, .72);

        --bar-top: 56px;

        --aside-width: 200px;
        --aside-bg: #1c1c1e;
        --aside-text: #f5f5f7;
        --aside-hover: rgba(255, 255, 255, 0.08);
        --aside-divider: rgba(255, 255, 255, 0.12);

        --overlay-padding: 14px;
        --overlay-backdrop-blur: .7px;

        --modal-radius: 10px;
        --modal-radius-mobile: 12px;
        --modal-border: rgba(148, 163, 184, 0.22);
        --modal-shadow: 0 24px 60px rgba(15, 23, 42, 0.18),
        0 6px 18px rgba(15, 23, 42, 0.08);

        --modal-header-gap: 10px;
        --modal-header-padding: 8px 14px;
        --modal-header-border: rgba(148, 163, 184, 0.18);
        --modal-body-padding: 12px 14px 24px;
        --modal-content-padding: 12px;
        --modal-footer-gap: 6px;
        --modal-footer-padding: 10px 14px 14px;
        --modal-footer-border: rgba(148, 163, 184, 0.16);

        --modal-title-font: 16px;
        --modal-subtitle-font: 12px;
        --modal-message-font: 14px;
        --modal-message-margin: 0 0 10px;

        --modal-button-height: 32px;
        --modal-button-padding-x: 12px;
        --modal-button-radius: 8px;
        --modal-button-font: 13px;

        --info-grid-gap: 8px;
        --info-grid-cell-gap: 8px;
        --info-grid-cell-padding: 8px 10px;
        --info-grid-cell-radius: 10px;

        --list-gap: 10px;
        --list-padding-x: 8px;
        --card-gap: 12px;
        --card-padding: 8px;
        --card-radius: 8px;
        --card-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
        --card-shadow-hover: 0 14px 26px rgba(15, 23, 42, 0.08);
        --chip-padding: 4px 8px;
        --chip-radius: 999px;
        --bg-subtle: rgba(248, 250, 252, 0.6);
        --bg-subtle-72: rgba(248, 250, 252, 0.72);
        --bg-subtle-78: rgba(248, 250, 252, 0.78);
        --bg-subtle-88: rgba(248, 250, 252, 0.88);
        --bg-subtle-92: rgba(248, 250, 252, 0.92);
        --bg-subtle-96: rgba(248, 250, 252, 0.96);
        --bg-subtle-98: rgba(248, 250, 252, 0.98);
        --bg-subtle-90: rgba(248, 250, 252, 0.9);
        --neutral-chip-bg: rgba(241, 245, 249, 0.92);
        --info-grid-border: rgba(226, 232, 240, 0.9);

        /* 바탕(카드·레이어·입력칸) — 예전엔 --white-color 가 바탕과 '색 채움 위 흰 글자' 두 뜻이었다.
           어두운 화면에서 바탕만 어두워져야 해서 나눴다. --white-color 는 이제 흰 글자 전용. */
        --surface-color: hsl(0, 0%, 100%);
        /* 바탕을 반투명·그라데이션으로 쓰는 곳용 — rgba(var(--surface-rgb), .96) */
        --surface-rgb: 255, 255, 255;
        /* 검정 바탕 + 흰 글자(말풍선·선택된 검정 칩) — 어두운 화면에선 뒤집는다. */
        --inverse-bg: hsl(0, 0%, 13%);
        --inverse-text: hsl(0, 0%, 100%);
        /* 흰 글자를 얹는 채움 — 모드와 상관없이 같은 색(흰 글자 4.5:1 이상).
           같은 이름의 --*-color 는 '글자색'이라 어두운 화면에서 밝아진다. */
        --brand-fill: #6526d9;
        --danger-fill: #c93a30;
        --warning-fill: #C5221F;
        --success-fill: #24753a;
        --blue-fill: hsl(196, 100%, 32%);
        --caution-fill: #806600;
        --orange-fill: hsl(27, 100%, 50%);
        --naver-fill: #208200;
    }

    /* 어두운 화면 — 시스템 설정을 따른다. 값은 iOS Theme.swift·안드로이드와 같다(글자 7:1 이상, 배지 바탕이 카드와 구분).
       고객 공개 예약·정책 화면은 html[data-theme="light"] 로 밝게 고정한다(손님 화면). */
    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) {
            color-scheme: dark;

            --black-color: #F5F5F7;
            --black-color-10: rgba(255, 255, 255, .06);
            --gray-color: #48484A;
            --gray-color2: #2C2C2E;
            --dark-gray-color: #D1D1D6;
            --dark-gray-color2: #AEAEB2;
            --light-gray-color: #3A3A3C;
            /* 밝아진 막대(#A57BFF)보다 더 밝게 — 선택 칸 바탕 5.3:1 */
            --trend-bar-hover: hsl(261, 40%, 78%);
            --border-color: #545458;
            --calendar-grid-line: #2C2C2E;
            --surface-color: #1C1C1E;
            --surface-rgb: 28, 28, 30;
            --inverse-bg: #F5F5F7;
            --inverse-text: #1C1C1E;

            --white-color-80: rgba(28, 28, 30, .8);
            --white-color-60: rgba(28, 28, 30, .6);
            --white-color-40: rgba(28, 28, 30, .4);
            --glass-bg: rgba(28, 28, 30, .72);

            --blue-color: #7FD4F0;
            --brand-color: #A57BFF;
            --brand-color-bg: rgba(165, 123, 255, .16);
            --brand-color-border: rgba(165, 123, 255, .35);

            --danger-color: #FF8A80;
            --danger-bg: rgba(201, 58, 48, .22);
            --danger-border: rgba(255, 138, 128, .4);
            --warning-color: #FFA19A;
            --warning-bg: rgba(197, 34, 31, .24);
            --warning-border: rgba(255, 161, 154, .4);
            --warning-text: #FDE68A;
            --warning-bg-soft: rgba(253, 230, 138, .16);
            --warning-border-soft: rgba(253, 230, 138, .4);
            --success-color: #A8DAB5;
            --success-text: #A8DAB5;
            --success-bg: rgba(34, 197, 94, .2);
            --success-border: rgba(34, 197, 94, .35);
            --caution-color: #F6D860;

            --closed-date-bg: rgba(255, 138, 128, .1);
            --closed-weekday-bg: rgba(255, 255, 255, .05);

            --neutral-text: #C7CDD6;
            --neutral-bg: rgba(255, 255, 255, .08);
            --neutral-border: rgba(255, 255, 255, .18);

            --info-color: #AECBFA;
            --info-bg: rgba(45, 127, 249, .22);
            --info-border: rgba(45, 127, 249, .4);

            --naver-color: #8FD86E;
            --naver-link: #8FD86E;
            --new-customer-color: #8EE6DA;
            --new-customer-bg: rgba(0, 168, 150, .25);

            --notification-unread-bg: rgba(45, 127, 249, .14);
            --notification-unread-bg-hover: rgba(45, 127, 249, .22);
            --notification-text: #F5F5F7;
            --toast-bg: #2C2C2E;
            --muted-text: #AEAEB2;
            --link-color: #AECBFA;

            --shadow-sm: 0 1px 4px rgba(0, 0, 0, .5);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, .6);
            --card-shadow: 0 8px 18px rgba(0, 0, 0, .35);
            --card-shadow-hover: 0 14px 26px rgba(0, 0, 0, .45);
            --modal-border: rgba(255, 255, 255, .12);
            --modal-header-border: rgba(255, 255, 255, .1);
            --modal-footer-border: rgba(255, 255, 255, .1);
            --bg-subtle: rgba(44, 44, 46, .6);
            --bg-subtle-72: rgba(44, 44, 46, .72);
            --bg-subtle-78: rgba(44, 44, 46, .78);
            --bg-subtle-88: rgba(44, 44, 46, .88);
            --bg-subtle-92: rgba(44, 44, 46, .92);
            --bg-subtle-96: rgba(44, 44, 46, .96);
            --bg-subtle-98: rgba(44, 44, 46, .98);
            --bg-subtle-90: rgba(44, 44, 46, .9);
            --neutral-chip-bg: rgba(255, 255, 255, .08);
            --info-grid-border: rgba(255, 255, 255, .12);
        }
    }

    @media (max-width: 640px) {
        :root {
            /* 주 뷰 하루 칸 폭. 7등분(한 칸 47px)이면 세 글자 이름부터 말줄임돼,
               읽히는 폭을 먼저 주고 가로로 스크롤한다. */
            --week-col: 64px;
            --modal-button-height: 30px;
            --modal-button-padding-x: 10px;
            --modal-button-radius: 7px;
        }
    }

    html,
    body {
        padding: 0;
        margin: 0;
        height: 100%;
    }

    :root {
        /* 기본 입력칸·날짜 고르기·스크롤바도 테마를 따른다 */
        color-scheme: light dark;
    }

    :root[data-theme="light"] {
        color-scheme: light;
    }

    body {
        background: var(--surface-color);
        color: var(--black-color);
    }

    body,
    input,
    button,
    textarea,
    select {
        font-family: ${FONT_STACK};
    }

    #__next {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    h1,
    h2,
    div,
    p,
    a,
    button,
    aside,
    main,
    header,
    footer,
    section,
    article,
    ul,
    ol,
    dl,
    dt,
    dd,
    li {
        margin: 0;
        padding: 0;
    }

    li {
        list-style: none;
    }

    button,
    input,
    a {
        font-size: var(--font);
        color: var(--black-color);
        box-sizing: border-box;
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                opacity: .8;
            }
        }
    }

    button,
    a {
        &:active {
            opacity: .6;
        }
    }

    a {
        text-decoration: none;
    }

    input {
        width: 100%;
    }

    /* 체크박스·라디오는 위 input{width:100%} 대상에서 제외하고, 폰트에 맞춰 키운다. */
    input[type="checkbox"],
    input[type="radio"] {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin: 0;
        accent-color: var(--brand-color);
        cursor: pointer;
    }

    .a11y {
        overflow: hidden;
        position: absolute;
        border: 0;
        margin: -1px;
        width: 1px;
        height: 1px;
        clip: rect(1px, 1px, 1px, 1px);
        clip-path: inset(50%);
    }

    [id*="customer-detail-layer"] {
        ~ [id*="reservation-detail-layer"] {
            z-index: 150;
        }
    }

    [id*="reservation-detail-layer"] {
        ~ [id*="customer-detail-layer"] {
            z-index: 140;
        }
    }

    [id*="revenue-metric-layer"] {
        ~ [id*="reservation-detail-layer"] {
            z-index: 190;
        }

        ~ [id*="customer-detail-layer"] {
            z-index: 190;
        }
    }

    [id*="revenue-daily"] {
        ~ [id*="reservation-detail-layer"] {
            z-index: 170;
        }
    }

    [id*="naver-sync-conflict-layer"] {
        ~ [id*="reservation-detail-layer"] {
            z-index: 150;

            ~ [id*="customer-detail-layer-1"] {
                z-index: 151;
            }
        }
    }

    [id*="notification-modal"] {
        ~ [id*="naver-sync-conflict-layer"] {
            z-index: 121;
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;
