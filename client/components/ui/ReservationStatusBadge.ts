import styled from 'styled-components';

import {RESERVATION_STATUS_BADGE_STYLES} from '../../utils/reservations';

export const ReservationStatusBadge = styled.span<{ $type: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
    background-color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.color || '#999'};
`;
