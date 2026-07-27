import React from 'react';

import styled from 'styled-components';

import {CloseIconButton} from '../../ui/CloseIconButton';
import {StyledHeader} from './ModalStyles';

type ReservationDetailHeaderProps = {
    title: string;
    service: string;
    serviceColorMap: Record<string, string>;
    onClose: () => void;
};

export function ReservationDetailHeader({
    title,
    service,
    serviceColorMap,
    onClose,
}: ReservationDetailHeaderProps) {
    return (
        <StyledReservationHeader>
            <StyledReservationTitleGroup>
                <StyledReservationTitle>{title}</StyledReservationTitle>
            </StyledReservationTitleGroup>
            <CloseIconButton onClick={onClose} />
        </StyledReservationHeader>
    );
}

const StyledReservationHeader = styled(StyledHeader)``;

const StyledReservationTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
`;

const StyledReservationTitle = styled.strong`
    display: block;
    margin: 0;
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
