import React, {useState, useMemo, useRef, useEffect, useCallback} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';

import styled from 'styled-components';

import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {Reservation, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';

import {useCalendarStore} from '../store/calendarStore';

import customersData from './api/customers.json';
import {InputWrap} from "../components/ui/Input";

type AddressProps = {
    customers: Customer[];
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
};

const RESERVATION_ITEM_HEIGHT = 40;
const RESERVATION_VISIBLE_COUNT = 5;

interface Tag {
    text: string;
    color: string;
}

const TAG_COLORS = [
    '#4285F4',
    '#34A853',
    '#EA4335',
    '#FBBC04',
    '#FF6D01',
    '#46BDC6',
    '#9334E6',
    '#E91E8C',
];

const Address: NextPage<AddressProps> = ({customers, reservations, history}) => {
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);

    const [tags, setTags] = useState<Record<number, Tag[]>>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
    const [selectedReservations, setSelectedReservations] = useState<Reservation[]>([]);

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestInput = useRef('');

    useEffect(() => {
        return () => {
            if (throttleRef.current) clearTimeout(throttleRef.current);
        };
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        latestInput.current = value;

        if (!throttleRef.current) {
            setSearchTerm(value);
            throttleRef.current = setTimeout(() => {
                setSearchTerm(latestInput.current);
                throttleRef.current = null;
            }, 300);
        }
    }, []);

    const customerMap = useMemo(() => toCustomerMap(customers), [customers]);
    const reservationMap = useMemo(() => groupByDate(reservations), [reservations]);

    const reservationsByCustomer = useMemo(() => {
        const map: Record<number, Reservation[]> = {};

        for (const r of reservations) {
            if (!map[r.customerId]) map[r.customerId] = [];
            map[r.customerId].push(r);
        }

        return map;
    }, [reservations]);

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const customerStats = useMemo(() => {
        const stats: Record<number, {
            recentService: string;
            booked: number;
            cancelled: number;
            completed: number;
            noshow: number;
        }> = {};

        for (const [customerId, rList] of Object.entries(reservationsByCustomer)) {
            const id = Number(customerId);
            let booked = 0, cancelled = 0, completed = 0, noshow = 0;

            for (const r of rList) {
                if (r.status === 'cancelled') cancelled++;
                else if (r.status === 'noshow') noshow++;
                else if (r.date < today) completed++;
                else booked++;
            }

            const valid = rList
                .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow')
                .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

            stats[id] = {
                recentService: valid.length > 0 ? valid[0].service : '-',
                booked,
                cancelled,
                completed,
                noshow,
            };
        }

        return stats;
    }, [reservationsByCustomer, today]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;

        const term = searchTerm.trim().toLowerCase();
        const telTerm = term.replace(/-/g, '');

        return customers.filter((c) =>
            c.name.toLowerCase().includes(term) ||
            c.tel.includes(telTerm) ||
            (tags[c.id] || []).some((t) => t.text.toLowerCase().includes(term))
        );
    }, [customers, searchTerm, tags]);

    const addTag = (id: number) => {
        const value = tagInput.trim();
        if (!value) return;

        setTags((prev) => {
            const existing = prev[id] || [];
            if (existing.some((t) => t.text === value)) return prev;
            return {...prev, [id]: [...existing, {text: value, color: selectedColor}]};
        });
        setTagInput('');
    };

    const removeTag = (id: number, text: string) => {
        setTags((prev) => {
            const existing = prev[id] || [];
            return {...prev, [id]: existing.filter((t) => t.text !== text)};
        });
    };

    return (
        <StyledSection>
            <Head>
                <title>RESERVATION - 고객명단</title>
            </Head>
            <StyledSticky>
                <StyledHeading>고객명단</StyledHeading>
                <InputWrap htmlFor="filterSearch">
                    <input type="search"
                           id="filterSearch"
                           value={searchInput}
                           onChange={(e) => handleSearchChange(e.target.value)}
                           placeholder="고객명, 연락처, 메모 검색" />
                </InputWrap>
            </StyledSticky>
            <StyledGrid>
                <StyledHeaderRow>
                    <span>이름</span>
                    <span>연락처</span>
                    <span>최근 시술</span>
                    <span>예약현황</span>
                </StyledHeaderRow>
                {filteredCustomers.length === 0 ? (
                    <StyledEmpty>검색 결과가 없습니다.</StyledEmpty>
                ) : (
                    <StyledItems>
                        {filteredCustomers.map((customer) => {
                            const customerReservations = reservationsByCustomer[customer.id] || [];
                            const isEditing = editingId === customer.id;
                            const customerTags = tags[customer.id] || [];
                            const stats = customerStats[customer.id];

                            return (
                                <StyledItem key={customer.id}>
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
                                                                <StyledTag key={tag.text}
                                                                           $color={tag.color}>
                                                                    {tag.text}
                                                                    <button type="button"
                                                                            onClick={() => removeTag(customer.id, tag.text)}>&#x2715;</button>
                                                                </StyledTag>
                                                            ))}
                                                        </StyledTagList>
                                                    )}
                                                    <StyledPalette>
                                                        {TAG_COLORS.map((color) => (
                                                            <StyledColorDot key={color}
                                                                            $color={color}
                                                                            $active={selectedColor === color}
                                                                            type="button"
                                                                            onClick={() => setSelectedColor(color)} />
                                                        ))}
                                                    </StyledPalette>
                                                    <StyledTagInputRow>
                                                        <StyledMemoInput value={tagInput}
                                                                         onChange={(e) => setTagInput(e.target.value)}
                                                                         onKeyDown={(e) => {
                                                                             if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                                                 e.preventDefault();
                                                                                 addTag(customer.id);
                                                                             }
                                                                         }}
                                                                         placeholder="태그 입력"
                                                                         autoFocus />
                                                        <StyledMemoButton type="button"
                                                                          onClick={() => addTag(customer.id)}>추가</StyledMemoButton>
                                                        <StyledMemoButton type="button"
                                                                          onClick={() => {
                                                                              setEditingId(null);
                                                                              setTagInput('');
                                                                          }}>완료</StyledMemoButton>
                                                    </StyledTagInputRow>
                                                </StyledTagEditor>
                                            ) : (<>
                                                {customerTags.length > 0 ? (
                                                    <StyledTagList>
                                                        {customerTags.map((tag) => (
                                                            <StyledTagReadonly key={tag.text}
                                                                               $color={tag.color}>{tag.text}</StyledTagReadonly>
                                                        ))}
                                                    </StyledTagList>
                                                ) : (
                                                    <StyledMemoText $isEmpty>메모 없음</StyledMemoText>
                                                )}
                                                <StyledMemoButton type="button"
                                                                  onClick={() => {
                                                                      setEditingId(customer.id);
                                                                      setTagInput('');
                                                                  }}>
                                                    {customerTags.length > 0 ? '수정' : '추가'}
                                                </StyledMemoButton>
                                            </>)}
                                        </StyledMemoCell>

                                        <StyledReservationWrap>
                                            {customerReservations.length > 0 ? (<>
                                                <StyledReservationScroll $count={customerReservations.length}>
                                                    <dl>
                                                        {customerReservations.map((r) => (
                                                            <StyledReservationItem key={r.id}
                                                                                   onClick={() => setSelectedReservations((prev) => [...prev, r])}>
                                                                <dt className="a11y">예약정보</dt>
                                                                <dd>
                                                                    <time dateTime={r.date}>{r.date}</time>
                                                                </dd>
                                                                <dd>
                                                                    <time dateTime={r.startTime}>{r.startTime}</time>
                                                                    ~ <time dateTime={r.endTime}>{r.endTime}</time>
                                                                </dd>
                                                                <dd>{r.service}</dd>
                                                                <dd>
                                                                    <StyledReservationBadge $type={
                                                                        r.status === 'cancelled' ? 'cancelled'
                                                                            : r.status === 'noshow' ? 'noshow'
                                                                                : r.date < today ? 'completed'
                                                                                    : 'booked'
                                                                    }>
                                                                        {r.status === 'cancelled' ? '취소'
                                                                            : r.status === 'noshow' ? '노쇼'
                                                                                : r.date < today ? '완료'
                                                                                    : '예약'}
                                                                    </StyledReservationBadge>
                                                                </dd>
                                                            </StyledReservationItem>
                                                        ))}
                                                    </dl>
                                                </StyledReservationScroll>
                                            </>) : (
                                                <StyledEmpty>예약 내역이 없습니다.</StyledEmpty>
                                            )}
                                        </StyledReservationWrap>
                                    </StyledDetails>
                                </StyledItem>
                            );
                        })}
                    </StyledItems>
                )}
            </StyledGrid>
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={customerMap}
                                   reservationMap={reservationMap}
                                   history={history}
                                   onClose={() => setSelectedReservations((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={(prev, updated) => {
                                       setSelectedReservations((current) => current.map((item) => item.id === prev.id ? updated : item));
                                   }}
                                   onCancel={(targetReservation) => {
                                       setSelectedReservations((prev) => prev.filter((item) => item.id !== targetReservation.id));
                                   }}/>
            ))}
            {selectedCustomerId !== null && customerMap[selectedCustomerId] && (
                <CustomerDetail customer={customerMap[selectedCustomerId]}
                                reservationMap={reservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default Address;

export const getServerSideProps: GetServerSideProps<AddressProps> = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.join(process.cwd(), 'pages/api/reservations.json'), 'utf-8');
    const data = JSON.parse(raw);

    return {
        props: {
            customers: customersData.customers,
            reservations: data.reservations,
            history: data.history ?? []
        }
    };
};

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    overflow-y: auto;
    overscroll-behavior: auto;
    box-sizing: border-box;
`;

const StyledHeading = styled.h2`
    text-align: center;
    font-size: var(--big-font);
    font-weight: 600;
    margin-bottom: 5px;
`;

const StyledSticky = styled.div`
    position: sticky;
    top: 0;
    background-color: var(--white-color);
    padding: 20px 10px;
    z-index: 1;
`;

const StyledGrid = styled.div`
    flex: 1;
    padding: 0 10px 10px;
`;

const StyledHeaderRow = styled.div`
    display: grid;
    grid-template-columns: 80px 130px 1fr auto;
    gap: 12px;
    position: sticky;
    top: 95px;
    padding: 0 10px 10px;
    border-bottom: 2px solid var(--black-color);
    background-color: var(--white-color);
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    z-index: 1;

    @media (max-width: 600px) {
        display: none;
    }
`;

const StyledItems = styled.ul`
    position: relative;
    z-index: 0;
`;

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

const STATUS_COLORS: Record<string, string> = {
    booked: '#4285F4',
    cancelled: '#999',
    completed: '#34A853',
    noshow: '#EA4335',
};

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
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    font-size: var(--small-font);
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
    }
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


const StyledReservationScroll = styled.div<{ $count: number }>`
    max-height: ${RESERVATION_VISIBLE_COUNT * RESERVATION_ITEM_HEIGHT}px;
    overflow-y: ${(props) => props.$count > RESERVATION_VISIBLE_COUNT ? 'auto' : 'visible'};
`;

const StyledReservationItem = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: center;
    min-height: ${RESERVATION_ITEM_HEIGHT}px;
    padding: 6px 10px;
    font-size: var(--small-font);
    box-sizing: border-box;
    border-bottom: 1px solid var(--light-gray-color);
    cursor: pointer;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: var(--black-color-10);
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
    }

    dd:last-child {
        font-weight: 500;
        margin-left: auto;
    }
`;

const RESERVATION_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#4285F4'},
    cancelled: {bg: '#F1F1F1', color: '#999'},
    completed: {bg: '#E6F4EA', color: '#34A853'},
    noshow: {bg: '#FCE8E6', color: '#EA4335'},
};

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
