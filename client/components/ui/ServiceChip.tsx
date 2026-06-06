import {useMemo} from 'react';

import styled from 'styled-components';
import type {ReactNode} from 'react';

import {getServiceColor, parseServiceString} from '../../utils/services';

export const StyledServiceText = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 7px;
    border-radius: 999px;
    background-color: ${(props) => `${props.$color}18`};
    color: ${(props) => props.$color};
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
`;

export const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    min-width: 0;
`;

export const StyledServiceList = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

interface ServiceChipListProps {
    service?: string;
    serviceNames?: string[];
    serviceColorMap: Record<string, string>;
    keyPrefix?: string | number;
    className?: string;
    textAs?: 'span' | 'strong';
    children?: ReactNode;
}

export function ServiceChipList({
    service,
    serviceNames,
    serviceColorMap,
    keyPrefix = 'service',
    className,
    textAs = 'span',
    children,
}: ServiceChipListProps) {
    const knownServiceNames = useMemo(() => new Set(Object.keys(serviceColorMap)), [serviceColorMap]);
    const names = serviceNames ?? parseServiceString(service ?? '', knownServiceNames);

    return (
        <StyledServiceList className={className}>
            {names.map((serviceName) => (
                <StyledServiceToken className="service-token"
                                    key={`${keyPrefix}-${serviceName}`}>
                    <StyledServiceText
                        className="service-chip service-chip-text"
                        as={textAs}
                        $color={getServiceColor(serviceName, serviceColorMap)}
                    >
                        {serviceName}
                    </StyledServiceText>
                </StyledServiceToken>
            ))}
            {children}
        </StyledServiceList>
    );
}
