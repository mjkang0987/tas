import React, {ReactNode} from 'react';

import Link from 'next/link';

import {
    useRecoilState,
    useRecoilValue,
    useSetRecoilState
} from 'recoil';

import styled from 'styled-components';

import {
    asideState,
    targetState,
    targetStateState,
    viewState
} from '../../recoil/atoms';

import {
    ASIDE as asides,
    ViewType
} from '../../utils/constants';

import {InputWrap} from './Input';

interface Props {
    isVisible: boolean;
    children: ReactNode;
}

export const AsideComponent = () => {
    const [aside, setAside] = useRecoilState(asideState);

    const setView = useSetRecoilState(viewState);

    const currValue = useRecoilValue(targetState)

    const setCurr = useSetRecoilState(targetStateState);

    const setChangeView = ({viewType}: { viewType: string }) => {
        setAside({
            isVisible: !aside.isVisible
        });

        setView({type: viewType.toLowerCase()});

        if (viewType === ViewType.Week) {
            setCurr(new Date(Number(currValue.fullYear), Number(currValue.month), Number(currValue.date) - Number(currValue.day)));
        }
    };

    const setAsPath = (path: string) => {
        let result: (string | number)[] = [path, currValue.fullYear];

        if (path !== ViewType.Year) {
            result.push(Number(currValue.month + 1));
        }

        if (path === ViewType.Day) {
            result.push(Number(currValue.date));
        }

        return result;
    };

    return (<StyledAside isVisible={aside.isVisible}>
            {currValue && Object.keys(asides).map((a) =>
                <Link href={`/`}
                      as={`/${setAsPath(a.toLowerCase()).join('/')}`}
                      key={asides[a].id}
                      onClick={() => setChangeView({viewType: a})}>
                    <StyledLinkStyle>{asides[a].title}</StyledLinkStyle>
                </Link>
            )}
            <StyledAddressLink>
                <InputWrap inputIcon="search">
                    <input type="text"
                           placeholder="사용자 검색"/>
                </InputWrap>
                <Link href="/address"
                      passHref>📖 전체보기</Link>
            </StyledAddressLink>
        </StyledAside>
    );
};

const StyledAside = styled.aside <Props>`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${props => (!props.isVisible) && 'display: none'};
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 220px;
  max-width: 80%;
  padding: 53px 15px 0;
  border-right: solid 1px var(--light-gray-color);
  box-sizing: border-box;
  background-color: #fff;
  box-shadow: 10px 0 10px 0 rgba(0 0 0 / .1);
  z-index: 2;
`;

const StyledLinkStyle = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 35px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  background-color: var(--white-color);
  border-radius: 5px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
  font-size: var(--small-font);
`;

const StyledAddressLink = styled.div`
  margin-top: auto;
`;