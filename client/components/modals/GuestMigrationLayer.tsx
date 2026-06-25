import React, {useCallback, useState} from 'react';

import styled from 'styled-components';

import {Spinner} from '../ui/Spinner';
import type {LocalDbSnapshot} from '../../lib/local-db';
import {createDefaultLocalDbSnapshot, saveLocalDbSnapshot} from '../../lib/local-db';
import type {Assignee} from '../../features/assignees/model';
import {
    StyledConfirmOverlay,
    StyledConfirmModal,
    StyledHeader,
    StyledHeaderTitle,
    StyledFooter,
    StyledActionButton,
} from '../calendar/overlays/ModalStyles';

interface Props {
    snapshot: LocalDbSnapshot;
    storeName: string;
    onFinish: () => void;
}

type Phase = 'confirm' | 'merging' | 'assignee-merge' | 'error';

interface MergePair {
    newAssignee: Assignee;
    existingAssignee: Assignee;
}

function clearLocalAndReload(snapshot: LocalDbSnapshot): void {
    const clean = createDefaultLocalDbSnapshot();
    clean.onboarded = false;
    saveLocalDbSnapshot(clean);
    // 마이그레이션된 데이터는 서버에 있으므로 로컬 스냅샷 내 고객 병합 기록도 초기화
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('customer-merge-reviewed');
    }
    // onboarded 플래그가 false이므로 재진입 시 마이그레이션이 재실행되지 않음
    void snapshot; // suppress unused warning
    window.location.reload();
}

export function GuestMigrationLayer({snapshot, storeName, onFinish}: Props) {
    const [phase, setPhase] = useState<Phase>('confirm');
    const [errorMsg, setErrorMsg] = useState('');
    const [mergePairs, setMergePairs] = useState<MergePair[]>([]);
    const [decisions, setDecisions] = useState<Map<number, 'merge' | 'keep'>>(new Map());
    const [processing, setProcessing] = useState(false);

    const handleDiscard = useCallback(() => {
        clearLocalAndReload(snapshot);
        onFinish();
    }, [snapshot, onFinish]);

    const handleMerge = useCallback(async () => {
        setPhase('merging');
        try {
            const res = await fetch('/api/migrate-local', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    shopName: snapshot.storeName ?? '',
                    shopType: snapshot.shopType ?? null,
                    services: snapshot.services,
                    assignees: snapshot.assignees.map((d) => ({id: d.id, name: d.name, color: d.color ?? null})),
                    customers: snapshot.customers,
                    reservations: snapshot.reservations,
                    confirm: true,
                }),
            });

            if (!res.ok) throw new Error('migration_failed');

            const data = await res.json() as {ok: boolean; newAssigneeLegacyIds: number[]};

            // 담당자 목록 로드 → 이름 중복 쌍 감지
            const assigneesRes = await fetch('/api/assignees');
            if (!assigneesRes.ok) throw new Error('assignees_failed');
            const assigneesData = await assigneesRes.json() as {assignees: Assignee[]};

            const newIdSet = new Set(data.newAssigneeLegacyIds);
            const newAssignees = assigneesData.assignees.filter((d) => newIdSet.has(d.id));
            const existingAssignees = assigneesData.assignees.filter((d) => !newIdSet.has(d.id));

            const pairs: MergePair[] = [];
            for (const nd of newAssignees) {
                const match = existingAssignees.find((ed) => ed.name === nd.name);
                if (match) pairs.push({newAssignee: nd, existingAssignee: match});
            }

            if (pairs.length > 0) {
                const initialDecisions = new Map<number, 'merge' | 'keep'>(
                    pairs.map((p) => [p.newAssignee.id, 'merge']),
                );
                setMergePairs(pairs);
                setDecisions(initialDecisions);
                setPhase('assignee-merge');
            } else {
                clearLocalAndReload(snapshot);
                onFinish();
            }
        } catch {
            setErrorMsg('병합에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setPhase('error');
        }
    }, [snapshot, onFinish]);

    const handleAssigneeMergeComplete = useCallback(async () => {
        setProcessing(true);
        try {
            for (const pair of mergePairs) {
                if (decisions.get(pair.newAssignee.id) !== 'merge') continue;
                await fetch('/api/assignees/merge', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sourceId: pair.newAssignee.id,
                        targetId: pair.existingAssignee.id,
                    }),
                });
            }
            clearLocalAndReload(snapshot);
            onFinish();
        } catch {
            setProcessing(false);
            setErrorMsg('담당자 병합에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setPhase('error');
        }
    }, [mergePairs, decisions, snapshot, onFinish]);

    const toggleDecision = useCallback((assigneeId: number) => {
        setDecisions((prev) => {
            const next = new Map(prev);
            next.set(assigneeId, prev.get(assigneeId) === 'merge' ? 'keep' : 'merge');
            return next;
        });
    }, []);

    if (phase === 'merging') {
        return (
            <StyledConfirmOverlay>
                <StyledConfirmModal>
                    <StyledSpinnerWrap>
                        <Spinner $size={32} />
                        <StyledSpinnerText>데이터를 병합하는 중...</StyledSpinnerText>
                    </StyledSpinnerWrap>
                </StyledConfirmModal>
            </StyledConfirmOverlay>
        );
    }

    if (phase === 'error') {
        return (
            <StyledConfirmOverlay>
                <StyledConfirmModal>
                    <StyledHeader><StyledHeaderTitle>오류</StyledHeaderTitle></StyledHeader>
                    <StyledBody>
                        <StyledErrorText>{errorMsg}</StyledErrorText>
                    </StyledBody>
                    <StyledFooter>
                        <StyledActionButton type="button" onClick={handleDiscard}>
                            게스트 데이터 삭제
                        </StyledActionButton>
                        <StyledActionButton
                            type="button"
                            $primary
                            onClick={() => setPhase('confirm')}
                        >
                            다시 시도
                        </StyledActionButton>
                    </StyledFooter>
                </StyledConfirmModal>
            </StyledConfirmOverlay>
        );
    }

    if (phase === 'assignee-merge') {
        return (
            <StyledConfirmOverlay>
                <StyledWiderModal>
                    <StyledHeader>
                        <StyledHeaderTitle>담당자 병합</StyledHeaderTitle>
                    </StyledHeader>
                    <StyledBody>
                        <StyledDesc>
                            게스트 데이터에 기존 담당자와 이름이 같은 담당자가 있습니다.
                            같은 담당자라면 <strong>병합</strong>을 선택해 예약을 합쳐주세요.
                        </StyledDesc>
                        <StyledPairList>
                            {mergePairs.map((pair) => {
                                const decision = decisions.get(pair.newAssignee.id) ?? 'merge';
                                return (
                                    <StyledPairRow key={pair.newAssignee.id}>
                                        <StyledPairNames>
                                            <StyledPairName>{pair.existingAssignee.name}</StyledPairName>
                                            <StyledPairArrow>+</StyledPairArrow>
                                            <span>{pair.newAssignee.name} (게스트)</span>
                                        </StyledPairNames>
                                        <StyledToggleGroup>
                                            <StyledToggleBtn
                                                type="button"
                                                $active={decision === 'merge'}
                                                onClick={() => toggleDecision(pair.newAssignee.id)}
                                            >
                                                병합
                                            </StyledToggleBtn>
                                            <StyledToggleBtn
                                                type="button"
                                                $active={decision === 'keep'}
                                                onClick={() => toggleDecision(pair.newAssignee.id)}
                                            >
                                                따로 유지
                                            </StyledToggleBtn>
                                        </StyledToggleGroup>
                                    </StyledPairRow>
                                );
                            })}
                        </StyledPairList>
                    </StyledBody>
                    <StyledFooter>
                        <StyledActionButton
                            type="button"
                            $primary
                            disabled={processing}
                            onClick={handleAssigneeMergeComplete}
                        >
                            {processing ? '처리 중...' : '완료'}
                        </StyledActionButton>
                    </StyledFooter>
                </StyledWiderModal>
            </StyledConfirmOverlay>
        );
    }

    // phase === 'confirm'
    const {customers, reservations, assignees} = snapshot;
    return (
        <StyledConfirmOverlay>
            <StyledConfirmModal>
                <StyledHeader>
                    <StyledHeaderTitle>로컬 데이터 병합</StyledHeaderTitle>
                </StyledHeader>
                <StyledBody>
                    <StyledDesc>
                        <strong>{storeName}</strong> 매장에 이미 데이터가 있습니다.
                        게스트 모드에서 만든 데이터를 어떻게 하시겠습니까?
                    </StyledDesc>
                    <StyledStats>
                        {assignees.length > 0 && <StyledStatItem>담당자 {assignees.length}명</StyledStatItem>}
                        {customers.length > 0 && <StyledStatItem>고객 {customers.length}명</StyledStatItem>}
                        {reservations.length > 0 && <StyledStatItem>예약 {reservations.length}건</StyledStatItem>}
                    </StyledStats>
                </StyledBody>
                <StyledFooter>
                    <StyledActionButton type="button" $dangerOutline onClick={handleDiscard}>
                        삭제
                    </StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleMerge}>
                        병합
                    </StyledActionButton>
                </StyledFooter>
            </StyledConfirmModal>
        </StyledConfirmOverlay>
    );
}

const StyledSpinnerWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 24px;
`;

const StyledSpinnerText = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledBody = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
`;

const StyledDesc = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--dark-gray-color);
`;

const StyledErrorText = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--danger-color);
    line-height: 1.5;
`;

const StyledStats = styled.ul`
    margin: 0;
    padding: 12px 16px;
    background: var(--black-color-10);
    border-radius: var(--radius-md);
    list-style: disc;
    list-style-position: inside;
`;

const StyledStatItem = styled.li`
    font-size: 13px;
    color: var(--dark-gray-color);
    line-height: 1.8;
`;

const StyledWiderModal = styled(StyledConfirmModal)`
    width: min(480px, 92vw);
`;

const StyledPairList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledPairRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: var(--black-color-10);
    border-radius: var(--radius-md);

    @media (max-width: 480px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const StyledPairNames = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--dark-gray-color);
    min-width: 0;
    flex: 1;
`;

const StyledPairName = styled.strong`
    font-weight: 600;
    color: var(--black-color);
`;

const StyledPairArrow = styled.span`
    flex-shrink: 0;
    font-size: 14px;
    color: var(--brand-color);
    font-weight: 600;
`;

const StyledToggleGroup = styled.div`
    display: flex;
    gap: 4px;
    flex-shrink: 0;
`;

const StyledToggleBtn = styled.button<{$active: boolean}>`
    height: 28px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: ${(p) => (p.$active ? 600 : 400)};
    border: 1px solid ${(p) => (p.$active ? 'var(--brand-color)' : 'var(--light-gray-color)')};
    background: ${(p) => (p.$active ? 'var(--brand-color)' : 'var(--white-color)')};
    color: ${(p) => (p.$active ? 'var(--white-color)' : 'var(--dark-gray-color)')};
    transition: background 0.12s, color 0.12s, border-color 0.12s;
`;
