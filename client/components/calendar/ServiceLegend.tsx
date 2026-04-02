import {useMemo, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {buildServiceColorMap, getGroupedCatalog, getServiceColor} from '../../utils/services';

export const ServiceLegend = () => {
    const [open, setOpen] = useState(false);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const grouped = getGroupedCatalog(serviceCatalog);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    return (<StyledWrap>
        {open && <StyledPanel>
            {Array.from(grouped.entries()).map(([category, items]) => (
                <StyledGroup key={category}>
                    <StyledCategoryLabel>{category}</StyledCategoryLabel>
                    <StyledItems>
                        {items.map((item) => (
                            <StyledItem key={item.name}>
                                <StyledDot $color={getServiceColor(item.name, serviceColorMap)}/>
                                <span>{item.name}</span>
                            </StyledItem>
                        ))}
                    </StyledItems>
                </StyledGroup>
            ))}
        </StyledPanel>}
        <StyledToggle type="button"
                      onClick={() => setOpen((prev) => !prev)}
                      aria-label="시술 범례 토글"
                      $open={open}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="2.5"/>
                <circle cx="6" cy="12" r="2.5"/>
                <circle cx="18" cy="12" r="2.5"/>
                <circle cx="8" cy="19" r="2.5"/>
                <circle cx="16" cy="19" r="2.5"/>
            </svg>
        </StyledToggle>
    </StyledWrap>);
};

const StyledWrap = styled.div`
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
`;

const StyledPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    max-height: 60vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-width: 180px;
`;

const StyledGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledCategoryLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: var(--dark-gray-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StyledItems = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0;
    margin: 0;
    list-style: none;
`;

const StyledItem = styled.li`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-color, #333);
`;

const StyledDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
`;

const StyledToggle = styled.button<{ $open: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background-color: ${(props) => props.$open ? 'var(--dark-gray-color)' : '#fff'};
    color: ${(props) => props.$open ? '#fff' : 'var(--dark-gray-color)'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;

    &:hover {
        opacity: 0.85;
    }
`;
