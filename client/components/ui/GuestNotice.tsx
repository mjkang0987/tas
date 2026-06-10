import styled from 'styled-components';

export function GuestNotice() {
    return (
        <StyledWrapper>
            <StyledTitle>📌 게스트 로그인 안내</StyledTitle>
            <StyledList>
                <li className="notice-item">💾 데이터는 현재 브라우저에만 저장됩니다.</li>
                <li className="notice-item">🗑️ 브라우저 데이터 삭제 시 초기화됩니다.</li>
                <li className="notice-item">🚫 다른 기기에서 데이터를 불러올 수 없습니다.</li>
                <li className="notice-item">⚠️ 데이터 복구 및 백업이 불가합니다.</li>
            </StyledList>
            <StyledDivider />
            <StyledCta>
                🔗 SNS 로그인 시 모든 기기에서 데이터를 연동할 수 있습니다.
            </StyledCta>
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
    width: 100%;
    margin: 0;
    padding: 14px 16px;
    box-sizing: border-box;
    border: 1px solid var(--brand-color-border);
    border-radius: var(--radius-md);
    background: var(--brand-color-bg);
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledTitle = styled.strong`
    font-size: 14px;
    font-weight: 700;
    color: var(--brand-color);
    letter-spacing: 0.02em;
`;

const StyledList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    line-height: 1.4;
    color: var(--dark-gray-color);

    .notice-item {
        margin-top: 2px;
    }
`;

const StyledDivider = styled.hr`
    margin: 0;
    border: none;
    border-top: 1px dashed var(--brand-color-border);
`;

const StyledCta = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--brand-color);
    text-align: left;
`;
