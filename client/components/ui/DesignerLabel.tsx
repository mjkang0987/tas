import styled from 'styled-components';
import {Dot} from './Dot';

interface DesignerLabelProps {
    color: string;
    name: string;
    className?: string;
}

export function DesignerLabel({color, name, className}: DesignerLabelProps) {
    return (
        <StyledDesignerLabel className={className}>
            <StyledDesignerDot color={color} size={10} />
            <span>{name}</span>
        </StyledDesignerLabel>
    );
}

export const StyledDesignerLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 2px;
`;

export const StyledDesignerDot = styled(Dot)``;
