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
    font-size: var(--xsmall-font);
    font-weight: 600;
    line-height: 1.2;
    /* 한글은 공백이 없어도 글자 사이에서 끊긴다. 이게 없으면 폭이 좁아질 때
       "남자디자인펌" 이 한 글자씩 세로로 쪼개진다(주소록에서 행 높이가 19px → 98px
       로 터졌다). 칩이 글자 단위로 갈라지는 게 맞는 화면은 없으므로 공용으로 막는다.
       한 줄을 강제하지는 않는다 — 그건 소비처가 필요하면 nowrap 으로 정한다. */
    word-break: keep-all;
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
