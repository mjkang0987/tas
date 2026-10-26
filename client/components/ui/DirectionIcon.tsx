/** size: 뷰박스는 32 고정이라 비율은 그대로다. 호출부가 CSS 태그 선택자로 svg 를 집지 않도록 prop 으로 받는다. */
export const DirectionIcon = ({direction, size = 32}: {direction: 'left' | 'right'; size?: number}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        {/* 테두리 사각형은 아이콘이 아니라 버튼 모양이었다. 버튼 쪽에서 정하도록 걷는다. */}
        <path
            d={direction === 'left' ? 'M18.5 10.5L13 16L18.5 21.5' : 'M13.5 10.5L19 16L13.5 21.5'}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
