import {useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {Customer} from '../../utils/customers';
import {normalizeTel} from '../../utils/customers';
import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledForm,
    StyledFooter,
    StyledActionButton,
} from '../calendar/overlays/ModalStyles';

const TEL_PATTERN = /^01[016789]\d{7,8}$/;

function getNextNumericId(values: number[]): number {
    const max = values.reduce((currentMax, value) => (
        Number.isInteger(value) && value > currentMax ? value : currentMax
    ), 0);
    return max + 1;
}

export function CustomerAddModal({onClose}: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [tel, setTel] = useState('');
    const [error, setError] = useState('');

    const customerMap = useCalendarStore((s) => s.customerMap);
    const addCustomer = useCalendarStore((s) => s.addCustomer);

    const handleSubmit = () => {
        const trimmedName = name.trim();
        const trimmedTel = normalizeTel(tel);

        if (!trimmedName) {
            setError('고객명을 입력해 주세요.');
            return;
        }

        if (trimmedTel && !TEL_PATTERN.test(trimmedTel)) {
            setError('올바른 연락처를 입력해 주세요.');
            return;
        }

        const nextId = getNextNumericId(Object.keys(customerMap).map(Number));
        const newCustomer: Customer = {
            id: nextId,
            name: trimmedName,
            tel: trimmedTel,
            points: 0,
            pointHistories: [],
        };

        addCustomer(newCustomer);
        onClose();
    };

    return (
        <StyledOverlay onClick={onClose}>
            <StyledDetail onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitle>고객 추가</StyledHeaderTitle>
                    <button type="button" onClick={onClose}>닫기</button>
                </StyledHeader>
                <StyledFormWrap>
                    <StyledForm>
                        <label>
                            <strong>고객명</strong>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError('');
                                }}
                                placeholder="이름 입력"
                                autoFocus
                            />
                        </label>
                        <label>
                            <strong>연락처</strong>
                            <input
                                type="tel"
                                value={tel}
                                onChange={(e) => {
                                    setTel(e.target.value);
                                    setError('');
                                }}
                                placeholder="01012345678"
                            />
                        </label>
                        {error && <StyledError>{error}</StyledError>}
                    </StyledForm>
                </StyledFormWrap>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleSubmit}>추가</StyledActionButton>
                </StyledFooter>
            </StyledDetail>
        </StyledOverlay>
    );
}

const StyledFormWrap = styled.div`
    padding: var(--modal-body-padding);
`;

const StyledError = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--danger-color);
`;
