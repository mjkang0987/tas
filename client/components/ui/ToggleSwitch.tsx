import styled from 'styled-components';

type Props = {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
};

export function ToggleSwitch({checked, onChange, label, description}: Props) {
    return (
        <StyledRow>
            <StyledLabel>
                <span>{label}</span>
                {description && <StyledDesc>{description}</StyledDesc>}
            </StyledLabel>
            <StyledSwitch
                type="button"
                role="switch"
                aria-checked={checked}
                $on={checked}
                onClick={() => onChange(!checked)}
            >
                <StyledKnob $on={checked} />
            </StyledSwitch>
        </StyledRow>
    );
}

const StyledRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;

    & + & {
        border-top: 1px solid var(--light-gray-color);
    }
`;

const StyledLabel = styled.label`
    display: flex;
    flex-direction: column;
    gap: 3px;
    cursor: default;

    span {
        font-size: 14px;
        font-weight: 500;
        color: var(--dark-gray-color);
    }
`;

const StyledDesc = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
    line-height: 1.4;
`;

const StyledSwitch = styled.button<{$on: boolean}>`
    flex-shrink: 0;
    position: relative;
    width: 44px;
    height: 26px;
    border-radius: 999px;
    border: none;
    background: ${(p) => p.$on ? 'var(--brand-color)' : 'var(--light-gray-color)'};
    cursor: pointer;
    transition: background-color 0.2s;
    padding: 0;
`;

const StyledKnob = styled.span<{$on: boolean}>`
    position: absolute;
    top: 3px;
    left: ${(p) => p.$on ? '21px' : '3px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--white-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    transition: left 0.2s;
`;
