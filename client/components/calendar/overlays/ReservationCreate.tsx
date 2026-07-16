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
    StyledHeaderTitle,
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
    const assignees = useCalendarStore((s) => s.assignees);
    const addCustomer = useCalendarStore((s) => s.addCustomer);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-create');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const {
        activeAssignees,
        onLeaveAssignees,
        resignedAssignees,
        customerId,
        customerQuery,
        showSuggestions,
        customerTel,
        assigneeId,
        selectedServices,
        form,
        error,
        filteredCustomers,
        totalDuration,
        totalPrice,
        setCustomerTel,
        handleCustomerSelect,
        handleCustomerInputChange,
        handleCustomerFocus,
        handleCustomerBlur,
        handleServiceToggle,
        handleStartTimeChange,
        handleEndTimeChange,
        handlePriceChange,
        handleAssigneeChange,
        handleFieldChange,
        handleSave,
    } = useReservationCreateForm({
        initial,
        customerMap,
        reservationMap,
        assignees,
        addCustomer,
        onSave,
    });
    const customerErrorMessage = error?.field === 'customer' ? error.message : '';
    const serviceErrorMessage = error?.field === 'service' ? error.message : '';
    const assigneeErrorMessage = error?.field === 'assignee' ? error.message : '';
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
                <StyledHeaderTitle>예약 추가</StyledHeaderTitle>
                <CloseIconButton onClick={onClose} />
            </StyledHeader>

            <StyledBody><StyledBodyInner>
                <StyledCreateForm>
                    <ReservationCreateCustomerFields
                        customerId={customerId}
                        customerQuery={customerQuery}
                        showSuggestions={showSuggestions}
                        filteredCustomers={filteredCustomers}
                        customerTel={customerTel}
                        customerErrorMessage={customerErrorMessage}
                        onChangeCustomerQuery={handleCustomerInputChange}
                        onFocusCustomerQuery={handleCustomerFocus}
                        onBlurCustomerQuery={handleCustomerBlur}
                        onSelectCustomer={handleCustomerSelect}
                        onChangeCustomerTel={setCustomerTel}
                    />
                    <ReservationFormFields
                        idPrefix="create"
                        form={{...form, assigneeId}}
                        activeAssignees={activeAssignees}
                        onLeaveAssignees={onLeaveAssignees}
                        resignedAssignees={resignedAssignees}
                        currentAssignee={null}
                        selectedServices={selectedServices}
                        totalDuration={totalDuration}
                        totalPrice={totalPrice}
                        onServiceToggle={handleServiceToggle}
                        onPriceChange={handlePriceChange}
                        onAssigneeChange={handleAssigneeChange}
                        onFieldChange={handleFieldChange}
                        onStartTimeChange={handleStartTimeChange}
                        onEndTimeChange={handleEndTimeChange}
                        serviceErrorMessage={serviceErrorMessage}
                        assigneeErrorMessage={assigneeErrorMessage}
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
