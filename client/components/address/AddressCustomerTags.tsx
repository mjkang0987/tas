import React from 'react';

import styled from 'styled-components';

import type {CustomerMemoTag} from '../../utils/customers';
import {formControlStyle} from '../ui/FormControls';
import {ColorTag} from '../ui/ColorTag';
import {ColorPickerButton} from '../ui/ColorPickerButton';

type AddressCustomerTagsProps = {
    customerId: number;
    customerTags: CustomerMemoTag[];
    isEditing: boolean;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    onTagInputChange: (value: string) => void;
    onSelectColor: (color: string) => void;
    onAddTag: (customerId: number) => void;
    onRemoveTag: (customerId: number, text: string) => void;
    onStartEditing: (customerId: number) => void;
    onFinishEditing: () => void;
};

export function AddressCustomerTags({
    customerId,
    customerTags,
    isEditing,
    tagColors,
    tagInput,
    selectedColor,
    onTagInputChange,
    onSelectColor,
    onAddTag,
    onRemoveTag,
    onStartEditing,
    onFinishEditing,
}: AddressCustomerTagsProps) {
    return (
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
                                        onClick={() => onRemoveTag(customerId, tag.text)}
                                    >
                                        &#x2715;
                                    </button>
                                </StyledTag>
                            ))}
                        </StyledTagList>
                    )}
                    <StyledPalette>
                        {tagColors.map((color) => (
                            <ColorPickerButton
                                key={color}
                                $color={color}
                                $selected={selectedColor === color}
                                $size={18}
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
                                    onAddTag(customerId);
                                }
                            }}
                            placeholder="태그 입력"
                            autoFocus
                        />
                        <StyledMemoButton type="button" onClick={() => onAddTag(customerId)}>
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
                        onClick={() => onStartEditing(customerId)}
                    >
                        {customerTags.length > 0 ? '수정' : '추가'}
                    </StyledMemoButton>
                </>
            )}
        </StyledMemoCell>
    );
}

const StyledMemoCell = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 0 12px 12px;
`;

const StyledMemoText = styled.span<{ $isEmpty: boolean }>`
    font-size: var(--small-font);
    color: ${(props) => props.$isEmpty ? 'var(--dark-gray-color2)' : 'var(--black-color)'};
`;

const StyledMemoInput = styled.input`
    flex: 1;
    max-width: 200px;
    ${formControlStyle};
    padding: 0 8px;
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
    gap: 6px;
    flex: 1;
`;

const StyledTag = styled(ColorTag).attrs({ $shape: 'soft' as const })`
    font-size: var(--tiny-font);
    font-weight: 500;
    padding: 2px 6px;

    > button {
        border: none;
        background: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 9px;
        cursor: pointer;
        padding: 0;
        line-height: 1;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: var(--white-color);
            }
        }
    }
`;

const StyledTagReadonly = styled(ColorTag).attrs({ $shape: 'soft' as const })`
    font-size: var(--tiny-font);
    font-weight: 500;
    padding: 2px 8px;
`;

const StyledPalette = styled.div`
    display: flex;
    gap: 4px;
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

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--black-color-10);
    }
    }
`;
