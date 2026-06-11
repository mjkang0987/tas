import styled from 'styled-components';

import {FieldError} from '../ui/FieldError';
import type {ServiceItem} from '../../utils/services';
import type {ShopType} from '../../features/services/default-services';
import type {LocalDesigner} from './onboarding-types';
import {SHOP_TYPES} from './onboarding-types';
import {StyledNavRow, StyledBackBtn} from './onboarding-step-styles';

interface Props {
    shopName: string;
    realShopTypes: ShopType[];
    localServices: ServiceItem[];
    localDesigners: LocalDesigner[];
    finalError: string;
    loading: boolean;
    onComplete: () => void;
    onBack: () => void;
}

export const OnboardingStep5 = ({shopName, realShopTypes, localServices, localDesigners, finalError, loading, onComplete, onBack}: Props) => (
    <>
        <StyledCompleteSection>
            <StyledCompleteIcon>✓</StyledCompleteIcon>
            <StyledCompleteTitle>매장 설정이 완료되었습니다.</StyledCompleteTitle>
            <StyledCompleteSummary>
                {shopName.trim() && (
                    <StyledSummaryRow>
                        <span>매장명</span>
                        <strong>{shopName.trim()}</strong>
                    </StyledSummaryRow>
                )}
                {realShopTypes.length > 0 && (
                    <StyledSummaryRow>
                        <span>업종</span>
                        <strong>
                            {realShopTypes.map((t) => SHOP_TYPES.find((s) => s.type === t)?.label).filter(Boolean).join(', ')}
                        </strong>
                    </StyledSummaryRow>
                )}
                <StyledSummaryRow>
                    <span>서비스</span>
                    <strong>{localServices.length}개</strong>
                </StyledSummaryRow>
                <StyledSummaryRow>
                    <span>디자이너</span>
                    <strong>{localDesigners.length}명</strong>
                </StyledSummaryRow>
            </StyledCompleteSummary>
        </StyledCompleteSection>

        <FieldError>{finalError}</FieldError>

        <StyledNavRow $centered>
            <StyledBackBtn type="button" onClick={onBack}>← 이전</StyledBackBtn>
            <StyledSubmitBtn type="button" onClick={onComplete} disabled={loading}>
                {loading ? '설정 중...' : '시작하기'}
            </StyledSubmitBtn>
        </StyledNavRow>
    </>
);

const StyledCompleteSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 0;
`;

const StyledCompleteIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--success-bg);
    color: var(--success-color);
    font-size: 28px;
    font-weight: 700;
`;

const StyledCompleteTitle = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--black-color);
    text-align: center;
`;

const StyledCompleteSummary = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    border: 1px solid var(--light-gray-color);
`;

const StyledSummaryRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    span {
        font-size: 13px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 600;
    }
`;

const StyledSubmitBtn = styled.button`
    min-height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: var(--brand-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: opacity 0.15s;

    &:disabled { opacity: 0.6; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) { opacity: 0.88; }
    }
`;
