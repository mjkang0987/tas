import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {getServiceColor, parseServiceString} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';

const STATUS_COLORS: Record<string, string> = {
    booked: '#4285F4',
    cancelled: '#999',
    completed: '#34A853',
    noshow: '#EA4335',
};

const RESERVATION_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#4285F4'},
    cancelled: {bg: '#F1F1F1', color: '#999'},
    completed: {bg: '#E6F4EA', color: '#34A853'},
    noshow: {bg: '#FCE8E6', color: '#EA4335'},
};

type CustomerStats = {
    recentService: string;
    booked: number;
    cancelled: number;
    completed: number;
    noshow: number;
};

type Tag = {
    text: string;
    color: string;
};

type AddressCustomerRowProps = {
    customer: Customer;
    customerReservations: Reservation[];
    customerTags: Tag[];
    isEditing: boolean;
    stats?: CustomerStats;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    serviceColorMap: Record<string, string>;
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    today: string;
    onTagInputChange: (value: string) => void;
    onSelectColor: (color: string) => void;
    onAddTag: (customerId: number) => void;
    onRemoveTag: (customerId: number, text: string) => void;
    onStartEditing: (customerId: number) => void;
    onFinishEditing: () => void;
    onReservationClick: (reservation: Reservation) => void;
};

const getReservationState = (reservation: Reservation, today: string) => {
    if (reservation.status === 'cancelled') {
        return {type: 'cancelled', label: '취소'};
    }
    if (reservation.status === 'noshow') {
        return {type: 'noshow', label: '노쇼'};
    }
    if (reservation.date < today) {
        return {type: 'completed', label: '완료'};
    }
    return {type: 'booked', label: '예약'};
};

export function AddressCustomerRow({
    customer,
    customerReservations,
    customerTags,
    isEditing,
    stats,
    tagColors,
    tagInput,
    selectedColor,
    serviceColorMap,
    designerColorMap,
    designerNameMap,
    today,
    onTagInputChange,
    onSelectColor,
    onAddTag,
    onRemoveTag,
    onStartEditing,
    onFinishEditing,
    onReservationClick,
}: AddressCustomerRowProps) {
    return (
        <StyledItem>
            <StyledDetails>
                <StyledSummary>
                    <strong>{customer.name}</strong>
                    <span>{customer.tel.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
                    <span>{stats?.recentService || '-'}</span>
                    <StyledStatusCounts>
                        <StyledStatusBadge $type="booked">예약({stats?.booked || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="cancelled">취소({stats?.cancelled || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="completed">완료({stats?.completed || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="noshow">노쇼({stats?.noshow || 0})</StyledStatusBadge>
                    </StyledStatusCounts>
                </StyledSummary>
                <StyledMemoCell onClick={(e) => e.preventDefault()}>
                    {isEditing ? (
                        <StyledTagEditor>
                            {customerTags.length > 0 && (
                                <StyledTagList>
                                    {customerTags.map((tag) => (
                                        <StyledTag key={tag.text} $color={tag.color}>
                                            {tag.text}
                                            <button
                                                type="button"
                                                onClick={() => onRemoveTag(customer.id, tag.text)}
                                            >
                                                &#x2715;
                                            </button>
                                        </StyledTag>
                                    ))}
                                </StyledTagList>
                            )}
                            <StyledPalette>
                                {tagColors.map((color) => (
                                    <StyledColorDot
                                        key={color}
                                        $color={color}
                                        $active={selectedColor === color}
                                        type="button"
                                        onClick={() => onSelectColor(color)}
                                    />
                                ))}
                            </StyledPalette>
                            <StyledTagInputRow>
                                <StyledMemoInput
                                    value={tagInput}
                                    onChange={(e) => onTagInputChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            onAddTag(customer.id);
                                        }
                                    }}
                                    placeholder="태그 입력"
                                    autoFocus
                                />
                                <StyledMemoButton type="button" onClick={() => onAddTag(customer.id)}>
                                    추가
                                </StyledMemoButton>
                                <StyledMemoButton type="button" onClick={onFinishEditing}>
                                    완료
                                </StyledMemoButton>
                            </StyledTagInputRow>
                        </StyledTagEditor>
                    ) : (
                        <>
                            {customerTags.length > 0 ? (
                                <StyledTagList>
                                    {customerTags.map((tag) => (
                                        <StyledTagReadonly key={tag.text} $color={tag.color}>
                                            {tag.text}
                                        </StyledTagReadonly>
                                    ))}
                                </StyledTagList>
                            ) : (
                                <StyledMemoText $isEmpty>메모 없음</StyledMemoText>
                            )}
                            <StyledMemoButton
                                type="button"
                                onClick={() => onStartEditing(customer.id)}
                            >
                                {customerTags.length > 0 ? '수정' : '추가'}
                            </StyledMemoButton>
                        </>
                    )}
                </StyledMemoCell>

                <StyledReservationWrap>
                    {customerReservations.length > 0 ? (
                        <dl>
                            {customerReservations.map((reservation) => {
                                const designerColor = reservation.designerId
                                    ? (designerColorMap[reservation.designerId] ?? '#8E8E93')
                                    : '#8E8E93';
                                const designerName = reservation.designerId
                                    ? (designerNameMap[reservation.designerId] ?? '미지정')
                                    : '미지정';
                                const state = getReservationState(reservation, today);

                                return (
                                    <StyledReservationItem
                                        key={reservation.id}
                                        $color={designerColor}
                                        onClick={() => onReservationClick(reservation)}
                                    >
                                        <dt className="a11y">예약정보</dt>
                                        <dd>
                                            <StyledReservationItemTop>
                                                <span className="date">{reservation.date}</span>
                                                <span className="time">{reservation.startTime}~{reservation.endTime}</span>
                                                <StyledServiceList>
                                                    {parseServiceString(reservation.service).map((serviceName) => (
                                                        <StyledServiceToken key={`${reservation.id}-${serviceName}`}>
                                                            <StyledServiceDot $color={getServiceColor(serviceName, serviceColorMap)} />
                                                            <span>{serviceName}</span>
                                                        </StyledServiceToken>
                                                    ))}
                                                </StyledServiceList>
                                            </StyledReservationItemTop>
                                            <StyledReservationMetaLine>
                                                <span>디자이너: {designerName}</span>
                                                <StyledReservationBadge $type={state.type}>
                                                    {state.label}
                                                </StyledReservationBadge>
                                            </StyledReservationMetaLine>
                                        </dd>
                                    </StyledReservationItem>
                                );
                            })}
                        </dl>
                    ) : (
                        <StyledEmpty>예약 내역이 없습니다.</StyledEmpty>
                    )}
                </StyledReservationWrap>
            </StyledDetails>
        </StyledItem>
    );
}

const StyledItem = styled.li`
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledDetails = styled.details`
    padding-right: 20px;

    > summary {
        position: relative;

        &::before {
            left: auto;
            right: -10px;
            transform: rotate(90deg);
        }
    }

    &[open] {
        background-color: #fff9f2;
        border-bottom: 2px solid var(--black-color);

        > summary::before {
            transform: rotate(-90deg);
        }
    }
`;

const StyledSummary = styled.summary`
    display: grid;
    grid-template-columns: 80px 130px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
    position: relative;

    &::-webkit-details-marker {
        display: none;
    }

    &::before {
        content: "";
        position: absolute;
        left: 0;
        display: inline-block;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 5px solid var(--dark-gray-color);
        transition: transform 0.15s ease;
    }

    > strong {
        font-size: var(--font);
        font-weight: 500;
    }

    > span:first-of-type {
        font-size: var(--small-font);
        color: var(--dark-gray-color);
    }

    > span:nth-of-type(2) {
        font-size: var(--small-font);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &:hover > strong {
        color: var(--blue-color);
    }

    @media (max-width: 600px) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;

        > strong {
            min-width: 60px;
        }

        > span:nth-of-type(2) {
            width: 100%;
        }
    }
`;

const StyledStatusCounts = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const StyledStatusBadge = styled.span<{ $type: string }>`
    font-size: var(--tiny-font);
    font-weight: 500;
    color: ${(props) => STATUS_COLORS[props.$type] || 'var(--gray-color)'};
`;

const StyledMemoCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 12px 12px;
`;

const StyledMemoInput = styled.input`
    flex: 1;
    max-width: 200px;
    ${formControlStyle};
    padding: 0 8px;
`;

const StyledMemoText = styled.span<{ $isEmpty: boolean }>`
    font-size: var(--small-font);
    color: ${(props) => props.$isEmpty ? 'var(--dark-gray-color2)' : 'var(--black-color)'};
`;

const StyledTagEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

const StyledTagInputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const StyledTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

const StyledTag = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background-color: ${(props) => props.$color};
    color: #fff;
    border-radius: 4px;
    font-size: var(--tiny-font);
    font-weight: 500;

    > button {
        border: none;
        background: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 9px;
        cursor: pointer;
        padding: 0;
        line-height: 1;

        &:hover {
            color: #fff;
        }
    }
`;

const StyledTagReadonly = styled.span<{ $color: string }>`
    display: inline-block;
    padding: 2px 8px;
    background-color: ${(props) => props.$color};
    border-radius: 4px;
    font-size: var(--tiny-font);
    font-weight: 500;
    color: #fff;
`;

const StyledPalette = styled.div`
    display: flex;
    gap: 4px;
`;

const StyledColorDot = styled.button<{ $color: string; $active: boolean }>`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid ${(props) => props.$active ? 'var(--dark-gray-color)' : 'transparent'};
    background-color: ${(props) => props.$color};
    cursor: pointer;
    padding: 0;
    box-sizing: border-box;

    &:hover {
        opacity: 0.8;
    }
`;

const StyledMemoButton = styled.button`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background-color: var(--white-color);
    font-size: var(--tiny-font);
    color: var(--dark-gray-color);

    &:hover {
        background-color: var(--black-color-10);
    }
`;

const StyledReservationWrap = styled.div`
`;

const StyledReservationItem = styled.div<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 40px;
    padding: 6px 10px;
    font-size: var(--small-font);
    box-sizing: border-box;
    border: 1px solid ${(props) => props.$color};
    border-left-width: 4px;
    border-radius: 8px;
    background-color: ${(props) => `${props.$color}12`};
    cursor: pointer;
    margin-bottom: 6px;

    &:last-child {
        margin-bottom: 0;
    }

    &:hover {
        background-color: ${(props) => `${props.$color}1d`};
    }

    dt {
        position: absolute;
        overflow: hidden;
        width: 1px;
        height: 1px;
        clip: rect(1px, 1px, 1px, 1px);
        clip-path: inset(50%);
    }

    dd {
        margin: 0;
        width: 100%;
    }
`;

const StyledReservationItemTop = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    .date,
    .time {
        color: var(--dark-gray-color);
        opacity: 0.9;
    }
`;

const StyledServiceList = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 500;
`;

const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const StyledServiceDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
`;

const StyledReservationMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
    font-size: var(--tiny-font);
    color: var(--gray-color);
`;

const StyledReservationBadge = styled.span<{ $type: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: var(--tiny-font);
    font-weight: 600;
    white-space: nowrap;
    background-color: ${(props) => RESERVATION_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => RESERVATION_BADGE_STYLES[props.$type]?.color || '#999'};
`;

const StyledEmpty = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
`;
