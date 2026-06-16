import {useMemo, useState} from 'react';

import styled from 'styled-components';

import {FieldError} from '../ui/FieldError';
import {buildServiceColorMap, formatDuration, formatPrice, getServiceColor} from '../../utils/services';
import type {ServiceItem} from '../../utils/services';
import type {AddServiceState} from './onboarding-types';
import {
    StyledNavRow, StyledBackBtn, StyledSkipBtn, StyledNextBtn,
    StyledSectionNote, StyledHighlight,
    StyledAddForm, StyledAddFormRow, StyledAddInput, StyledAddFormActions,
    StyledCancelBtnSm, StyledConfirmBtnSm, StyledAddServiceBtn,
} from './onboarding-step-styles';

interface Props {
    localServices: ServiceItem[];
    mergedCategoryColors: Record<string, string>;
    onServicesChange: (services: ServiceItem[]) => void;
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

export const OnboardingStep2 = ({localServices, mergedCategoryColors, onServicesChange, onNext, onSkip, onBack}: Props) => {
    const [addSvc, setAddSvc] = useState<AddServiceState | null>(null);
    const [step2Error, setStep2Error] = useState('');

    const groupedServices = localServices.reduce<Record<string, ServiceItem[]>>((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});
    const serviceCategories = Object.keys(groupedServices);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(localServices, mergedCategoryColors),
        [localServices, mergedCategoryColors]
    );

    const handleRemoveService = (name: string) => {
        onServicesChange(localServices.filter((s) => s.name !== name));
    };

    const handleAddService = () => {
        if (!addSvc) return;
        const category = addSvc.category === '__new'
            ? addSvc.newCategory.trim()
            : addSvc.category.trim();
        const name = addSvc.name.trim();

        if (!category) {
            setStep2Error(addSvc.category === '__new' ? '새 카테고리명을 입력해 주세요.' : '카테고리를 선택해 주세요.');
            return;
        }
        if (!name) { setStep2Error('서비스명을 입력해 주세요.'); return; }
        if (localServices.some((s) => s.name === name)) {
            setStep2Error(`"${name}" 서비스는 이미 있습니다.`);
            return;
        }

        onServicesChange([...localServices, {
            category,
            name,
            durationMinutes: Number(addSvc.durationMinutes) || 0,
            price: Number(addSvc.price) || 0,
        }]);
        setAddSvc(null);
        setStep2Error('');
    };

    return (
        <>
            <StyledSectionNote>
                <StyledHighlight>서비스 변경, 추가는 초기 매장 설정 완료 이후 언제든 가능합니다.</StyledHighlight>
                <br/>업종별 기본 서비스 목록입니다.
            </StyledSectionNote>

            <StyledServiceList>
                {serviceCategories.length === 0 && (
                    <StyledEmpty>서비스가 없습니다. 아래에서 추가해 주세요.</StyledEmpty>
                )}
                {serviceCategories.map((cat) => (
                    <StyledCategoryGroup key={cat}>
                        <StyledCategoryName>{cat}</StyledCategoryName>
                        {(groupedServices[cat] ?? []).map((item) => (
                            <StyledServiceRow key={item.name}>
                                <StyledServiceInfo>
                                    <StyledNameChip $color={getServiceColor(item.name, serviceColorMap)}>
                                        {item.name}
                                    </StyledNameChip>
                                    <StyledServiceMeta>
                                        {item.durationMinutes > 0 && formatDuration(item.durationMinutes)}
                                        {item.durationMinutes > 0 && item.price > 0 && ' · '}
                                        {item.price > 0 && formatPrice(item.price)}
                                    </StyledServiceMeta>
                                </StyledServiceInfo>
                                <StyledRemoveBtn
                                    type="button"
                                    onClick={() => handleRemoveService(item.name)}
                                    aria-label={`${item.name} 삭제`}
                                >
                                    ×
                                </StyledRemoveBtn>
                            </StyledServiceRow>
                        ))}
                    </StyledCategoryGroup>
                ))}
            </StyledServiceList>

            {addSvc ? (
                <StyledAddForm>
                    <StyledAddFormRow>
                        <select
                            id="onboard-svc-category"
                            value={addSvc.category}
                            onChange={(e) => setAddSvc({...addSvc, category: e.target.value, newCategory: ''})}
                        >
                            <option value="">카테고리 선택</option>
                            {serviceCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__new">+ 새 카테고리</option>
                        </select>
                        {addSvc.category === '__new' && (
                            <StyledAddInput
                                id="onboard-svc-new-category"
                                value={addSvc.newCategory}
                                onChange={(e) => setAddSvc({...addSvc, newCategory: e.target.value})}
                                placeholder="카테고리명"
                            />
                        )}
                    </StyledAddFormRow>
                    <StyledAddFormRow>
                        <StyledAddInput
                            id="onboard-svc-name"
                            value={addSvc.name}
                            onChange={(e) => { setAddSvc({...addSvc, name: e.target.value}); setStep2Error(''); }}
                            placeholder="서비스명 *"
                        />
                        <StyledAddInput
                            id="onboard-svc-duration"
                            type="number"
                            value={addSvc.durationMinutes}
                            onChange={(e) => setAddSvc({...addSvc, durationMinutes: e.target.value})}
                            placeholder="소요(분)"
                        />
                        <StyledAddInput
                            id="onboard-svc-price"
                            type="number"
                            value={addSvc.price}
                            onChange={(e) => setAddSvc({...addSvc, price: e.target.value})}
                            placeholder="가격(원)"
                        />
                    </StyledAddFormRow>
                    <FieldError variant="inline">{step2Error}</FieldError>
                    <StyledAddFormActions>
                        <StyledCancelBtnSm type="button" onClick={() => { setAddSvc(null); setStep2Error(''); }}>취소</StyledCancelBtnSm>
                        <StyledConfirmBtnSm type="button" onClick={handleAddService}>추가</StyledConfirmBtnSm>
                    </StyledAddFormActions>
                </StyledAddForm>
            ) : (
                <StyledAddServiceBtn
                    type="button"
                    onClick={() => setAddSvc({category: serviceCategories[0] ?? '', name: '', durationMinutes: '', price: '', newCategory: ''})}
                >
                    + 서비스 추가
                </StyledAddServiceBtn>
            )}

            <StyledNavRow>
                <StyledBackBtn type="button" onClick={onBack}>← 이전</StyledBackBtn>
                <StyledSkipBtn type="button" onClick={onSkip}>건너뛰기</StyledSkipBtn>
                <StyledNextBtn type="button" onClick={onNext}>적용</StyledNextBtn>
            </StyledNavRow>
        </>
    );
};

const StyledServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 4px;
`;

const StyledEmpty = styled.div`
    padding: 20px;
    text-align: center;
    font-size: 13px;
    color: var(--dark-gray-color2);
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
`;

const StyledCategoryGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledCategoryName = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--dark-gray-color2);
    padding: 6px 0 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const StyledServiceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledServiceInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledNameChip = styled.span<{$color: string}>`
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: ${(p) => p.$color};
    background-color: ${(p) => `${p.$color}18`};
`;

const StyledServiceMeta = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
    flex-shrink: 0;
    margin-left: auto;
`;

const StyledRemoveBtn = styled.button`
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--danger-border); color: var(--danger-color); }
    }
`;
