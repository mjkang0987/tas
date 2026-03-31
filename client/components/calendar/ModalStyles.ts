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
  padding: 8px 10px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 12px;
  color: #c93a30;
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
