import styled from 'styled-components';

import {FieldError} from '../ui/FieldError';
import type {ExtShopType} from './onboarding-types';
import {SHOP_TYPES} from './onboarding-types';
import {StyledNavRow, StyledBackBtn, StyledSkipBtn, StyledNextBtn} from './onboarding-step-styles';

interface Props {
    shopName: string;
    onShopNameChange: (v: string) => void;
    shopTypes: ExtShopType[];
    onToggleShopType: (t: ExtShopType) => void;
    shopNameError: string;
    shopTypeError: string;
    guest: boolean;
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

export const OnboardingStep1 = ({
    shopName, onShopNameChange, shopTypes, onToggleShopType,
    shopNameError, shopTypeError, guest, onNext, onSkip, onBack,
}: Props) => (
    <>
        <StyledSection>
            <StyledLabel htmlFor="shop-name">샵 이름</StyledLabel>
            <StyledInput
                id="shop-name"
                type="text"
                value={shopName}
                onChange={(e) => onShopNameChange(e.target.value)}
                placeholder="예) 우리 매장"
                autoFocus
            />
            <FieldError variant="inline">{shopNameError}</FieldError>
        </StyledSection>

        <StyledSection>
            <StyledLabel>업종 (복수 선택 가능)</StyledLabel>
            <StyledTypeGrid>
                {SHOP_TYPES.map(({type, label, emoji, desc}) => (
                    <StyledTypeCard
                        key={type}
                        type="button"
                        $selected={shopTypes.includes(type)}
                        onClick={() => onToggleShopType(type)}
                    >
                        <StyledTypeEmoji>{emoji}</StyledTypeEmoji>
                        <StyledTypeLabel>{label}</StyledTypeLabel>
                        <StyledTypeDesc>{desc}</StyledTypeDesc>
                    </StyledTypeCard>
                ))}
            </StyledTypeGrid>
        </StyledSection>

        <FieldError>{shopTypeError}</FieldError>

        <StyledNavRow>
            {guest && <StyledBackBtn type="button" onClick={onBack}>← 이전</StyledBackBtn>}
            <StyledSkipBtn $leftAlign={!guest} type="button" onClick={onSkip}>건너뛰기</StyledSkipBtn>
            <StyledNextBtn type="button" onClick={onNext}>다음</StyledNextBtn>
        </StyledNavRow>
    </>
);

const StyledSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledInput = styled.input`
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;

    &::placeholder { color: var(--gray-color); }
    &:focus { border-color: var(--blue-color); }
`;

const StyledTypeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const StyledTypeCard = styled.button<{$selected: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 8px;
    border: 2px solid ${(p) => p.$selected ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-lg);
    background: ${(p) => p.$selected ? 'rgba(45, 127, 249, 0.06)' : 'var(--white-color)'};
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--blue-color);
            background: rgba(45, 127, 249, 0.04);
        }
    }
`;

const StyledTypeEmoji = styled.span`
    font-size: 24px;
    line-height: 1;
`;

const StyledTypeLabel = styled.strong`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledTypeDesc = styled.span`
    font-size: 10px;
    color: var(--dark-gray-color2);
    text-align: center;
    line-height: 1.4;
`;
