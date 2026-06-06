import React from 'react';

import styled from 'styled-components';
import {Dot} from '../../ui/Dot';

import type {TimelineClusterData} from './TimelineClusterLayer';
import {pad} from '../../../utils/timeRound';

type TimelineClusterProps = {
    cluster: TimelineClusterData;
    blockTop: number;
    blockHeight: number;
    designerColorMap: Record<number, string>;
    onToggle: () => void;
};

export function TimelineCluster({
    cluster,
    blockTop,
    blockHeight,
    designerColorMap,
    onToggle,
}: TimelineClusterProps) {
    const designerDots = Array.from(new Map(cluster.reservations.map((reservation) => [
        reservation.designerId ?? 0,
        reservation.designerId ? (designerColorMap[reservation.designerId] ?? '#8E8E93') : '#8E8E93'
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
                <StyledOverlapDotList>
                    {designerDots.map((color, index) => (
                        <StyledOverlapDot key={`${cluster.id}-${index}`} $color={color} />
                    ))}
                </StyledOverlapDotList>
                <strong>{cluster.reservations.length}건예약</strong>
                <span className="time">{`${pad(Math.floor(cluster.startMinutes / 60))}:${pad(cluster.startMinutes % 60)} ~ ${pad(Math.floor(cluster.endMinutes / 60))}:${pad(cluster.endMinutes % 60)}`}</span>
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
    flex-direction: column;
    align-items: flex-start;
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

    strong {
        font-size: var(--small-font);
        font-weight: 700;
    }

    span {
        font-size: var(--tiny-font);
    }
    
    .time {
        @media (max-width: 640px) {
            display: none;
        }
    }
`;

const StyledOverlapDotList = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledOverlapDot = styled(Dot).attrs<{ $color: string }>((props) => ({
    color: props.$color,
    size: 8,
}))<{ $color: string }>`
    flex-shrink: 0;
`;
