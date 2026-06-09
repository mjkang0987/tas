import {useCallback, useEffect, useState} from 'react';

import type {NextPage} from 'next';
import {useSession} from 'next-auth/react';
import styled from 'styled-components';

import {PageHero} from '../components/ui/PageHero';
import {actionButtonStyle} from '../components/settings/settings-styles';
import {FieldError} from '../components/ui/FieldError';

type InquiryTab = 'form' | 'history';

interface InquiryRecord {
    id: string;
    name: string;
    email: string;
    content: string;
    createdAt: string;
}

const InquiryPage: NextPage = () => {
    const {data: session} = useSession();
    const [activeTab, setActiveTab] = useState<InquiryTab>('form');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setName((prev) => prev || session.user?.name || '');
            setEmail((prev) => prev || session.user?.email || '');
        }
    }, [session]);

    const loadHistory = useCallback(() => {
        setHistoryLoading(true);
        fetch('/api/inquiry')
            .then((res) => res.json())
            .then((data) => setInquiries(data.inquiries ?? []))
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, loadHistory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('이름을 입력해 주세요.');
            return;
        }
        if (!content.trim()) {
            setError('문의 내용을 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/inquiry', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: name.trim(), email: email.trim(), content: content.trim()}),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || '전송에 실패했습니다.');
                return;
            }
            setSubmitted(true);
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <StyledSection>
            <StyledContainer>
                <PageHero eyebrow="SUPPORT" title="고객센터" />
                <StyledStickyHeader>
                    <StyledTabRow>
                        <StyledTabButton type="button" $active={activeTab === 'form'} onClick={() => setActiveTab('form')}>문의하기</StyledTabButton>
                        <StyledTabButton type="button" $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>문의내역</StyledTabButton>
                    </StyledTabRow>
                </StyledStickyHeader>
                <StyledCard>
                    {activeTab === 'form' && (
                        <>
                            {submitted ? (
                                <StyledSuccess>
                                    <strong>문의가 접수되었습니다.</strong>
                                    <span>확인 후 빠르게 답변드리겠습니다.</span>
                                    <StyledResetButton type="button" onClick={() => {
                                        setSubmitted(false);
                                        setContent('');
                                    }}>
                                        추가 문의하기
                                    </StyledResetButton>
                                </StyledSuccess>
                            ) : (
                                <StyledForm onSubmit={handleSubmit}>
                                    <StyledFieldGroup>
                                        <label htmlFor="inquiry-name">
                                            <strong>이름 <StyledRequired>*</StyledRequired></strong>
                                        </label>
                                        <StyledInput
                                            id="inquiry-name"
                                            type="text"
                                            placeholder="이름을 입력해 주세요"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </StyledFieldGroup>
                                    <StyledFieldGroup>
                                        <label htmlFor="inquiry-email">
                                            <strong>답변 받으실 이메일</strong>
                                        </label>
                                        <StyledInput
                                            id="inquiry-email"
                                            type="email"
                                            placeholder="답변 받으실 이메일 (선택)"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </StyledFieldGroup>
                                    <StyledFieldGroup>
                                        <label htmlFor="inquiry-content">
                                            <strong>문의 내용 <StyledRequired>*</StyledRequired></strong>
                                        </label>
                                        <StyledTextarea
                                            id="inquiry-content"
                                            placeholder="문의 내용을 입력해 주세요"
                                            rows={6}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                        />
                                    </StyledFieldGroup>
                                    <FieldError>{error}</FieldError>
                                    <StyledSubmitButton type="submit" disabled={submitting}>
                                        {submitting ? '전송 중...' : '문의 전송'}
                                    </StyledSubmitButton>
                                </StyledForm>
                            )}
                        </>
                    )}
                    {activeTab === 'history' && (
                        <>
                            {historyLoading ? (
                                <StyledEmpty>불러오는 중...</StyledEmpty>
                            ) : inquiries.length === 0 ? (
                                <StyledEmpty>문의 내역이 없습니다.</StyledEmpty>
                            ) : (
                                <StyledHistoryList>
                                    {inquiries.map((inquiry) => (
                                        <StyledHistoryCard key={inquiry.id}>
                                            <StyledHistoryHead>
                                                <StyledHistoryMeta>
                                                    <strong>{inquiry.name}</strong>
                                                    {inquiry.email && <span>{inquiry.email}</span>}
                                                </StyledHistoryMeta>
                                                <StyledHistoryDate>
                                                    {inquiry.createdAt.slice(0, 16).replace('T', ' ')}
                                                </StyledHistoryDate>
                                            </StyledHistoryHead>
                                            <StyledHistoryContent>{inquiry.content}</StyledHistoryContent>
                                        </StyledHistoryCard>
                                    ))}
                                </StyledHistoryList>
                            )}
                        </>
                    )}
                </StyledCard>
                <StyledFooterCs>Take a seat CS: <a href="mailto:takeaseat.cs@gmail.com">takeaseat.cs@gmail.com</a></StyledFooterCs>
            </StyledContainer>
        </StyledSection>
    );
};

export default InquiryPage;

const StyledSection = styled.section`
    flex: 1;
    box-sizing: border-box;
`;

const StyledContainer = styled.div`
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 8px;
    box-sizing: border-box;
`;

const StyledStickyHeader = styled.div`
    position: sticky;
    top: 0;
    z-index: 12;
    margin: 0 -8px;
    padding: 10px 8px;
    border-bottom: 1px solid var(--light-gray-color);
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledTabRow = styled.div`
    display: flex;
    gap: 8px;
`;

const StyledTabButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    flex-shrink: 0;
    min-width: 72px;
    border: 1px solid ${(props) => props.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    background: ${(props) => props.$active ? 'rgba(45, 127, 249, 0.1)' : 'var(--white-color)'};
    color: ${(props) => props.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(props) => props.$active ? 700 : 500};
`;

const StyledCard = styled.div`
    margin-top: 8px;
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: var(--card-radius);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
`;

const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledFieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
        font-size: 13px;
        color: #374151;
    }

    strong {
        font-weight: 600;
    }
`;

const StyledRequired = styled.span`
    color: var(--danger-color);
`;

const StyledInput = styled.input`
    width: 100%;
    padding: 10px 12px;
    box-sizing: border-box;
    border: 1px solid #d1d5db;
    border-radius: var(--radius-md);
    font-size: 14px;
    outline: none;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 2px rgba(45, 127, 249, 0.15);
    }
`;

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    box-sizing: border-box;
    border: 1px solid #d1d5db;
    border-radius: var(--radius-md);
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    outline: none;
    font-family: inherit;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 2px rgba(45, 127, 249, 0.15);
    }
`;


const StyledSubmitButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 44px;
    border: none;
    border-radius: var(--radius-lg);
    background: #111827;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    transition: opacity 0.15s;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) {
            opacity: 0.85;
        }
    }
`;

const StyledSuccess = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 20px;

    strong {
        font-size: 16px;
        color: #111827;
    }

    span {
        font-size: 13px;
        color: #6b7280;
    }
`;

const StyledResetButton = styled.button`
    margin-top: 12px;
    padding: 10px 24px;
    border: 1px solid #d1d5db;
    border-radius: var(--radius-lg);
    background: var(--white-color);
    color: #111827;
    font-size: 14px;
    font-weight: 600;
`;

const StyledEmpty = styled.div`
    padding: 40px 20px;
    text-align: center;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledHistoryList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledHistoryCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--gray-color2);
`;

const StyledHistoryHead = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledHistoryMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }

    strong {
        font-size: 13px;
    }

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }
`;

const StyledHistoryDate = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledHistoryContent = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dark-gray-color);
    white-space: pre-wrap;
    word-break: break-word;
`;

const StyledFooterCs = styled.p`
    margin: auto 0 0;
    padding: 24px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--dark-gray-color2);

    a {
        color: inherit;
        text-decoration: none;
        font-weight: 600;

        @media (hover: hover) and (pointer: fine) {
            &:hover { text-decoration: underline; }
        }
    }
`;
