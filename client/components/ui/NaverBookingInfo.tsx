import styled from 'styled-components';

import type {Reservation} from '../../utils/reservations';
import {LabelBadge} from './LabelBadge';

interface NaverBookingInfoProps {
    reservation: Reservation;
    className?: string;
}

export function NaverBookingInfo({reservation, className}: NaverBookingInfoProps) {
    return (
        <StyledBookingInfo className={className}>
            <StyledPlatformTag>네이버예약</StyledPlatformTag>
            {reservation.naverBookingId && <span>{reservation.naverBookingId}</span>}
            {reservation.naverBookingUrl && (
                <StyledBookingLink href={reservation.naverBookingUrl} target="_blank" rel="noopener noreferrer">
                    바로가기 ↗
                </StyledBookingLink>
            )}
        </StyledBookingInfo>
    );
}

const StyledBookingInfo = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color);
`;

const StyledPlatformTag = styled(LabelBadge).attrs({
    $tone: 'brand',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: var(--tiny-font);
`;

const StyledBookingLink = styled.a`
    font-size: var(--xsmall-font);
    color: #03C75A;
    font-weight: 600;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            text-decoration: underline;
        }
    }
`;
