import {createGlobalStyle} from 'styled-components';

export const GlobalStyle = createGlobalStyle`
    :root {
        --big-font: 18px;
        --font: 14px;
        --small-font: 12px;
        --xsmall-font: 11px;
        --tiny-font: 10px;

        --black-color: hsl(0, 0%, 13%);
        --black-color-10: hsla(0, 0%, 0%, .03);
        --gray-color: hsl(0, 0%, 86%);
        --gray-color2: hsl(0, 0%, 96%);
        --dark-gray-color: hsl(0, 0%, 32%);
        --dark-gray-color2: hsl(0, 0%, 65%);
        --light-gray-color: hsl(0, 0%, 89%);
        --white-color: hsl(0, 0%, 100%);
        --blue-color: hsl(196, 100%, 45%);
        --orange-color: hsl(27, 100%, 50%);

        --white-color-80: hsla(0, 0%, 100%, .8);
        --white-color-60: hsla(0, 0%, 100%, .6);
        --white-color-40: hsla(0, 0%, 100%, .4);

        --brand-color: #6526d9;

        --danger-color: #c93a30;
        --danger-bg: #fef2f2;
        --danger-border: #fecaca;
        --warning-color: #EA4335;
        --warning-bg: #FCE8E6;
        --warning-border: #f5c6c2;
        --warning-text: #92400E;
        --warning-bg-soft: #FEF3C7;
        --warning-border-soft: #FCD34D;
        --success-color: #24753a;
        --success-text: #15803d;
        --success-bg: rgba(34, 197, 94, 0.12);
        --success-border: rgba(34, 197, 94, 0.2);
        --caution-color: #a88417;

        --neutral-text: #475569;
        --neutral-bg: rgba(241, 245, 249, 0.92);
        --neutral-border: rgba(203, 213, 225, 0.95);

        --info-color: #2d7ff9;
        --info-bg: rgba(45, 127, 249, 0.1);
        --info-border: rgba(45, 127, 249, 0.2);

        --naver-color: #2DB400;
        --naver-color-dark: #269900;

        --new-customer-bg: #ffd651;
        --unassigned-color: #8E8E93;

        --notification-unread-bg: #f0f8ff;
        --notification-unread-bg-hover: #e3f1fc;
        --notification-text: #111827;

        --toast-bg: #1e293b;
        --link-color-light: #60a5fa;
        --muted-text: #94a3b8;

        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;

        --gap-xs: 4px;
        --gap-sm: 6px;
        --gap-md: 8px;
        --gap-lg: 10px;

        --border-color: hsl(0, 0%, 80%);
        --shadow-sm: 0 1px 4px rgba(0, 0, 0, .08);
        --shadow-md: 0 4px 16px rgba(0, 0, 0, .12);
        --cancelled-color: hsl(220, 9%, 62%);
        --timeline-col: 80px;

        --dot-size: 10px;

        --sticky-backdrop: blur(.8px) saturate(180%);

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
        --modal-header-padding: 4px 8px;
        --modal-header-border: rgba(148, 163, 184, 0.18);
        --modal-body-padding: 8px 6px 30px;
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
    }

    @media (max-width: 640px) {
        :root {
            --timeline-col: 56px;
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

    body,
    input,
    button {
        font-family: "SF Pro AR", "SF Pro Gulf", "SF Pro Display", "SF Pro Icons", "Helvetica Neue", "Helvetica", "Arial", sans-serif
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

    @keyframes down {
        0% {
            transform: translateY(var(--bar-top));
        }

        100% {
            transform: translateY(var(--timeline-height));
        }
    }
`;
