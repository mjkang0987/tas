import React from 'react';

import styled from 'styled-components';

import {CloseIconButton} from '../../ui/CloseIconButton';
import {ServiceChipList} from '../../ui/ServiceChip';
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
                <StyledServiceBadgeList service={service}
                                        serviceColorMap={serviceColorMap}
                                        keyPrefix={title} />
                <h3>{title}</h3>
            </StyledReservationTitleGroup>
            <CloseIconButton onClick={onClose} />
        </StyledReservationHeader>
    );
}

const StyledReservationHeader = styled(StyledHeader)``;

const StyledReservationTitleGroup = styled.div`
    display: flex;
    gap: 4px;
    min-width: 0;

    h3 {
        margin: 0;
    }
`;

const StyledServiceBadgeList = styled(ServiceChipList)``;
