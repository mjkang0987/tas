import styled from 'styled-components';

export type LocalizedI18n = {en?: string; ja?: string; zh?: string} | null | undefined;

const MESSAGE_LANGS = [['en', 'English'], ['ja', '日本語'], ['zh', '中文']] as const;

// 오너 입력 문구 1개 = 한국어 본문 + 언어별(영/일/중) 번역. 예약 안내문구·공지사항이 공용으로 쓴다.
// 언어칸을 비우면 해당 키를 지워, 완전히 비면 i18n을 null로(한국어 폴백) 유지한다.
// multiline=false면 한 줄 입력(제목 등), true면 여러 줄(본문).
export function LocalizedMessageField({
    idBase, label, caption, placeholder, mainValue, i18nValue, disabled = false, multiline = true,
    onMainChange, onI18nChange,
}: {
    idBase: string;
    label: string;
    caption?: string;
    placeholder: string;
    mainValue: string;
    i18nValue: LocalizedI18n;
    disabled?: boolean;
    multiline?: boolean;
    onMainChange: (value: string) => void;
    onI18nChange: (next: {en?: string; ja?: string; zh?: string} | null) => void;
}) {
    const setLangValue = (code: 'en' | 'ja' | 'zh', value: string) => {
        const next = {...(i18nValue ?? {})};
        if (value.trim()) next[code] = value; else delete next[code];
        onI18nChange(Object.keys(next).length > 0 ? next : null);
    };
    return (
        <StyledMessageBlock>
            <StyledField>
                <StyledLabel htmlFor={`${idBase}-ko`}>{label}</StyledLabel>
                {caption ? <StyledFieldCaption>{caption}</StyledFieldCaption> : null}
                <FieldControl id={`${idBase}-ko`} multiline={multiline} value={mainValue}
                    placeholder={placeholder} disabled={disabled} rows={3} onChange={onMainChange} />
            </StyledField>
            {MESSAGE_LANGS.map(([code, langLabel]) => (
                <StyledField key={code}>
                    <StyledLabel htmlFor={`${idBase}-${code}`}>{langLabel}</StyledLabel>
                    <FieldControl id={`${idBase}-${code}`} multiline={multiline} value={i18nValue?.[code] ?? ''}
                        placeholder={langLabel} disabled={disabled} rows={2} onChange={(v) => setLangValue(code, v)} />
                </StyledField>
            ))}
        </StyledMessageBlock>
    );
}

function FieldControl({id, multiline, value, placeholder, disabled, rows, onChange}: {
    id: string; multiline: boolean; value: string; placeholder: string;
    disabled: boolean; rows: number; onChange: (v: string) => void;
}) {
    if (multiline) {
        return (
            <StyledTextarea id={id} value={value} placeholder={placeholder} disabled={disabled}
                rows={rows} onChange={(e) => onChange(e.target.value)} />
        );
    }
    return (
        <StyledInput id={id} value={value} placeholder={placeholder} disabled={disabled}
            onChange={(e) => onChange(e.target.value)} />
    );
}

// 본문+번역 한 종을 시각적으로 묶는다. 종끼리 구분선으로 나눠 가독성 확보.
const StyledMessageBlock = styled.div`
    margin-top: 8px;
    padding-top: 8px;

    & + & {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--light-gray-color);
    }
`;

const StyledField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
`;

const StyledLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledFieldCaption = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: var(--dark-gray-color2);
`;

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    resize: none;

    &:focus { outline: none; border-color: var(--blue-color); }
`;

const StyledInput = styled.input`
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: 14px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;

    &:focus { outline: none; border-color: var(--blue-color); }
`;
