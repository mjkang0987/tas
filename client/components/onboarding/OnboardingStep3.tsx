import {useState} from 'react';

import styled from 'styled-components';

import {FieldError} from '../ui/FieldError';
import {getDesignerColor} from '../../utils/designers';
import type {LocalDesigner} from './onboarding-types';
import {DEFAULT_DESIGNER_ID_START} from './onboarding-types';
import {
    StyledNavRow, StyledBackBtn, StyledSkipBtn, StyledNextBtn,
    StyledSectionNote, StyledHighlight,
    StyledAddForm, StyledAddFormRow, StyledAddInput, StyledAddFormActions,
    StyledCancelBtnSm, StyledConfirmBtnSm, StyledAddServiceBtn,
} from './onboarding-step-styles';

interface Props {
    localDesigners: LocalDesigner[];
    onDesignersChange: (designers: LocalDesigner[]) => void;
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

export const OnboardingStep3 = ({localDesigners, onDesignersChange, onNext, onSkip, onBack}: Props) => {
    const [showAddDesigner, setShowAddDesigner] = useState(false);
    const [newDesignerName, setNewDesignerName] = useState('');
    const [newDesignerColor, setNewDesignerColor] = useState(
        () => getDesignerColor({id: DEFAULT_DESIGNER_ID_START + 1})
    );
    const [editingDesignerId, setEditingDesignerId] = useState<number | null>(null);
    const [step3Error, setStep3Error] = useState('');

    const handleAddDesigner = () => {
        const name = newDesignerName.trim();
        if (!name) { setStep3Error('디자이너 이름을 입력해 주세요.'); return; }
        if (localDesigners.some((d) => d.name === name)) {
            setStep3Error(`"${name}" 디자이너는 이미 있습니다.`);
            return;
        }
        const newId = Math.max(...localDesigners.map((d) => d.id)) + 1;
        onDesignersChange([...localDesigners, {id: newId, name, color: newDesignerColor}]);
        setNewDesignerName('');
        setNewDesignerColor(getDesignerColor({id: newId + 1}));
        setShowAddDesigner(false);
        setStep3Error('');
    };

    const handleRemoveDesigner = (id: number) => {
        onDesignersChange(localDesigners.filter((d) => d.id !== id));
        setEditingDesignerId(null);
        setStep3Error('');
    };

    const handleUpdateDesignerName = (id: number, name: string) => {
        onDesignersChange(localDesigners.map((d) => d.id === id ? {...d, name} : d));
        setStep3Error('');
    };

    const handleUpdateDesignerColor = (id: number, color: string) => {
        onDesignersChange(localDesigners.map((d) => d.id === id ? {...d, color} : d));
    };

    return (
        <>
            <StyledSectionNote>
                <StyledHighlight>디자이너 변경 및 추가는 초기 매장 설정 완료 이후 언제든 가능합니다.</StyledHighlight>
                <br/>디자이너를 등록하세요.
            </StyledSectionNote>

            <StyledDesignerList>
                {localDesigners.map((d) => (
                    <StyledDesignerCard key={d.id} $color={d.color} $isEditing={editingDesignerId === d.id}>
                        <StyledDesignerHeader>
                            <StyledDesignerHeaderLeft>
                                <StyledDesignerColorDot style={{background: d.color}} />
                                {editingDesignerId === d.id ? (
                                    <StyledDesignerNameInput
                                        value={d.name}
                                        onChange={(e) => handleUpdateDesignerName(d.id, e.target.value)}
                                        placeholder="디자이너명"
                                        autoFocus
                                    />
                                ) : (
                                    <StyledDesignerName>{d.name}</StyledDesignerName>
                                )}
                            </StyledDesignerHeaderLeft>
                            <StyledDesignerActions>
                                <StyledDesignerColorPicker
                                    type="color"
                                    value={d.color}
                                    onChange={(e) => handleUpdateDesignerColor(d.id, e.target.value)}
                                    disabled={editingDesignerId !== d.id}
                                    title="컬러 변경"
                                />
                                {editingDesignerId === d.id ? (
                                    <>
                                        {localDesigners.length > 1 && (
                                            <StyledInlineDeleteBtn type="button" onClick={() => handleRemoveDesigner(d.id)}>삭제</StyledInlineDeleteBtn>
                                        )}
                                        <StyledConfirmBtnSm type="button" onClick={() => setEditingDesignerId(null)}>완료</StyledConfirmBtnSm>
                                    </>
                                ) : (
                                    <StyledSmEditBtn type="button" onClick={() => setEditingDesignerId(d.id)}>수정</StyledSmEditBtn>
                                )}
                            </StyledDesignerActions>
                        </StyledDesignerHeader>
                    </StyledDesignerCard>
                ))}
            </StyledDesignerList>

            {!showAddDesigner && <FieldError variant="inline">{step3Error}</FieldError>}

            {showAddDesigner ? (
                <StyledAddForm>
                    <StyledAddFormRow>
                        <StyledAddInput
                            id="onboard-designer-name"
                            value={newDesignerName}
                            onChange={(e) => { setNewDesignerName(e.target.value); setStep3Error(''); }}
                            placeholder="디자이너명 *"
                            autoFocus
                        />
                        <StyledDesignerColorPicker
                            type="color"
                            value={newDesignerColor}
                            onChange={(e) => setNewDesignerColor(e.target.value)}
                            title="컬러"
                        />
                    </StyledAddFormRow>
                    <FieldError variant="inline">{step3Error}</FieldError>
                    <StyledAddFormActions>
                        <StyledCancelBtnSm type="button" onClick={() => { setShowAddDesigner(false); setNewDesignerName(''); setStep3Error(''); }}>취소</StyledCancelBtnSm>
                        <StyledConfirmBtnSm type="button" onClick={handleAddDesigner}>추가</StyledConfirmBtnSm>
                    </StyledAddFormActions>
                </StyledAddForm>
            ) : (
                <StyledAddServiceBtn type="button" onClick={() => setShowAddDesigner(true)}>
                    + 디자이너 추가
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

const StyledDesignerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerCard = styled.div<{$color: string; $isEditing: boolean}>`
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

const StyledDesignerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledDesignerHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
`;

const StyledDesignerActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledDesignerColorDot = styled.span`
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
`;

const StyledDesignerName = styled.span`
    flex: 1;
    font-size: 14px;
    font-weight: 700;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledDesignerNameInput = styled.input`
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

const StyledDesignerColorPicker = styled.input`
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
