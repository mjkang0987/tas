import {useEffect} from 'react';

import type {NextPage} from 'next';

import {signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';

const LogoutPage: NextPage = () => {
    const {status} = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            void signOut({callbackUrl: '/login'});
        }
    }, [status]);

    return (
        <StyledSection>
            <StyledCard>
                <StyledTitle>로그아웃</StyledTitle>
                <StyledDescription>
                    {status === 'authenticated'
                        ? '로그아웃 처리 중입니다.'
                        : '이미 로그아웃된 상태입니다.'}
                </StyledDescription>
                <StyledButton type="button" onClick={() => {
                    void signOut({callbackUrl: '/login'});
                }}>
                    <AuthActionIcon direction="login" />
                    <span>로그인 화면으로 이동</span>
                </StyledButton>
            </StyledCard>
        </StyledSection>
    );
};

export default LogoutPage;

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
`;

const StyledCard = styled.div`
    width: 100%;
    max-width: 360px;
    padding: 28px 24px;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
    text-align: center;
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 24px;
    color: #111827;
`;

const StyledDescription = styled.p`
    margin: 12px 0 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.6;
`;

const StyledButton = styled.button`
    width: 100%;
    margin-top: 18px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    background: #111827;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
`;
