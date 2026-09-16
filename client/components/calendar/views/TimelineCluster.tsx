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
    /**
     * 담당자 배지를 그리지 않는다. 한 칸이 약 47px 인 모바일 주 뷰용 —
     * 이름표가 칸을 넘겨 "2건예약" 까지 세로로 쪼갠다. 담당자 색은 예약을 펼쳐 보면 드러난다.
     */
    hideAssignees?: boolean;
    onToggle: () => void;
};

export function TimelineCluster({
    cluster,
    blockTop,
    blockHeight,
    assigneeColorMap,
    assigneeNameById,
    hideAssignees = false,
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
                {!hideAssignees && assigneeBadges.map((badge, index) => (
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
