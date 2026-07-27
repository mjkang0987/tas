import styled from 'styled-components';

// 입력값 타입. DB의 JSON 컬럼(noticeI18nJson 등)은 키가 null 일 수 있어 값에 null 을 허용한다.
// 반환(onI18nChange)은 null 을 걷어낸 깨끗한 객체라 소비자 쪽 타입이 좁아도 그대로 받는다.
export type LocalizedI18n = {en?: string | null; ja?: string | null; zh?: string | null} | null | undefined;
export type LocalizedI18nOut = {en?: string; ja?: string; zh?: string};

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
    onI18nChange: (next: LocalizedI18nOut | null) => void;
}) {
    const setLangValue = (code: 'en' | 'ja' | 'zh', value: string) => {
        // 입력값에 섞여 있을 수 있는 null 키는 여기서 걷어내고 문자열만 남긴다.
        const next: LocalizedI18nOut = {};
        for (const key of ['en', 'ja', 'zh'] as const) {
            const cur = key === code ? value : i18nValue?.[key];
            if (typeof cur === 'string' && cur.trim()) next[key] = cur;
        }
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
    font-size: var(--medium-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledFieldCaption = styled.span`
    font-size: var(--small-font);
    line-height: 1.5;
    color: var(--dark-gray-color2);
`;

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    font-size: var(--font);
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
    font-size: var(--font);
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;

    &:focus { outline: none; border-color: var(--blue-color); }
`;
