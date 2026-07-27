import {useRouter} from 'next/router';

import styled from 'styled-components';

import {POLICIES, applyPolicyVars, type PolicySlug} from '../../content/policies';
import {SITE_NAME} from '../../lib/seo';
import {PageHero} from '../ui/PageHero';
import {SeoHead} from '../ui/SeoHead';
import {StyledContainer, StyledSection} from '../mypage/mypage.styles';
import {POLICY_ELEMENT_CSS, POLICY_VARS_DARK, POLICY_VARS_LIGHT} from './policyCss';

// 앱 인라인 정책 페이지(/terms, /privacy, /dpa)의 공통 레이아웃.
// 설정/마이페이지와 동일한 StyledSection > StyledContainer로 감싼다.
// 본문은 content/policies의 단일 소스에서 가져오므로 풀페이지(/policies/:slug)와 항상 동일하다.
export function PolicyPage({slug}: {slug: PolicySlug}) {
    const router = useRouter();
    const {navTitle, body} = POLICIES[slug];
    // 토큰이 화면에 새지 않도록 모든 렌더 경로가 치환을 통과한다(운영자 문서엔 토큰이 없어 무영향).
    const html = applyPolicyVars(body);

    return (
        <StyledSection>
            <SeoHead title={navTitle} description={`${SITE_NAME} ${navTitle}`} path={`/${slug}`} />
            <StyledContainer>
                <StyledHeader>
                    <PageHero eyebrow="정책" title={navTitle} />
                    <StyledCloseButton type="button" onClick={() => router.back()}>닫기</StyledCloseButton>
                </StyledHeader>
                <StyledBody dangerouslySetInnerHTML={{__html: html}} />
            </StyledContainer>
        </StyledSection>
    );
}

const StyledHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const StyledCloseButton = styled.button`
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color2);
    cursor: pointer;
`;

const StyledBody = styled.div`
    ${POLICY_VARS_LIGHT}
    color: var(--tas-fg);
    line-height: 1.75;
    font-size: 16px;
    word-break: keep-all;

    ${POLICY_ELEMENT_CSS}

    @media (prefers-color-scheme: dark) {
        ${POLICY_VARS_DARK}
    }
`;
