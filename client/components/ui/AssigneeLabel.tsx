import styled from 'styled-components';
import {ColorTag} from './ColorTag';

interface AssigneeLabelProps {
    color: string;
    name: string;
    className?: string;
}

export function AssigneeLabel({color, name, className}: AssigneeLabelProps) {
    return (
        <StyledAssigneeLabel $color={color} className={className}>
            {name}
        </StyledAssigneeLabel>
    );
}

export const StyledAssigneeLabel = styled(ColorTag)``;
