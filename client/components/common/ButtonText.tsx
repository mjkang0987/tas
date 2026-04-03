import React from 'react';

import styled from 'styled-components';

interface Props {
    children: React.ReactNode | string
    a11y: boolean
}

const StyledButtonText = styled.span <{ $a11y: boolean }>`
    display: flex;
    position: relative;
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    ${props => props.$a11y && `
      overflow: hidden;
      position: absolute;
      border: 0;
      margin: -1px;
      width: 1px;
      height: 1px;
      clip: rect(1px, 1px, 1px, 1px);
      clip-path: inset(50%);
    }
  `};
`;

export const ButtonText: React.FC<Props> = ({children, a11y}) => {
    return <StyledButtonText $a11y={a11y}>{children}</StyledButtonText>;
};