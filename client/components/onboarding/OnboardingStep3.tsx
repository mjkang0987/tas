import {useState} from 'react';

import styled from 'styled-components';

import {FieldError} from '../ui/FieldError';
import {getAssigneeColor} from '../../utils/assignees';
import type {LocalAssignee} from './onboarding-types';
import {DEFAULT_ASSIGNEE_ID_START} from './onboarding-types';
import {
    StyledNavRow, StyledBackBtn, StyledSkipBtn, StyledNextBtn,
    StyledSectionNote, StyledHighlight,
    StyledAddForm, StyledAddFormRow, StyledAddInput, StyledAddFormActions,
    StyledCancelBtnSm, StyledConfirmBtnSm, StyledAddServiceBtn,
} from './onboarding-step-styles';

interface Props {
    localAssignees: LocalAssignee[];
    onAssigneesChange: (assignees: LocalAssignee[]) => void;
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

export const OnboardingStep3 = ({localAssignees, onAssigneesChange, onNext, onSkip, onBack}: Props) => {
    const [showAddAssignee, setShowAddAssignee] = useState(false);
    const [newAssigneeName, setNewAssigneeName] = useState('');
    const [newAssigneeColor, setNewAssigneeColor] = useState(
        () => getAssigneeColor({id: DEFAULT_ASSIGNEE_ID_START + 1})
    );
    const [editingAssigneeId, setEditingAssigneeId] = useState<number | null>(null);
    const [step3Error, setStep3Error] = useState('');

    const handleAddAssignee = () => {
        const name = newAssigneeName.trim();
        if (!name) { setStep3Error('담당자 이름을 입력해 주세요.'); return; }
        if (localAssignees.some((d) => d.name === name)) {
            setStep3Error(`"${name}" 담당자는 이미 있습니다.`);
            return;
        }
        const newId = Math.max(...localAssignees.map((d) => d.id)) + 1;
        onAssigneesChange([...localAssignees, {id: newId, name, color: newAssigneeColor}]);
        setNewAssigneeName('');
        setNewAssigneeColor(getAssigneeColor({id: newId + 1}));
        setShowAddAssignee(false);
        setStep3Error('');
    };

    const handleRemoveAssignee = (id: number) => {
        onAssigneesChange(localAssignees.filter((d) => d.id !== id));
        setEditingAssigneeId(null);
        setStep3Error('');
    };

    const handleUpdateAssigneeName = (id: number, name: string) => {
        onAssigneesChange(localAssignees.map((d) => d.id === id ? {...d, name} : d));
        setStep3Error('');
    };

    const handleUpdateAssigneeColor = (id: number, color: string) => {
        onAssigneesChange(localAssignees.map((d) => d.id === id ? {...d, color} : d));
    };

    return (
        <>
            <StyledSectionNote>
                <StyledHighlight>담당자 변경, 추가는 초기 매장 설정 완료 이후 언제든 가능합니다.</StyledHighlight>
                <br/>담당자를 등록하세요.
            </StyledSectionNote>

            <StyledAssigneeList>
                {localAssignees.map((d) => (
                    <StyledAssigneeCard key={d.id} $color={d.color} $isEditing={editingAssigneeId === d.id}>
                        <StyledAssigneeHeader>
                            <StyledAssigneeHeaderLeft>
                                <StyledAssigneeColorDot style={{background: d.color}} />
                                {editingAssigneeId === d.id ? (
                                    <StyledAssigneeNameInput
                                        value={d.name}
                                        onChange={(e) => handleUpdateAssigneeName(d.id, e.target.value)}
                                        placeholder="담당자명"
                                        autoFocus
                                    />
                                ) : (
                                    <StyledAssigneeName>{d.name}</StyledAssigneeName>
                                )}
                            </StyledAssigneeHeaderLeft>
                            <StyledAssigneeActions>
                                <StyledAssigneeColorPicker
                                    type="color"
                                    value={d.color}
                                    onChange={(e) => handleUpdateAssigneeColor(d.id, e.target.value)}
                                    disabled={editingAssigneeId !== d.id}
                                    title="콜러 변경"
                                />
                                {editingAssigneeId === d.id ? (
                                    <>
                                        {localAssignees.length > 1 && (
                                            <StyledInlineDeleteBtn type="button" onClick={() => handleRemoveAssignee(d.id)}>삭제</StyledInlineDeleteBtn>
                                        )}
                                        <StyledConfirmBtnSm type="button" onClick={() => setEditingAssigneeId(null)}>완료</StyledConfirmBtnSm>
                                    </>
                                ) : (
                                    <StyledSmEditBtn type="button" onClick={() => setEditingAssigneeId(d.id)}>수정</StyledSmEditBtn>
                                )}
                            </StyledAssigneeActions>
                        </StyledAssigneeHeader>
                    </StyledAssigneeCard>
                ))}
            </StyledAssigneeList>

            {!showAddAssignee && <FieldError variant="inline">{step3Error}</FieldError>}

            {showAddAssignee ? (
                <StyledAddForm>
                    <StyledAddFormRow>
                        <StyledAddInput
                            id="onboard-assignee-name"
                            value={newAssigneeName}
                            onChange={(e) => { setNewAssigneeName(e.target.value); setStep3Error(''); }}
                            placeholder="담당자명 *"
                            autoFocus
                        />
                        <StyledAssigneeColorPicker
                            type="color"
                            value={newAssigneeColor}
                            onChange={(e) => setNewAssigneeColor(e.target.value)}
                            title="콜러"
                        />
                    </StyledAddFormRow>
                    <FieldError variant="inline">{step3Error}</FieldError>
                    <StyledAddFormActions>
                        <StyledCancelBtnSm type="button" onClick={() => { setShowAddAssignee(false); setNewAssigneeName(''); setStep3Error(''); }}>취소</StyledCancelBtnSm>
                        <StyledConfirmBtnSm type="button" onClick={handleAddAssignee}>추가</StyledConfirmBtnSm>
                    </StyledAddFormActions>
                </StyledAddForm>
            ) : (
                <StyledAddServiceBtn type="button" onClick={() => setShowAddAssignee(true)}>
                    + 담당자 추가
                </StyledAddServiceBtn>
            )}

            <StyledNavRow>
                <StyledBackBtn type="button" onClick={onBack}>← 이전</StyledBackBtn>
                <StyledSkipBtn type="button" onClick={onSkip}>건너뛰기</StyledSkipBtn>
                <StyledNextBtn type="button" onClick={onNext}>다음</StyledNextBtn>
            </StyledNavRow>
        </>
    );
};

const StyledAssigneeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledAssigneeCard = styled.div<{$color: string; $isEditing: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${(p) => `${p.$color}44`};
    border-left: 4px solid ${(p) => p.$color};
    border-radius: 10px;
    padding: 8px 10px;
    background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${(p) => `${p.$color}10`} 100%);
    box-shadow: ${(p) => p.$isEditing
        ? '0 0 0 2px var(--blue-color), var(--card-shadow)'
        : 'var(--card-shadow)'};
    transition: box-shadow 0.14s ease, border-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${(p) => `${p.$color}66`};
            box-shadow: ${(p) => p.$isEditing
                ? '0 0 0 2px var(--blue-color), var(--card-shadow-hover)'
                : 'var(--card-shadow-hover)'};
        }
    }
`;

const StyledAssigneeHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledAssigneeHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
`;

const StyledAssigneeActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledAssigneeColorDot = styled.span`
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
`;

const StyledAssigneeName = styled.span`
    flex: 1;
    font-size: 14px;
    font-weight: 700;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledAssigneeNameInput = styled.input`
    flex: 1;
    min-width: 80px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 700;
    background: var(--white-color);
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: var(--blue-color); }
`;

const StyledAssigneeColorPicker = styled.input`
    width: 28px;
    height: 28px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    cursor: pointer;
    flex-shrink: 0;

    &:disabled { opacity: 0.5; cursor: default; }
`;

const StyledSmEditBtn = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 11px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: pointer;
    box-shadow: var(--shadow-sm);

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--gray-color2); }
    }
`;

const StyledInlineDeleteBtn = styled.button`
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-sm);
    background: var(--danger-bg);
    font-size: 11px;
    font-weight: 600;
    color: var(--danger-color);
    cursor: pointer;
    margin-right: auto;
`;
