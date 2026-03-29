import styled from 'styled-components';
import {InputWrap} from "./Input";
import Link from "next/link";
import React from "react";

export const Footer = () => {
    return (
        <StyledFooter>
            <div>
                <InputWrap htmlFor="inputSearch"
                           inputIcon="search">
                    <input type="text"
                           id="inputSearch"
                           placeholder="사용자 검색"/>
                </InputWrap>
                <Link href="/address">📖 전체보기</Link>
            </div>
        </StyledFooter>
    );
};

const StyledFooter = styled.footer `
  padding: 10px;
  border-top: solid 1px var(--light-gray-color);
  font-size: var(--small-font);
  color: var(--gray-color);
`;