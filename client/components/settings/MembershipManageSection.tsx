import styled from 'styled-components';

import {PageHero} from '../ui/PageHero';

// Phase 1: 골격 페이지. 매장 관리에서 "회원권 시스템 사용"을 켜면 이 메뉴/페이지가 열린다.
// Phase 2에서 상품 목록·발급·잔여 조회 UI, Phase 3에서 결제 차감 연동을 채운다.
export const MembershipManageSection = () => {
    return (
        <StyledWrap>
            <PageHero
                eyebrow="MEMBERSHIP"
                title="회원권 관리"
                subtitle="횟수·기간 회원권을 발급하고 잔여를 관리합니다."
            />
            <StyledPlaceholder>
                <StyledPlaceholderTitle>회원권 관리 화면 준비 중</StyledPlaceholderTitle>
                <StyledPlaceholderDesc>
                    회원권 상품 등록과 고객별 발급·차감 기능을 곧 제공합니다.
                </StyledPlaceholderDesc>
            </StyledPlaceholder>
        </StyledWrap>
    );
};

const StyledWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 48px 24px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
    text-align: center;
`;

const StyledPlaceholderTitle = styled.strong`
    font-size: 15px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledPlaceholderDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.6;
`;
