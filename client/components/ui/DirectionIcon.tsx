export const DirectionIcon = ({direction}: {direction: 'left' | 'right'}) => (
    <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        {/* 테두리 사각형은 아이콘이 아니라 버튼 모양이었다. 버튼 쪽에서 정하도록 걷는다. */}
        <path
            d={direction === 'left' ? 'M18.5 10.5L13 16L18.5 21.5' : 'M13.5 10.5L19 16L13.5 21.5'}
            stroke="#111827"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
