import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import type {CreateReservationInitial} from '../../../store/calendarStore';

import type {Reservation} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';

import {
    OVERLAY_Z_INDEX,
    StyledDetail,
    StyledHeader,
    StyledBody,
    StyledBodyInner,
    StyledForm,
    StyledError,
    StyledFooter,
    StyledActionButton,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {ReservationFormFields} from './ReservationDetailSections';
import {ReservationCreateCustomerFields} from './ReservationCreateCustomerFields';
import {useReservationCreateForm} from './useReservationCreateForm';

interface ReservationCreateProps {
    initial: CreateReservationInitial;
    customerMap: CustomerMap;
    onClose: () => void;
    onSave: (reservation: Reservation) => void;
}

export const ReservationCreate = ({initial, customerMap, onClose, onSave}: ReservationCreateProps) => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const designers = useCalendarStore((s) => s.designers);
    const addCustomer = useCalendarStore((s) => s.addCustomer);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-create');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const {
        activeDesigners,
        onLeaveDesigners,
        resignedDesigners,
        customerId,
        customerQuery,
        showSuggestions,
        customerMode,
        newCustomerName,
        newCustomerTel,
        designerId,
        selectedServices,
        form,
        error,
        filteredCustomers,
        totalDuration,
        totalPrice,
        setCustomerMode,
        setNewCustomerName,
        setNewCustomerTel,
        handleCustomerSelect,
        handleCustomerInputChange,
        handleCustomerFocus,
        handleCustomerBlur,
        handleServiceToggle,
        handleStartTimeChange,
        handleEndTimeChange,
        handlePriceChange,
        handleDesignerChange,
        handleFieldChange,
        handleSave,
    } = useReservationCreateForm({
        initial,
        customerMap,
        reservationMap,
        designers,
        addCustomer,
        onSave,
    });
    const customerErrorMessage = error?.field === 'customer' ? error.message : '';
    const serviceErrorMessage = error?.field === 'service' ? error.message : '';
    const designerErrorMessage = error?.field === 'designer' ? error.message : '';
    const dateErrorMessage = error?.field === 'date' ? error.message : '';
    const timeErrorMessage = error?.field === 'time' ? error.message : '';

    if (!modalRoot) return null;

    return createPortal(<StyledCreateOverlay onClick={onClose}
                                             role="dialog"
                                             aria-modal="true"
                                             aria-label="예약 추가"
                                             id={layerId}
                                             data-layer-id={layerDataId}>
        <StyledDetail ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>예약 추가</h3>
                <CloseIconButton onClick={onClose} />
            </StyledHeader>

            <StyledBody><StyledBodyInner>
                <StyledCreateForm>
                    <ReservationCreateCustomerFields
                        customerMode={customerMode}
                        customerId={customerId}
                        customerQuery={customerQuery}
                        showSuggestions={showSuggestions}
                        filteredCustomers={filteredCustomers}
                        newCustomerName={newCustomerName}
                        newCustomerTel={newCustomerTel}
                        customerErrorMessage={customerErrorMessage}
                        onChangeCustomerMode={setCustomerMode}
                        onChangeCustomerQuery={handleCustomerInputChange}
                        onFocusCustomerQuery={handleCustomerFocus}
                        onBlurCustomerQuery={handleCustomerBlur}
                        onSelectCustomer={handleCustomerSelect}
                        onChangeNewCustomerName={setNewCustomerName}
                        onChangeNewCustomerTel={setNewCustomerTel}
                    />
                    <ReservationFormFields
                        idPrefix="create"
                        form={{...form, designerId}}
                        activeDesigners={activeDesigners}
                        onLeaveDesigners={onLeaveDesigners}
                        resignedDesigners={resignedDesigners}
                        currentDesigner={null}
                        selectedServices={selectedServices}
                        totalDuration={totalDuration}
                        totalPrice={totalPrice}
                        onServiceToggle={handleServiceToggle}
                        onPriceChange={handlePriceChange}
                        onDesignerChange={handleDesignerChange}
                        onFieldChange={handleFieldChange}
                        onStartTimeChange={handleStartTimeChange}
                        onEndTimeChange={handleEndTimeChange}
                        serviceErrorMessage={serviceErrorMessage}
                        designerErrorMessage={designerErrorMessage}
                        dateErrorMessage={dateErrorMessage}
                        timeErrorMessage={timeErrorMessage}
                    />
                </StyledCreateForm>
                {error && error.field === 'general' && <StyledError>{error.message}</StyledError>}
            </StyledBodyInner></StyledBody>

            <StyledFooter>
                <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={handleSave}>저장</StyledActionButton>
            </StyledFooter>
        </StyledDetail>
    </StyledCreateOverlay>, modalRoot);
};

const StyledCreateOverlay = styled(StyledOverlay)`
  z-index: ${OVERLAY_Z_INDEX.base};
`;

const StyledCreateForm = styled(StyledForm)``;
