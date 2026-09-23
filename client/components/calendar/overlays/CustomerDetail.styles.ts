import styled from 'styled-components';

import {StyledEmpty} from '../../settings/settings-styles';

import {OVERLAY_Z_INDEX, StyledDetail, StyledOverlay, scrollContentStyle, scrollHintStyle} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {ColorTag} from '../../ui/ColorTag';
export const StyledCustomerOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.childDetail};
`;

export const StyledCustomerDetail = styled(StyledDetail)`
    width: 360px;
`;

export const StyledCustomerContent = styled.div`
    ${scrollContentStyle};
    display: flex;
    flex-direction: column;
`;

export const StyledHeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

export const StyledHeaderActionButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    height: 30px;
    padding: 0 10px;
    border: ${props => (props.$danger || props.$primary) ? 'none' : '1px solid var(--border-color)'};
    border-radius: 8px;
    background: ${props => props.$danger ? 'var(--danger-color)' : props.$primary ? 'var(--brand-color)' : 'var(--white-color)'};
    color: ${props => (props.$danger || props.$primary) ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    font-size: var(--small-font);
    font-weight: 600;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const StyledHeaderCloseButton = styled(CloseIconButton)`
    flex-shrink: 0;
`;

export const StyledInfo = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);
`;

export const StyledInfoList = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 4px 12px;
    margin: 0;
`;

export const StyledInfoTerm = styled.dt`
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    font-weight: 500;
`;

export const StyledInfoDesc = styled.dd`
    margin: 0;
    font-size: var(--medium-font);
`;

export const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

export const StyledNoshowCount = styled.span<{ $hasNoshow: boolean }>`
    color: ${(p) => p.$hasNoshow ? 'var(--warning-color)' : 'inherit'};
    font-weight: ${(p) => p.$hasNoshow ? 700 : 'inherit'};
`;

export const StyledEditFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const StyledEditFieldLabel = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const StyledEditFieldLabelText = styled.span`
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;

export const StyledEditFieldInput = styled.input`
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: var(--medium-font);
`;

export const StyledPointInfo = styled.div`
    font-size: var(--small-font);
    font-weight: 700;
    color: var(--brand-color);
`;

export const StyledDupWarning = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--warning-border-soft);
    border-radius: var(--radius-lg);
    background: var(--warning-bg-soft);
`;

export const StyledDupWarningText = styled.p`
    margin: 0;
    font-size: var(--small-font);
    line-height: 1.5;
    color: var(--warning-text);

    strong {
        font-weight: 700;
    }
`;

export const StyledDupWarningActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

export const StyledDupWarningButton = styled.button<{$variant: 'merge' | 'keep' | 'cancel'}>`
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;

    ${({$variant}) => $variant === 'merge' && `
        border: 1px solid var(--brand-color);
        background: var(--brand-color);
        color: var(--white-color);
    `}
    ${({$variant}) => $variant === 'keep' && `
        border: 1px solid var(--light-gray-color);
        background: var(--white-color);
        color: var(--black-color);
    `}
    ${({$variant}) => $variant === 'cancel' && `
        border: 1px solid transparent;
        background: transparent;
        color: var(--dark-gray-color2);
    `}

    &:disabled {
        opacity: .5;
        cursor: default;
    }
`;

export const StyledNotesSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: var(--font);
        font-weight: 600;
    }
`;

export const StyledNoteList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledNoteItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
        font-size: var(--small-font);
        color: var(--dark-gray-color);
    }

    span {
        font-size: var(--small-font);
        color: var(--dark-gray-color2);
        white-space: pre-wrap;
    }
`;

export const StyledNoteEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    span {
        font-size: var(--small-font);
        font-weight: 600;
        color: var(--dark-gray-color);
    }

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: var(--small-font);
        font-family: inherit;
    }
`;

export const StyledReservationSection = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

export const StyledPointHistorySection = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);
`;

export const StyledPointHistoryTitle = styled.h4`
    margin: 0;
    font-size: var(--font);
    font-weight: 600;
`;

export const StyledPointHistoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

export const StyledPointHistoryMoreButton = styled.button`
    border: none;
    background: none;
    font-size: var(--small-font);
    color: var(--brand-color);
    font-weight: 600;
    padding: 0;
`;

export const StyledPointHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledPointHistoryModal = styled(StyledDetail)`
    width: min(360px, 90vw);
    max-height: 70vh;
`;

export const StyledPointHistoryModalContent = styled.div`
    ${scrollContentStyle};
    padding: 8px;
`;

export const StyledAddressMemoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);
`;

export const StyledAddressMemoTitle = styled.h4`
    margin: 0;
    font-size: var(--font);
    font-weight: 600;
`;

export const StyledAddressMemoList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const StyledTagEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledTagInputRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
`;

export const StyledTagInput = styled.input`
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: var(--small-font);
`;

export const StyledTagAddButton = styled.button`
    height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: var(--brand-color);
    color: var(--white-color);
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;
`;

export const StyledColorRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const StyledAddressMemoItem = styled(ColorTag)`
    min-height: 24px;
    padding: 3px 7px;
    font-size: var(--small-font);
    gap: 6px;
`;

export const StyledTagRemoveButton = styled.button`
    border: none;
    background: transparent;
    color: inherit;
    font-size: var(--xsmall-font);
    font-weight: 700;
`;

export const StyledEditError = styled.p`
    margin: 0;
    font-size: var(--small-font);
    color: var(--danger-color);
`;

export const StyledPointHistoryList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledPointHistoryItem = styled.li<{$clickable?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    cursor: ${(p) => p.$clickable ? 'pointer' : 'default'};

    ${(p) => p.$clickable && `
        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: var(--gray-color2);
            }
        }
    `}
`;

export const StyledPointHistoryTop = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
`;

export const StyledPointHistoryType = styled.strong`
    font-size: var(--small-font);
    font-weight: 600;
`;

export const StyledPointHistoryDelta = styled.span`
    font-size: var(--small-font);
    font-weight: 700;
    color: var(--brand-color);
`;

export const StyledPointHistoryMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

export const StyledEmptyText = styled(StyledEmpty).attrs({$size: 'sm' as const})`
    padding: 12px 0;
`;

export const StyledReservationScroll = styled.div`
    ${scrollContentStyle};
    padding: 8px 8px 30px;
`;

export const StyledReservationTitle = styled.h4`
    margin: 0 0 8px;
    font-size: var(--font);
    font-weight: 600;
`;

export const StyledMoreButton = styled.button`
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid var(--dark-gray-color2);
    border-radius: 4px;
    background: none;
    font-size: var(--medium-font);
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

export const StyledUnmergeOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledUnmergeModal = styled(StyledDetail)`
    width: min(360px, 90vw);
`;

export const StyledUnmergeContent = styled.div`
    padding: 12px;
`;

export const StyledUnmergeMessage = styled.p`
    margin: 0 0 10px;
    font-size: var(--medium-font);
    line-height: 1.5;
    color: var(--dark-gray-color);
    word-break: keep-all;
`;

export const StyledUnmergeHighlight = styled.strong`
    color: #0f172a;
`;

export const StyledUnmergeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledUnmergeItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--gray-color2);
    font-size: var(--small-font);
`;

export const StyledUnmergeName = styled.strong`
    font-weight: 700;
    color: #0f172a;
`;

export const StyledUnmergeTel = styled.span`
    color: var(--dark-gray-color2);
`;

export const StyledUnmergeDate = styled.span`
    margin-left: auto;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

export const StyledUnmergeFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
`;

/* 수정 중 하단에 뜨는 "비슷한 고객" — 저장 전에 같은 사람을 알아채라고 두는 자리다.
   저장 시 중복 경고(StyledDupWarning)가 경고 톤인 것과 달리 여기는 정보 톤을 쓴다. */
/* 추천 레이어의 기준점. 연락처 입력칸을 감싸 그 아래로 띄운다. */
export const StyledSimilarAnchor = styled.div`
    position: relative;
`;

export const StyledSimilarSection = styled.section`
    /* 라이브 리전은 항상 DOM 에 있어야 내용 변화가 읽힌다(ToastContainer 와 같은 규약).
       비었을 때는 hidden 으로 감춘다 — display:flex 가 UA 의 [hidden] 을 덮으므로 다시 눌러준다. */
    &[hidden] {
        display: none;
    }

    /* 흐름에서 빼 입력칸 아래로 띄운다 — 아래 내용을 밀어내지 않고,
       입력칸 자신은 가리지 않는다. 딤 배경은 두지 않는다(타이핑이 끊긴다). */
    position: absolute;
    top: calc(100% + var(--gap-xs));
    left: 0;
    right: 0;
    z-index: 3;

    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
    padding: var(--gap-md) var(--gap-lg) var(--gap-lg);
    border: 1px solid var(--info-border);
    border-radius: var(--radius-lg);
    /* 떠 있으므로 뒤 내용이 비치면 안 된다 — 반투명 --info-bg 대신 불투명 흰 바탕. */
    background-color: var(--white-color);
    box-shadow: var(--shadow-md);
`;

export const StyledSimilarTitle = styled.h3`
    /* 전역 리셋(globalStyle.ts)의 margin:0 목록에 h3 가 빠져 있어 UA 기본 여백이 그대로 먹는다. */
    margin: 0;
    font-size: var(--small-font);
    font-weight: 700;
    color: var(--info-color);
`;

export const StyledSimilarList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
`;

export const StyledSimilarRow = styled.li`
    display: flex;
`;

/* 후보 하나당 카드. 줄 간격만으로는 어디서 한 사람이 끝나는지 읽히지 않는다 —
   이름줄과 메타줄이 붙어 있어 옆 후보의 메타줄과 구분이 안 됐다.
   고를 수 있을 때는 버튼으로 동작한다(전역 스타일이 hover·active 를 이미 준다).
   게스트 모드는 병합 API 가 없어 고를 수 없고, 그때는 알림 카드로만 둔다. */
export const StyledSimilarButton = styled.button<{ $selectable: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--gap-xs);
    padding: var(--gap-sm) var(--gap-md);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--info-bg);
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    text-align: left;
    cursor: ${props => props.$selectable ? 'pointer' : 'default'};

    &:disabled {
        opacity: 1;
    }
`;

export const StyledSimilarHead = styled.div`
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
`;

export const StyledSimilarName = styled.span`
    font-weight: 700;
    color: var(--black-color);
`;

export const StyledSimilarTel = styled.span`
    color: var(--dark-gray-color2);
`;

/* 이름·번호만으로는 어느 쪽이 실제로 쓰이는 레코드인지 알 수 없다.
   예약 건수·최근 방문·적립금이 그 판단의 근거다. */
export const StyledSimilarMeta = styled.p`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

