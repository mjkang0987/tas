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

        --danger-color: #c93a30;
        --danger-bg: #fef2f2;
        --danger-border: #fecaca;
        --warning-color: #EA4335;
        --warning-bg: #FCE8E6;
        --warning-border: #f5c6c2;
        --success-color: #24753a;
        --caution-color: #a88417;

        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;

        --gap-xs: 4px;
        --gap-sm: 6px;
        --gap-md: 8px;
        --gap-lg: 10px;

        --dot-size: 10px;

        --bar-top: 56px;
    }

    html,
    body {
        padding: 0;
        margin: 0;
        height: 100%;
    }

    body {
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
    }

    button,
    a {
        cursor: pointer;

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

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes asideHide {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-100%);
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
