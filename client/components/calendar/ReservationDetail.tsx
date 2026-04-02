import {useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import type {Reservation, ReservationHistoryEntry, ReservationMap, ReservationStatus} from '../../utils/reservations';
import {findOverlap} from '../../utils/reservations';
import type {CustomerMap} from '../../utils/customers';
import {
    parseServiceString,
    joinServiceNames,
    sumDurationMinutes,
    sumPrice,
    formatPrice,
    calcEndTime,
} from '../../utils/services';

import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
    StyledForm,
    StyledFieldRow,
    StyledError,
    StyledFooter,
    StyledActionButton,
    StyledPriceRow,
    StyledPriceUnit,
    StyledStatusBadge,
    StyledModalMessage,
    StyledDiffGrid,
} from './ModalStyles';

import {ServiceFields} from './ServiceFields';

type Mode = 'view' | 'editing' | 'confirming' | 'pastConfirm' | 'noChanges' | 'cancelling' | 'noshow' | 'history';

interface ReservationDetailProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    reservationMap: ReservationMap;
    history: ReservationHistoryEntry[];
    onClose: () => void;
    onCustomerClick: (customerId: number) => void;
    onUpdate: (prev: Reservation, updated: Reservation) => void;
    onCancel: (reservation: Reservation, status?: ReservationStatus) => void;
}

interface FormState {
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    price: number;
}

const FIELD_LABELS: Record<keyof FormState, string> = {
    service: '시술',
    date: '날짜',
    startTime: '시작시간',
    endTime: '종료시간',
    price: '가격'
};

const getChangedFields = (before: Reservation, after: FormState) => {
    const fields: { label: string; before: string; after: string }[] = [];
    const beforePrice = before.price ?? sumPrice(parseServiceString(before.service));

    (Object.keys(FIELD_LABELS) as (keyof FormState)[]).forEach((key) => {
        if (key === 'price') {
            if (beforePrice !== after.price) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(after.price)
                });
            }
        } else if (before[key] !== after[key]) {
            fields.push({
                label: FIELD_LABELS[key],
                before: before[key] as string,
                after: after[key] as string
            });
        }
    });

    return fields;
};

const getHistoryDiffs = (entry: ReservationHistoryEntry) => {
    const diffs: { label: string; before: string; after: string }[] = [];

    if (entry.after.status === 'cancelled' && entry.before.status !== 'cancelled') {
        diffs.push({label: '상태', before: '활성', after: '취소됨'});
        return diffs;
    }

    if (entry.after.status === 'noshow' && entry.before.status !== 'noshow') {
        diffs.push({label: '상태', before: '활성', after: '노쇼'});
        return diffs;
    }

    (Object.keys(FIELD_LABELS) as (keyof FormState)[]).forEach((key) => {
        if (key === 'price') {
            const beforePrice = entry.before.price ?? sumPrice(parseServiceString(entry.before.service));
            const afterPrice = entry.after.price ?? sumPrice(parseServiceString(entry.after.service));
            if (beforePrice !== afterPrice) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(afterPrice)
                });
            }
        } else if (entry.before[key] !== entry.after[key]) {
            diffs.push({
                label: FIELD_LABELS[key],
                before: entry.before[key] as string,
                after: entry.after[key] as string
            });
        }
    });

    return diffs;
};

const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ReservationDetail = ({reservation, customerMap, reservationMap, history, onClose, onCustomerClick, onUpdate, onCancel}: ReservationDetailProps) => {
    const customer = customerMap[reservation.customerId];
    const modalRoot = document.getElementById('modal-root');

    const [mode, setMode] = useState<Mode>('view');
    const initialPrice = reservation.price ?? sumPrice(parseServiceString(reservation.service));
    const [form, setForm] = useState<FormState>({
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        service: reservation.service,
        price: initialPrice
    });
    const [error, setError] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>(
        () => parseServiceString(reservation.service)
    );
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [isPriceManual, setIsPriceManual] = useState(false);

    const changedFields = getChangedFields(reservation, form);
    const thisHistory = history.filter((h) => h.reservationId === reservation.id);
    const totalDuration = sumDurationMinutes(selectedServices);
    const totalPrice = sumPrice(selectedServices);
    const displayPrice = reservation.price ?? sumPrice(parseServiceString(reservation.service));

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({...prev, [field]: value}));
        setError('');
    };

    const handleStartTimeChange = (value: string) => {
        setForm((prev) => {
            const next = {...prev, startTime: value};

            if (!isEndTimeManual && selectedServices.length > 0) {
                const duration = sumDurationMinutes(selectedServices);

                if (duration > 0) {
                    next.endTime = calcEndTime(value, duration);
                }
            }

            return next;
        });
        setError('');
    };

    const handleEndTimeChange = (value: string) => {
        setIsEndTimeManual(true);
        setForm((prev) => ({...prev, endTime: value}));
        setError('');
    };

    const handleServiceToggle = (serviceName: string) => {
        setSelectedServices((prev) => {
            const next = prev.includes(serviceName)
                ? prev.filter((s) => s !== serviceName)
                : [...prev, serviceName];

            const serviceStr = joinServiceNames(next);
            const duration = sumDurationMinutes(next);

            setForm((f) => {
                const updated = {...f, service: serviceStr};

                if (duration > 0) {
                    updated.endTime = calcEndTime(f.startTime, duration);
                }

                if (!isPriceManual) {
                    updated.price = sumPrice(next);
                }

                return updated;
            });

            setIsEndTimeManual(false);
            setError('');

            return next;
        });
    };

    const validateForm = (): string => {
        if (!form.service.trim()) return '시술을 선택해주세요.';
        if (!form.date) return '날짜를 선택해주세요.';
        if (!form.startTime) return '시작 시간을 입력해주세요.';
        if (!form.endTime) return '종료 시간을 입력해주세요.';
        if (form.startTime >= form.endTime) return '시작 시간은 종료 시간보다 앞서야 합니다.';

        const overlap = findOverlap(reservationMap, form.date, form.startTime, form.endTime, reservation.id);

        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`;
        }

        return '';
    };

    const isPastTime = () => {
        const now = new Date();
        const startDateTime = new Date(`${form.date}T${form.startTime}`);
        return startDateTime < now;
    };

    const handleConfirmRequest = () => {
        const msg = validateForm();
        if (msg) {
            setError(msg);
            return;
        }
        if (changedFields.length === 0) {
            setMode('noChanges');
            return;
        }
        setError('');
        if (isPastTime()) {
            setMode('pastConfirm');
            return;
        }
        setMode('confirming');
    };

    const handleConfirmSave = () => {
        onUpdate(reservation, {...reservation, ...form});
        setMode('view');
    };

    const handleCancel = () => {
        setForm({
            date: reservation.date,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            service: reservation.service,
            price: initialPrice
        });
        setSelectedServices(parseServiceString(reservation.service));
        setIsEndTimeManual(false);
        setIsPriceManual(false);
        setMode('view');
    };

    const handleBack = () => {
        if (mode === 'confirming' || mode === 'pastConfirm' || mode === 'noChanges') {
            setMode('editing');
        } else if (mode === 'editing' || mode === 'cancelling' || mode === 'noshow') {
            handleCancel();
        } else if (mode === 'history') {
            setMode('view');
        } else {
            onClose();
        }
    };

    const isCancelled = reservation.status === 'cancelled';
    const isNoshow = reservation.status === 'noshow';
    const isInactive = isCancelled || isNoshow;

    if (!modalRoot) return null;

    return createPortal(<StyledOverlay onClick={handleBack}
                                       role="dialog"
                                       aria-modal="true"
                                       aria-label="예약 상세">
        <StyledDetail onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>{mode === 'editing' ? '예약 수정' : mode === 'confirming' || mode === 'pastConfirm' ? '변경 확인' : mode === 'noChanges' ? '알림' : mode === 'cancelling' ? '예약 취소' : mode === 'noshow' ? '노쇼 처리' : mode === 'history' ? '변경 이력' : reservation.service}</h3>
                <button type="button" onClick={handleBack} aria-label="닫기">&#x2715;</button>
            </StyledHeader>

            {mode === 'view' && (
                <StyledDetailBody>
                    <dl>
                        {isCancelled && (<>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="danger">취소됨</StyledStatusBadge></dd>
                        </>)}
                        {isNoshow && (<>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="warning">노쇼</StyledStatusBadge></dd>
                        </>)}
                        <dt>날짜</dt>
                        <dd>{reservation.date}</dd>
                        <dt>시간</dt>
                        <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                        <dt>가격</dt>
                        <dd>{formatPrice(displayPrice)}</dd>
                        <dt>고객명</dt>
                        <dd>
                            <StyledCustomerButton type="button"
                                                  onClick={() => onCustomerClick(reservation.customerId)}>
                                {customer?.name ?? '-'}
                            </StyledCustomerButton>
                        </dd>
                        <dt>연락처</dt>
                        <dd>{customer?.tel ?? '-'}</dd>
                    </dl>
                    {thisHistory.length > 0 && (
                        <StyledHistorySection>
                            <StyledHistoryButton type="button"
                                                  onClick={() => setMode('history')}>
                                변경 이력 ({thisHistory.length})
                            </StyledHistoryButton>
                        </StyledHistorySection>
                    )}
                </StyledDetailBody>
            )}

            {mode === 'editing' && (
                <StyledBody>
                    <StyledForm>
                        <StyledFieldRow role="group" aria-labelledby="edit-service-label">
                            <span id="edit-service-label">시술</span>
                            <ServiceFields idPrefix="edit"
                                           selectedServices={selectedServices}
                                           onServiceToggle={handleServiceToggle}
                                           totalDuration={totalDuration}
                                           totalPrice={totalPrice}/>
                        </StyledFieldRow>
                        <label htmlFor="edit-price">
                            <span>가격</span>
                            <StyledPriceRow>
                                <input id="edit-price"
                                       type="text"
                                       inputMode="numeric"
                                       value={form.price.toLocaleString('ko-KR')}
                                       onChange={(e) => {
                                           const raw = e.target.value.replace(/[^0-9]/g, '');
                                           const num = raw === '' ? 0 : parseInt(raw, 10);
                                           setForm((f) => ({...f, price: num}));
                                           setIsPriceManual(true);
                                           setError('');
                                       }}/>
                                <StyledPriceUnit>원</StyledPriceUnit>
                            </StyledPriceRow>
                        </label>
                        <label htmlFor="edit-date">
                            <span>날짜</span>
                            <input id="edit-date"
                                   type="date"
                                   value={form.date}
                                   onChange={(e) => handleChange('date', e.target.value)}/>
                        </label>
                        <label htmlFor="edit-startTime">
                            <span>시작</span>
                            <input id="edit-startTime"
                                   type="time"
                                   value={form.startTime}
                                   onChange={(e) => handleStartTimeChange(e.target.value)}/>
                        </label>
                        <label htmlFor="edit-endTime">
                            <span>종료</span>
                            <input id="edit-endTime"
                                   type="time"
                                   value={form.endTime}
                                   onChange={(e) => handleEndTimeChange(e.target.value)}/>
                        </label>
                    </StyledForm>
                    {error && <StyledError>{error}</StyledError>}
                </StyledBody>
            )}

            {mode === 'confirming' && (
                <StyledBody>
                    <StyledModalMessage>수정하시겠습니까?</StyledModalMessage>
                    <StyledDiffList>
                        {changedFields.map((d) => (
                            <StyledDiffGrid key={d.label}>
                                <dt>{d.label}</dt>
                                <dd>
                                    <del>{d.before}</del>
                                    <ins>{d.after}</ins>
                                </dd>
                            </StyledDiffGrid>
                        ))}
                    </StyledDiffList>
                </StyledBody>
            )}

            {mode === 'noChanges' && (
                <StyledBody>
                    <StyledModalMessage>변경내역이 없습니다.</StyledModalMessage>
                </StyledBody>
            )}

            {mode === 'pastConfirm' && (
                <StyledBody>
                    <StyledModalMessage $color="var(--caution-color)">현재 시간보다 과거입니다. 변경하시겠습니까?</StyledModalMessage>
                    <StyledDiffList>
                        {changedFields.map((d) => (
                            <StyledDiffGrid key={d.label}>
                                <dt>{d.label}</dt>
                                <dd>
                                    <del>{d.before}</del>
                                    <ins>{d.after}</ins>
                                </dd>
                            </StyledDiffGrid>
                        ))}
                    </StyledDiffList>
                </StyledBody>
            )}

            {mode === 'cancelling' && (
                <StyledBody>
                    <StyledModalMessage $color="var(--danger-color)">이 예약을 취소하시겠습니까?</StyledModalMessage>
                    <StyledDiffList>
                        <StyledDiffGrid>
                            <dt>시술</dt>
                            <dd>{reservation.service}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>날짜</dt>
                            <dd>{reservation.date}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>시간</dt>
                            <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>고객명</dt>
                            <dd>{customer?.name ?? '-'}</dd>
                        </StyledDiffGrid>
                    </StyledDiffList>
                </StyledBody>
            )}

            {mode === 'noshow' && (
                <StyledBody>
                    <StyledModalMessage $color="var(--warning-color)">이 예약을 노쇼 처리하시겠습니까?</StyledModalMessage>
                    <StyledDiffList>
                        <StyledDiffGrid>
                            <dt>시술</dt>
                            <dd>{reservation.service}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>날짜</dt>
                            <dd>{reservation.date}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>시간</dt>
                            <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                        </StyledDiffGrid>
                        <StyledDiffGrid>
                            <dt>고객명</dt>
                            <dd>{customer?.name ?? '-'}</dd>
                        </StyledDiffGrid>
                    </StyledDiffList>
                </StyledBody>
            )}

            {mode === 'history' && (
                <StyledBody>
                    <StyledHistoryDetailList>
                        {[...thisHistory].reverse().map((entry, i) => {
                            const diffs = getHistoryDiffs(entry);
                            const isCancelEntry = entry.after.status === 'cancelled' && entry.before.status !== 'cancelled';
                            const isNoshowEntry = entry.after.status === 'noshow' && entry.before.status !== 'noshow';
                            const entryType = isCancelEntry ? 'cancelled' : isNoshowEntry ? 'noshow' : 'edit';
                            return (
                                <StyledHistoryDetailItem key={i} $type={entryType}>
                                    <StyledHistoryDetailHeader>
                                        <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                                        <StyledHistoryTypeBadge $type={entryType}>
                                            {isCancelEntry ? '예약취소' : isNoshowEntry ? '노쇼' : '수정'}
                                        </StyledHistoryTypeBadge>
                                    </StyledHistoryDetailHeader>
                                    <StyledHistoryDetailDiffs>
                                        {diffs.map((d) => (
                                            <StyledHistoryDiffGrid key={d.label}>
                                                <dt>{d.label}</dt>
                                                <dd>
                                                    <del>{d.before}</del>
                                                    <ins>{d.after}</ins>
                                                </dd>
                                            </StyledHistoryDiffGrid>
                                        ))}
                                    </StyledHistoryDetailDiffs>
                                </StyledHistoryDetailItem>
                            );
                        })}
                    </StyledHistoryDetailList>
                </StyledBody>
            )}

            <StyledFooter>
                {mode === 'view' && !isInactive && (<>
                    <StyledActionButton type="button"
                                        $danger
                                        onClick={() => setMode('cancelling')}>예약취소</StyledActionButton>
                    <StyledActionButton type="button"
                                        $warning
                                        onClick={() => setMode('noshow')}>노쇼</StyledActionButton>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={() => setMode('editing')}>수정</StyledActionButton>
                </>)}
                {mode === 'editing' && (<>
                    <StyledActionButton type="button"
                                        onClick={handleCancel}>취소</StyledActionButton>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={handleConfirmRequest}>저장</StyledActionButton>
                </>)}
                {mode === 'confirming' && (<>
                    <StyledActionButton type="button"
                                        onClick={() => setMode('editing')}>돌아가기</StyledActionButton>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={handleConfirmSave}>확인</StyledActionButton>
                </>)}
                {mode === 'noChanges' && (
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={() => setMode('editing')}>확인</StyledActionButton>
                )}
                {mode === 'pastConfirm' && (<>
                    <StyledActionButton type="button"
                                        onClick={() => setMode('editing')}>아니오</StyledActionButton>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={handleConfirmSave}>네</StyledActionButton>
                </>)}
                {mode === 'cancelling' && (<>
                    <StyledActionButton type="button"
                                        onClick={() => setMode('view')}>돌아가기</StyledActionButton>
                    <StyledActionButton type="button"
                                        $danger
                                        onClick={() => onCancel(reservation)}>예약취소</StyledActionButton>
                </>)}
                {mode === 'noshow' && (<>
                    <StyledActionButton type="button"
                                        onClick={() => setMode('view')}>돌아가기</StyledActionButton>
                    <StyledActionButton type="button"
                                        $warning
                                        onClick={() => onCancel(reservation, 'noshow')}>노쇼 처리</StyledActionButton>
                </>)}
                {mode === 'history' && (
                    <StyledActionButton type="button"
                                        onClick={() => setMode('view')}>돌아가기</StyledActionButton>
                )}
            </StyledFooter>
        </StyledDetail>
    </StyledOverlay>, modalRoot);
};

const StyledDetailBody = styled(StyledBody)`
  > dl {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 8px 12px;
    margin: 0;
  }

  dt {
    font-size: 13px;
    color: var(--gray-color);
    font-weight: 500;
  }

  dd {
    margin: 0;
    font-size: 13px;
  }
`;

const StyledCustomerButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: #4285F4;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #1a73e8;
  }
`;

const StyledDiffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  padding: 12px;
  background-color: var(--black-color-10);
  border-radius: var(--radius-md);
`;

const StyledHistorySection = styled.div`
  margin-top: 16px;
  border-top: 1px solid var(--light-gray-color);
  padding-top: 12px;
`;

const StyledHistoryButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--light-gray-color);
  border-radius: 6px;
  background: var(--white-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--dark-gray-color);
  cursor: pointer;
  text-align: left;

  &::after {
    content: "\\203A";
    float: right;
    font-size: 16px;
    line-height: 1;
    color: var(--gray-color);
  }

  &:hover {
    background-color: var(--black-color-10);
  }
`;

const StyledHistoryDetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const HISTORY_ITEM_STYLES: Record<string, { bg: string; border: string }> = {
  cancelled: {bg: 'var(--danger-bg)', border: 'var(--danger-border)'},
  noshow: {bg: 'var(--warning-bg)', border: 'var(--warning-border)'},
};

const StyledHistoryDetailItem = styled.div<{ $type: string }>`
  padding: var(--gap-lg);
  background-color: ${(props) => HISTORY_ITEM_STYLES[props.$type]?.bg || 'var(--black-color-10)'};
  border: 1px solid ${(props) => HISTORY_ITEM_STYLES[props.$type]?.border || 'transparent'};
  border-radius: var(--radius-md);
`;

const StyledHistoryDetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  > time {
    font-size: var(--xsmall-font);
    color: var(--gray-color);
  }
`;

const HISTORY_BADGE_COLORS: Record<string, string> = {
  cancelled: 'var(--danger-color)',
  noshow: 'var(--warning-color)',
};

const StyledHistoryTypeBadge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 2px var(--gap-sm);
  border-radius: var(--radius-sm);
  font-size: var(--tiny-font);
  font-weight: 600;
  background-color: ${(props) => HISTORY_BADGE_COLORS[props.$type] || 'var(--blue-color)'};
  color: #fff;
`;

const StyledHistoryDetailDiffs = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
`;

const StyledHistoryDiffGrid = styled(StyledDiffGrid)`
  grid-template-columns: 55px 1fr;

  dt {
    font-size: var(--xsmall-font);
  }

  del, ins {
    font-size: var(--xsmall-font);
  }

  dd {
    gap: var(--gap-sm);
  }
`;

