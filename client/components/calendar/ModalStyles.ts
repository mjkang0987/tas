import styled from 'styled-components';

export const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
`;

export const StyledDetail = styled.div`
  width: 300px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

export const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--light-gray-color);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  > button {
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    color: var(--gray-color);
  }
`;

export const StyledBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
`;

export const StyledForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    
    strong {
        padding-bottom: 4px;
    }

    label {
        span {
            font-size: 13px;
            color: var(--dark-gray-color);
            font-weight: 500;
        }

        input, select {
            height: 32px;
            padding: 0 8px;
            border: 1px solid var(--light-gray-color);
            border-radius: 4px;
            font-size: 13px;
            box-sizing: border-box;
            outline: none;

            &:focus {
                border-color: var(--blue-color);
            }
        }
    }
`;

export const StyledFieldRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
  > span, > strong {
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 500;
    padding-top: 4px;
  }
`;

export const StyledError = styled.p`
  margin: 10px 0 0;
  padding: var(--gap-md) var(--gap-lg);
  background-color: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  font-size: var(--small-font);
  color: var(--danger-color);
`;

export const StyledPriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--gap-xs);

  > input {
    flex: 1;
    text-align: right;
  }
`;

export const StyledPriceUnit = styled.span`
  flex-shrink: 0;
  font-size: 13px;
  color: var(--dark-gray-color);
`;

export const StyledStatusBadge = styled.span<{ $variant: 'danger' | 'warning' }>`
  display: inline-block;
  padding: 2px var(--gap-md);
  background-color: ${(p) => p.$variant === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)'};
  border: 1px solid ${(p) => p.$variant === 'danger' ? 'var(--danger-border)' : 'var(--warning-border)'};
  border-radius: var(--radius-sm);
  font-size: var(--small-font);
  font-weight: 600;
  color: ${(p) => p.$variant === 'danger' ? 'var(--danger-color)' : 'var(--warning-color)'};
`;

export const StyledModalMessage = styled.p<{ $color?: string }>`
  margin: 0 0 12px;
  font-size: var(--font);
  font-weight: 600;
  text-align: center;
  color: ${(p) => p.$color || 'var(--black-color)'};
`;

export const StyledDiffGrid = styled.dl`
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: var(--gap-xs) var(--gap-lg);
  margin: 0;

  dd {
    display: flex;
    align-items: center;
    gap: var(--gap-md);
  }

  del {
    color: var(--danger-color);
    text-decoration: line-through;
    font-size: var(--small-font);
  }

  ins {
    color: var(--success-color);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--small-font);

    &::before {
      content: "\\2192\\00a0";
      color: var(--gray-color);
      font-weight: 400;
    }
  }
`;

export const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 8px;
  padding: 0 16px 16px;
`;

export const StyledActionButton = styled.button<{ $primary?: boolean; $danger?: boolean; $warning?: boolean }>`
  height: 32px;
  padding: 0 16px;
  border: 1px solid ${(props) => props.$danger ? '#c93a30' : props.$warning ? '#EA4335' : props.$primary ? 'var(--blue-color)' : 'var(--light-gray-color)'};
  border-radius: 4px;
  background-color: ${(props) => props.$danger ? '#c93a30' : props.$warning ? '#EA4335' : props.$primary ? 'var(--blue-color)' : 'var(--white-color)'};
  color: ${(props) => (props.$danger || props.$primary || props.$warning) ? '#fff' : 'var(--dark-gray-color)'};
  font-size: var(--small-font);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
`;
