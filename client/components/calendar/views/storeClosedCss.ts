import {css} from 'styled-components';

import type {StoreClosedKind} from '../../../features/store-settings/model';

// 캘린더의 휴무(임시 휴업일·정기 휴무) 표시 — iOS 앱(`StoreClosedStyle.swift`)과 같은 구분.
//
// **글자가 아니라 배경 틴트로 표시한다.** 월 셀은 날짜·예약 카드가 이미 들어차 있어 배지가 들어갈
// 자리가 없고, 3일/주 뷰의 열은 모바일에서 한 글자씩 세로로 쪼개질 만큼 좁다.
//
// 컴포넌트가 아니라 css 조각인 이유: 붙는 대상이 월 셀 `<li>` 와 타임라인 `<div>` 로 태그·레이아웃이
// 달라, 공용 컴포넌트로 감싸면 기존 그리드·여백·position 기준이 틀어진다. 감싸지 않고 배경만 입힌다.
//
// 색만으로는 스크린리더에 아무것도 전달되지 않으므로, 호출부는 전역 `.a11y` 클래스를 쓴 텍스트를
// 함께 넣는다(`STORE_CLOSED_LABEL`).
//
// 색은 `globalStyle.ts` 의 토큰(`--closed-date-bg`·`--closed-weekday-bg`)이 단일 소스다.
// **반투명이어야 한다** — 시간축 눈금선은 좌측 시간축의 가로 100vw 가상요소가 뒤에서 그리는 것이라,
// 불투명 배경을 깔면 휴무 열에서만 눈금선이 사라진다.
export const storeClosedCss = (kind: StoreClosedKind | null | undefined) => (kind
    ? css`background-color: ${kind === 'date' ? 'var(--closed-date-bg)' : 'var(--closed-weekday-bg)'};`
    : null);
