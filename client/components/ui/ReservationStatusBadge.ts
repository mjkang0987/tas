import styled from 'styled-components';

import {RESERVATION_STATUS_BADGE_STYLES, RESERVATION_STATUS_BADGE_STYLES_DARK} from '../../utils/reservations';

export const ReservationStatusBadge = styled.span<{ $type: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
    background-color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.color || '#666666'};

    /* 어두운 화면 — 밝은 파스텔을 그대로 두면 어두운 바탕에 흰 덩어리가 박힌다 */
    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) & {
            background-color: ${(props) => RESERVATION_STATUS_BADGE_STYLES_DARK[props.$type]?.bg || '#3A3A3C'};
            color: ${(props) => RESERVATION_STATUS_BADGE_STYLES_DARK[props.$type]?.color || '#D1D1D6'};
        }
    }
`;
