import styled from 'styled-components';

/**
 * 글자만 있는 레이어(확인 창 본문 등)에서 꼭 읽혀야 하는 문구.
 * 대상·결과의 핵심은 기본(굵게), 되돌릴 수 없는 결과·데이터 삭제는 `$tone="danger"`(빨강).
 */
export const Emphasis = styled.strong<{$tone?: 'danger'}>`
    font-weight: 700;
    color: ${(p) => p.$tone === 'danger' ? 'var(--danger-color)' : 'var(--black-color)'};
`;
