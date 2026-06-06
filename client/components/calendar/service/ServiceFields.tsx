import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {
    getGroupedCatalog,
    getServicePrice,
    buildCatalogMap,
    buildServiceColorMap,
    formatDuration,
    formatPrice,
    getServiceColor
} from '../../../utils/services';

interface ServiceFieldsProps {
    selectedServices: string[];
    onServiceToggle: (serviceName: string) => void;
    totalDuration: number;
    totalPrice: number;
    idPrefix: string;
}

export const ServiceFields = ({
                                  selectedServices,
                                  onServiceToggle,
                                  totalDuration,
                                  totalPrice,
                                  idPrefix
                              }: ServiceFieldsProps) => {
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const groupedCatalog = getGroupedCatalog(serviceCatalog);
    const catalogMap = buildCatalogMap(serviceCatalog);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    return (
        <StyledServiceArea>
            <StyledServiceList>
                {[...groupedCatalog.entries()].map(([category, items]) => (
                    <StyledServiceGroup key={category}>
                        <StyledCategoryHeader>{category}</StyledCategoryHeader>
                        {items.map((item) => (
                            <StyledServiceCheckbox key={item.name}
                                                   htmlFor={`${idPrefix}-service-${item.name}`}>
                                <input type="checkbox"
                                       id={`${idPrefix}-service-${item.name}`}
                                       checked={selectedServices.includes(item.name)}
                                       onChange={() => onServiceToggle(item.name)} />
                                <StyledServiceChip $color={getServiceColor(item.name, serviceColorMap)}>
                                    {item.name}
                                </StyledServiceChip>
                                <StyledItemMeta>
                                    {item.price > 0 && <span>{formatPrice(item.price)}</span>}
                                    <StyledDuration>{formatDuration(item.durationMinutes)}</StyledDuration>
                                </StyledItemMeta>
                            </StyledServiceCheckbox>
                        ))}
                    </StyledServiceGroup>
                ))}
            </StyledServiceList>
            {selectedServices.length > 0 && (
                <StyledServiceSummary>
                    <StyledBadgeList>
                        {selectedServices.map((name) => (
                            <StyledBadge key={name}
                                         $color={getServiceColor(name, serviceColorMap)}>
                                <StyledServiceChip $color={getServiceColor(name, serviceColorMap)}>
                                    {name}
                                </StyledServiceChip>
                                {getServicePrice(name, catalogMap) > 0 &&
                                    <StyledBadgePrice>{formatPrice(getServicePrice(name, catalogMap))}</StyledBadgePrice>}
                            </StyledBadge>
                        ))}
                    </StyledBadgeList>
                    <StyledSummaryMeta>
                        {formatDuration(totalDuration)}{totalPrice > 0 ? ` / ${formatPrice(totalPrice)}` : ''}
                    </StyledSummaryMeta>
                </StyledServiceSummary>
            )}
        </StyledServiceArea>
    );
};

export const StyledServiceArea = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
`;

export const StyledServiceList = styled.div`
    max-height: 200px;
    overflow-y: auto;
    overscroll-behavior: auto;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
`;

export const StyledServiceGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

export const StyledCategoryHeader = styled.div`
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    padding: var(--gap-md);
    border-bottom: 1px solid var(--light-gray-color);
    position: sticky;
    top: 0;
    z-index: 2;
    background: rgba(255, 255, 255, .7); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
`;

export const StyledServiceCheckbox = styled.label`
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    font-size: var(--small-font);
    cursor: pointer;
    padding: var(--gap-xs) var(--gap-md);

    input[type="checkbox"] {
        width: 14px;
        height: 14px;
        margin: 0;
        cursor: pointer;
    }

`;

export const StyledServiceChip = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 7px;
    border-radius: 999px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: ${(props) => props.$color};
    background-color: ${(props) => `${props.$color}18`};
`;

const StyledItemMeta = styled.span`
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    margin-left: auto;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color);
`;

export const StyledDuration = styled.span`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color);
`;

export const StyledServiceSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
    padding: var(--gap-sm) var(--gap-md);
    background-color: var(--black-color-10);
    border-radius: var(--radius-sm);
`;

const StyledBadgeList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap-xs);
`;

const StyledBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: var(--gap-xs);
    padding: 2px var(--gap-xs);
    border-radius: var(--radius-sm);
    font-size: var(--xsmall-font);
    font-weight: 500;
    color: var(--dark-gray-color);
    background-color: var(--white-color);
    border: 1px solid var(--light-gray-color);
`;

const StyledBadgePrice = styled.span`
    font-size: var(--tiny-font);
    color: var(--blue-color);
`;

const StyledSummaryMeta = styled.span`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color);
    font-weight: 500;
`;
