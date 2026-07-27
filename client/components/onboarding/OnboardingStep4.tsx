import styled from 'styled-components';

import {StyledNavRow, StyledBackBtn, StyledNextBtn} from './onboarding-step-styles';

interface Props {
    guest: boolean;
    onNext: () => void;
    onBack: () => void;
}

export const OnboardingStep4 = ({guest, onNext, onBack}: Props) => (
    <>
        <StyledNaverGuide>
            <StyledNaverGuideTitle>Google 계정 동기화를 통한 네이버 예약 연동</StyledNaverGuideTitle>
            {guest ? (
                <StyledGuestNote>
                    네이버 예약 연동은 <StyledGuestEm>① SNS 계정 연동 → ② Gmail 계정 연동</StyledGuestEm> 두 단계를 모두 완료해야 사용할 수 있습니다.
                    <br />완료하면 Gmail로 수신되는 네이버 예약 메일이 자동으로 일정표에 반영됩니다.
                </StyledGuestNote>
            ) : (
                <StyledNaverGuideList>
                    <StyledNaverGuideItem>네이버 스마트플레이스 &gt; 에약 &gt; 설정 &gt; 알림설정 &gt; 이메일 알림 예약 알림 메일 받을 Gmail 계정 추가</StyledNaverGuideItem>
                    <StyledNaverGuideItem>TAS 설정 → <strong>네이버 예약 연동</strong> 메뉴에서 연동 코드를 입력합니다.</StyledNaverGuideItem>
                    <StyledNaverGuideItem>연동 완료 후 네이버를 통한 예약이 자동으로 동기화됩니다.</StyledNaverGuideItem>
                    <StyledNaverGuideItem>등록되지 않은 서비스명은 자동으로 서비스에 추가됩니다.</StyledNaverGuideItem>
                </StyledNaverGuideList>
            )}
        </StyledNaverGuide>

        <StyledNavRow>
            <StyledBackBtn type="button" onClick={onBack}>← 이전</StyledBackBtn>
            <StyledNextBtn type="button" onClick={onNext}>다음</StyledNextBtn>
        </StyledNavRow>
    </>
);

const StyledNaverGuide = styled.div`
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: rgba(45, 127, 249, 0.05);
    border: 1px solid rgba(45, 127, 249, 0.15);
`;

const StyledNaverGuideList = styled.ol`
    margin: 8px 0 0;
    padding: 0 0 0 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledNaverGuideItem = styled.li`
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    line-height: 1.5;
`;

const StyledGuestNote = styled.p`
    margin: 8px 0 0;
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    line-height: 1.6;
`;

const StyledGuestEm = styled.strong`
    font-weight: 700;
    color: var(--blue-color);
`;

const StyledNaverGuideTitle = styled.p`
    margin: 0;
    font-size: var(--medium-font);
    font-weight: 700;
    color: var(--blue-color);
`;
