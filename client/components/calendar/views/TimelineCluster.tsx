import React from 'react';

import styled from 'styled-components';
import {AssigneeLabel} from '../../ui/AssigneeLabel';

import type {TimelineClusterData} from './TimelineClusterLayer';

type TimelineClusterProps = {
    cluster: TimelineClusterData;
    blockTop: number;
    blockHeight: number;
    assigneeColorMap: Record<number, string>;
    assigneeNameById: (assigneeId?: number) => string;
    onToggle: () => void;
};

export function TimelineCluster({
    cluster,
    blockTop,
    blockHeight,
    assigneeColorMap,
    assigneeNameById,
    onToggle,
}: TimelineClusterProps) {
    const assigneeBadges = Array.from(new Map(cluster.reservations.map((reservation) => [
        reservation.assigneeId ?? 0,
        {
            color: reservation.assigneeId ? (assigneeColorMap[reservation.assigneeId] ?? '#8E8E93') : '#8E8E93',
            name: assigneeNameById(reservation.assigneeId),
        }
    ])).values());

    return (
        <StyledOverlapWrap style={{top: blockTop, height: blockHeight}}>
            <StyledOverlapButton
                data-timeline-interactive="true"
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    onToggle();
                }}
            >
                <StyledOverlapCount>{cluster.reservations.length}건예약</StyledOverlapCount>
                {assigneeBadges.map((badge, index) => (
                    <AssigneeLabel key={`${cluster.id}-${index}`} color={badge.color} name={badge.name} />
                ))}
            </StyledOverlapButton>
        </StyledOverlapWrap>
    );
}

const StyledOverlapWrap = styled.div`
    position: absolute;
    left: 5px;
    right: 5px;
    z-index: 12;
`;

const StyledOverlapButton = styled.button`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-height: 100%;
    padding: 6px 8px;
    border: 1px solid var(--blue-color);
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    background: rgba(45, 127, 249, 0.12);
    color: var(--dark-gray-color);
    text-align: left;
    box-sizing: border-box;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);

    @media (max-width: 640px) {
        align-items: flex-start;
        padding: 4px 2px;
    }
`;

const StyledOverlapCount = styled.strong`
    font-size: var(--small-font);
    font-weight: 700;
`;
