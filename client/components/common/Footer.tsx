import styled from 'styled-components';

export const Footer = () => {
    return (
        <StyledFooter></StyledFooter>
    );
};

const StyledFooter = styled.footer `
  display: flex;
  justify-content: center;
  padding: 10px 0;
  border-top: solid 1px var(--light-gray-color);
  font-size: var(--small-font);
  color: var(--gray-color);
`;