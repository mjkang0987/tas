import React from 'react';

import styled from 'styled-components';

import {ButtonReserve} from '../../ui/Buttons';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {Customer} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import type {DragPreview} from './timelineDrag';
import type {TimelineLane} from './timelineEntries';
import {cardDetailForHeight, type CardDetail} from '../../../features/reservations/timeline-scale';

// 상태를 카드 **글자로** 알리지 않는다 — 글자는 이름·시술을 밀어내는데, 상태마다 제 장치가 있다.
// - 결제완료: 예약이 제대로 끝난 정상 종착점이라 알릴 것이 없다(지난 예약 대부분에 같은 꼬리표가
//   달려 읽을 것만 늘고, 정작 봐야 할 예외가 묻혔다).
// - 취소·노쇼: 빗금 + 무채색 + 취소선. 취소는 한 방향, 노쇼는 교차 빗금으로 가른다.
// - 확정대기: 딤 + 배지. 아직 사장님이 수락하지 않은 신청이라 "있지만 정해지지 않았다"로 읽혀야 한다.

type TimelineReservationCardProps = {
    reservation: Reservation;
    preview: DragPreview | null;
    blockTop: number;
    blockHeight: number;
    customerName?: string;
    isNewCustomer?: boolean;
    customer?: Customer;
    color: string;
    serviceColorMap: Record<string, string>;
    hideOriginalBlock: boolean;
    suppressClick: boolean;
    /** 겹친 예약을 나눠 놓을 때의 칸. 없으면 지금까지처럼 가로 전체를 쓴다. */
    lane?: TimelineLane;
    /** 높이로 정한 단계 대신 강제할 표시 단계. 칸이 좁을 때 호출부가 'name' 을 준다. */
    detail?: CardDetail;
    onClick: (event: React.MouseEvent) => void;
    onMouseDragStart?: (event: React.MouseEvent<HTMLElement>) => void;
    onTouchDragStart?: (event: React.TouchEvent<HTMLElement>) => void;
};

export function TimelineReservationCard({
    reservation,
    preview,
    blockTop,
    blockHeight,
    customerName,
    isNewCustomer,
    customer,
    color,
    serviceColorMap,
    hideOriginalBlock,
    suppressClick,
    lane,
    detail: forcedDetail,
    onClick,
    onMouseDragStart,
    onTouchDragStart,
}: TimelineReservationCardProps) {
    // 완료는 취소가 아니다 — 흐리게 + 취소선은 취소·노쇼에만. (완료는 매출로도 잡히는 건이다.)
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow';
    // 끝난 예약은 끌어 옮기지 않는다 — 완료도 여기 포함한다.
    const isLocked = isCancelled || reservation.status === 'completed';
    // 짧은 예약은 두 줄이 안 들어간다. 높이에 맞춰 서비스 → 한 줄 → 이름만으로 줄인다.
    // (매장 단위가 아니라 이 카드의 높이로 정한다 — 예약별로 소요시간을 줄인 건도 있다.)
    // 호출부가 단계를 강제하면 그걸 쓴다 — 좁은 칸은 카드가 높아도 넣을 가로 폭이 없다.
    const detail = forcedDetail ?? cardDetailForHeight(blockHeight);
    // 강제된 'name' 만 배지·상태까지 뺀다. 높이가 낮아 자연히 'name' 이 된 카드는
    // 지금까지처럼 둘 다 단다(데스크톱 무변경).
    const minimal = forcedDetail === 'name';

    return (
        <ButtonReserve
            $detail={detail}
            data-timeline-interactive="true"
            // 드래그 중엔 hover 확장을 끈다 — 끌고 있는 카드가 커서 아래에서 커졌다 작아지면 조준이 흔들린다.
            data-dragging={preview ? 'true' : undefined}
            style={hideOriginalBlock ? {visibility: 'hidden'} : undefined}
            // 드래그 중엔 칸을 풀어 원래 폭으로 — 끌고 가는 곳의 겹침은 아직 계산되지 않았다.
            $lane={preview ? undefined : lane}
            $position="absolute"
            $top={preview?.top ?? blockTop}
            $height={blockHeight}
            $color={color}
            $cancelled={isCancelled}
            $noshow={reservation.status === 'noshow'}
            $requested={reservation.status === 'requested'}
            onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                if (suppressClick) return;
                onClick(event);
            }}
        >
            {!isLocked && onMouseDragStart && onTouchDragStart && (
                <span
                    data-timeline-interactive="true"
                    className="drag-handle"
                    onMouseDown={onMouseDragStart}
                    onTouchStart={onTouchDragStart}
                >
                    <span className="a11y">예약 이동</span>
                </span>
            )}
            {reservation.status === 'requested' && (<>
                {/* 아직 수락 전인 신청. 눌러서 상세에서 수락·거절해야 하므로 딤도 배지도
                    클릭을 먹지 않는다(`pointer-events: none`). */}
                <span className="pending-veil" aria-hidden="true" />
                {/* 표시 단계가 아니라 **높이**로 정한다 — 좁은 칸(주·3일)은 이름만 쓰는 단계라도
                    카드가 충분히 높으면 배지가 들어간다. 앱도 같은 기준(34pt). */}
                {blockHeight >= 34 && <span className="pending-badge">확정대기</span>}
            </>)}
            {detail === 'full' ? (<>
                {/* 앱 블록과 같은 차례 — 시작시간 / 고객명 / 시술.
                    누가 오는지가 무엇을 받는지보다 먼저 읽혀야 한다. */}
                <span className="start-time">{reservation.startTime}</span>
                {customerName && (
                    <span className="detail">
                        {isNewCustomer && <NewCustomerBadge>신규</NewCustomerBadge>}
                        <span>{customerName}</span>
                    </span>
                )}
                <strong className="highlight">
                    <StyledTimelineServiceList service={reservation.service}
                                              serviceColorMap={serviceColorMap}
                                              keyPrefix={reservation.id} />
                </strong>
                {preview && <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>}
            </>) : (
                // 한 줄에 담는다. 넘치면 말줄임 — 무엇인지는 왼쪽 색 막대가 이미 말해준다.
                <span className="oneline">
                    {isNewCustomer && !minimal && <NewCustomerBadge>신규</NewCustomerBadge>}
                    <span className="oneline-text">
                        {/* `compact` 까지만 시작시간을 둔다 — 세 줄이 안 되는 카드라고 시간을
                            잃으면 눈금을 되짚어야 한다. 다만 `name` 단계는 이름 한 줄도 빠듯해
                            (20px 미만) 시간이 폭을 반 먹는다. 그 단계는 이름만이라는 계약이다. */}
                        {detail === 'compact' && <span className="start-time-inline">{reservation.startTime}</span>}
                        {customerName || '고객'}
                        {detail === 'compact' && reservation.service ? ` · ${reservation.service}` : ''}
                    </span>
                </span>
            )}
        </ButtonReserve>
    );
}

type TimelineDragGhostProps = {
    reservation: Reservation;
    preview: DragPreview;
    customerName?: string;
    isNewCustomer?: boolean;
    customer?: Customer;
    color: string;
    serviceColorMap: Record<string, string>;
};

export function TimelineDragGhost({
    reservation,
    preview,
    customerName,
    isNewCustomer,
    customer,
    color,
    serviceColorMap,
}: TimelineDragGhostProps) {
    // 완료는 취소가 아니다 — 흐리게 + 취소선은 취소·노쇼에만. (완료는 매출로도 잡히는 건이다.)
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow';

    return (
        <StyledDragGhost
            aria-hidden="true"
            $left={preview.ghostLeft}
            $top={preview.ghostTop}
            $width={preview.ghostWidth}
            $height={preview.ghostHeight}
            $color={color}
            $cancelled={isCancelled}
        >
            <strong>
                <StyledTimelineServiceList service={reservation.service}
                                          serviceColorMap={serviceColorMap}
                                          keyPrefix={`ghost-${reservation.id}`} />
            </strong>
            <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>
            {customerName && (
                <span className="detail">
                    {isNewCustomer && <NewCustomerBadge>신규</NewCustomerBadge>}
                    <span>{customerName}</span>
                </span>
            )}
        </StyledDragGhost>
    );
}

const StyledDragGhost = styled.div<{
    $left: number;
    $top: number;
    $width: number;
    $height: number;
    $color: string;
    $cancelled: boolean
}>`
    position: fixed;
    left: ${(props) => props.$left}px;
    top: ${(props) => props.$top}px;
    width: ${(props) => props.$width}px;
    height: auto;
    max-height: none;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-sizing: border-box;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background-color: ${(props) => props.$cancelled ? 'var(--cancelled-color)' : `${props.$color}12`};
    border: 1px solid ${(props) => props.$cancelled ? 'var(--cancelled-color)' : props.$color};
    border-left-width: 4px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
    color: ${(props) => props.$cancelled ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    opacity: 0.72;
    filter: ${(props) => props.$cancelled ? 'grayscale(.5)' : 'none'};
    pointer-events: none;
    @media (max-width: 640px) {
        padding: 2px;
    }

    strong {
        font-size: var(--small-font);
        font-weight: 600;
    }

    .sub {
        font-size: var(--tiny-font);
        @media (max-width: 640px) {
            display: none;
        }
    }

    .detail {
        margin-top: 2px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--tiny-font);
        opacity: 0.9;
        @media (max-width: 640px) {
            display: none;
        }
    }
`;

const StyledTimelineServiceList = styled(ServiceChipList)`
    @media (max-width: 640px) {
        gap: 4px;
    }
`;
