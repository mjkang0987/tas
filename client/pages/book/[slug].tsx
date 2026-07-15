import {useEffect, useMemo, useState} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {getStoreLabels} from '../../features/store-settings/labels';
import {SeoHead} from '../../components/ui/SeoHead';

interface BookServiceInfo {
    name: string;
    category: string;
    duration: number;
    price: number;
}
interface BookAssigneeInfo {
    id: string;
    name: string;
    color: string | null;
}
interface BookStoreInfo {
    storeName: string;
    shopType: string | null;
    services: BookServiceInfo[];
    assignees: BookAssigneeInfo[];
    settings: {allowAssigneeChoice: boolean; noticeText: string | null};
}

const ASSIGNEE_ANY = '__any__';

export default function BookingPage() {
    const router = useRouter();
    const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [info, setInfo] = useState<BookStoreInfo | null>(null);

    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [assigneeId, setAssigneeId] = useState<string>(ASSIGNEE_ANY);

    useEffect(() => {
        if (!slug) return;
        let alive = true;
        setLoading(true);
        fetch(`/api/book/${encodeURIComponent(slug)}`)
            .then((res) => {
                if (res.status === 404) { if (alive) setNotFound(true); return null; }
                return res.ok ? res.json() : Promise.reject(new Error('load failed'));
            })
            .then((data) => { if (alive && data) setInfo(data); })
            .catch(() => { if (alive) setNotFound(true); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [slug]);

    const labels = useMemo(() => getStoreLabels(info?.shopType ?? null), [info?.shopType]);

    const toggleService = (name: string) => {
        setSelectedServices((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
    };

    if (loading) {
        return <StyledWrap><StyledCard><StyledMuted>불러오는 중…</StyledMuted></StyledCard></StyledWrap>;
    }
    if (notFound || !info) {
        return (
            <StyledWrap>
                <SeoHead title="예약 페이지를 찾을 수 없습니다" />
                <StyledCard>
                    <StyledTitle>예약 페이지를 찾을 수 없습니다</StyledTitle>
                    <StyledMuted>주소가 올바른지 확인해 주세요.</StyledMuted>
                </StyledCard>
            </StyledWrap>
        );
    }

    const canNext = selectedServices.length > 0;

    return (
        <StyledWrap>
            <SeoHead title={`${info.storeName} 예약`} />
            <StyledCard>
                <StyledStore>{info.storeName}</StyledStore>
                <StyledTitle>온라인 예약</StyledTitle>
                {info.settings.noticeText && <StyledNotice>{info.settings.noticeText}</StyledNotice>}

                <StyledSectionLabel>{labels.service} 선택</StyledSectionLabel>
                <StyledServiceList>
                    {info.services.length === 0 && <StyledMuted>등록된 {labels.service}가 없습니다.</StyledMuted>}
                    {info.services.map((s) => {
                        const on = selectedServices.includes(s.name);
                        return (
                            <StyledServiceCard key={s.name} type="button" $on={on} onClick={() => toggleService(s.name)}>
                                <StyledServiceName>{s.name}</StyledServiceName>
                                <StyledServiceMeta>{s.duration}분 · {s.price.toLocaleString()}원</StyledServiceMeta>
                            </StyledServiceCard>
                        );
                    })}
                </StyledServiceList>

                {info.settings.allowAssigneeChoice && info.assignees.length > 0 && (
                    <>
                        <StyledSectionLabel>{labels.assignee} 선택</StyledSectionLabel>
                        <StyledSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                            <option value={ASSIGNEE_ANY}>상관없음</option>
                            {info.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </StyledSelect>
                    </>
                )}

                <StyledNextBtn type="button" disabled={!canNext} title={canNext ? '' : `${labels.service}를 선택해 주세요`}>
                    다음 (시간 선택) — 준비 중
                </StyledNextBtn>
                <StyledDevNote>* 시간 선택·예약 확정은 다음 단계에서 붙습니다.</StyledDevNote>
            </StyledCard>
        </StyledWrap>
    );
}

export const getServerSideProps = async () => ({props: {}});

const StyledWrap = styled.div`
    min-height: 100%;
    display: flex;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
    background: var(--aside-bg, #f4f6f8);
    @media (max-width: 640px) { padding: 0; }
`;

const StyledCard = styled.div`
    width: 100%;
    max-width: 480px;
    margin: auto 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 32px 24px 40px;
    background: var(--white-color, #fff);
    border-radius: 16px;
    box-shadow: var(--shadow-md, 0 6px 24px rgba(0,0,0,0.08));
    @media (max-width: 640px) { max-width: none; border-radius: 0; box-shadow: none; min-height: 100vh; }
`;

const StyledStore = styled.strong`
    font-size: 14px;
    color: var(--brand-color, #6526d9);
    font-weight: 700;
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--black-color, #111);
`;

const StyledNotice = styled.p`
    margin: 4px 0 0;
    padding: 10px 12px;
    background: var(--accent-soft, #f1ecfb);
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dark-gray-color, #444);
`;

const StyledSectionLabel = styled.strong`
    display: block;
    margin-top: 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--dark-gray-color, #444);
`;

const StyledServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledServiceCard = styled.button<{$on: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border: 2px solid ${(p) => (p.$on ? 'var(--brand-color, #6526d9)' : 'var(--light-gray-color, #e4e7eb)')};
    border-radius: 12px;
    background: ${(p) => (p.$on ? 'var(--accent-soft, #f1ecfb)' : 'var(--white-color, #fff)')};
    cursor: pointer;
    text-align: left;
`;

const StyledServiceName = styled.span`
    font-size: 15px;
    font-weight: 600;
    color: var(--black-color, #111);
`;

const StyledServiceMeta = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    color: var(--dark-gray-color2, #667);
`;

const StyledSelect = styled.select`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color, #e4e7eb);
    border-radius: 10px;
    font-size: 15px;
    background: var(--white-color, #fff);
`;

const StyledNextBtn = styled.button`
    margin-top: 20px;
    height: 50px;
    border: none;
    border-radius: 12px;
    background: var(--brand-color, #6526d9);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledDevNote = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--gray-color, #98a);
    text-align: center;
`;

const StyledMuted = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2, #667);
`;
