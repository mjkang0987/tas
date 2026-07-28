import styled, {css} from 'styled-components';

import {StyledFieldSelect} from '../ui/FormControls';

export const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    transition: opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease,
                border-color 0.15s ease, background-color 0.15s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

export const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

export const StyledEditBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color);
`;

export const StyledSaveBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--brand-color);
    background-color: var(--brand-color);
    color: var(--white-color);
`;

export const StyledCancelBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    color: var(--dark-gray-color);
`;

export const StyledDeleteBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--danger-border);
    background: var(--danger-bg);
    font-size: var(--xsmall-font);
    color: var(--danger-color);
`;

// 툴바 스케일 select(30px). actionButtonStyle 버튼과 같은 줄에 놓이므로 높이를 맞춘다.
// 폼 필드 스케일(32px)은 공용 StyledFieldSelect(ui/FormControls) 사용.
export const StyledSelect = styled(StyledFieldSelect)`
    height: 30px;
    padding: 0 30px 0 10px;
    color: var(--dark-gray-color);
`;

// 카드 헤더(제목 옆) 우측에 취소/저장 버튼을 나란히 놓는 래퍼.
// 헤더 안에서는 모바일 stretch(flex:1)를 끄고 내용 크기 유지.
export const StyledHeaderActions = styled.div`
    display: flex;
    gap: 6px;

    & > button {
        flex: 0 0 auto;
    }
`;

// 카드 표면 공통(테두리·모서리·배경·그림자). 설정 화면 박스는 전부 이걸 깔고 padding/레이아웃만 각자 정한다.
// 값을 직접 재작성하면 화면마다 모서리 8/10px, 그림자 유무가 갈린다.
export const cardSurfaceStyle = css`
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

export const StyledSettingsCard = styled.div`
    ${cardSurfaceStyle};
    padding: 16px;
    margin-bottom: 16px;
`;

export const StyledSettingsCardTitle = styled.strong`
    display: block;
    margin: 0 0 12px;
    font-size: var(--large-font);
    font-weight: 700;
    color: var(--dark-gray-color);
`;

export const StyledSettingsHint = styled.p`
    margin: 12px 0 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

export const EMPTY_TEXT = '등록된 데이터가 없습니다';

// 빈 상태 공통. 화면마다 다른 건 여백과 글자 크기뿐이라 $size로 흡수하고,
// 정렬·색·테두리 없음은 여기 한 곳에서만 정한다(각 화면에서 재작성 금지).
// - md(기본): 목록 본문용 · sm: 카드 안쪽·드롭다운처럼 좁은 영역용
export const StyledEmpty = styled.div<{ $size?: 'sm' | 'md' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${(p) => (p.$size === 'sm' ? '20px 12px' : '40px')};
    font-size: ${(p) => (p.$size === 'sm' ? 'var(--small-font)' : 'var(--medium-font)')};
    color: var(--dark-gray-color2);
    text-align: center;
`;

export const StyledEmptyCard = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
    margin: 0;
`;

export const StyledServiceFooter = styled.div`
    padding: 12px 0;
    border-top: 1px solid var(--light-gray-color);
`;
