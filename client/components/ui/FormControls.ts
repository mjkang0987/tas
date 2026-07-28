import styled, {css} from 'styled-components';

export const formControlStyle = css`
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    /* 단축(background)이 아니라 개별 속성 — 단축은 확장 컴포넌트가 얹은 background-image(예: select 화살표)를 리셋한다. */
    background-color: var(--white-color);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

    &:focus {
        border-color: var(--brand-color);
        box-shadow: 0 0 0 3px rgba(101, 38, 217, 0.12);
    }

    &:disabled {
        background-color: var(--gray-color2);
        color: var(--dark-gray-color2);
    }
`;

// 폼 필드 스케일 select(32px). 오너 설정·고객 예약 페이지가 함께 쓰므로 공용 위치에 둔다.
// 치수가 다른 곳은 이걸 styled()로 감싸 덮어쓴다(테두리·포커스·disabled는 재작성 금지).
//
// 화살표: 네이티브 삼각형은 우측 끝에 붙어 나오고 CSS로 위치를 못 옮긴다.
// appearance를 끄고 SVG를 깔아 우측 여백을 확보한다. 감싸는 쪽에서 padding을 단축(padding: 0 Npx)으로
// 다시 쓰면 우측 여백이 날아가 화살표와 글자가 겹치므로, 반드시 4방향(0 30px 0 Npx)으로 쓴다.
export const SELECT_ARROW_INSET = '12px';

export const StyledFieldSelect = styled.select`
    ${formControlStyle};
    color: var(--black-color);
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    padding-right: 30px;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right ${SELECT_ARROW_INSET} center;
`;
