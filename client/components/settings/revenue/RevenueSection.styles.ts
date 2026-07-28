import styled from 'styled-components';

import {cardSurfaceStyle} from '../settings-styles';
export const StyledDashboard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
`;

export const StyledDailyCard = styled.div`
    padding: 10px;
    ${cardSurfaceStyle};
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
`;

