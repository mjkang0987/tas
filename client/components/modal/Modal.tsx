import React, {
    ReactElement,
    ReactNode,
    Ref,
    useEffect,
    useRef
} from 'react';

import styled from 'styled-components';

import {
    ButtonIcon,
} from '../common/Buttons';

import {Icon} from '../common/Icons';

interface ModalType {
    title?: string | React.ReactElement;
    body?: string | React.ReactNode | React.ReactElement;
    controls?: string | React.ReactNode | React.ReactElement;
    isOpen: boolean;
    handlerModalClose: Function
}

export const ModalComponent = ({
    title,
    body,
    controls,
    isOpen,
    handlerModalClose
}: ModalType) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        }

        if (!isOpen) {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    const handlerKeyClose = (e: React.KeyboardEvent<HTMLDialogElement>) => {
        if (e.key === 'Escape') {
            handlerModalClose();
        }
    };

    return (<StyledModal ariaLabelledby="modalTitle"
                         ref={dialogRef}
                         onKeyDown={(e) => handlerKeyClose(e)}>
        <StyledModalTitle id="modalTitle">{title && title}</StyledModalTitle>
        <StyledModalBody>{body}</StyledModalBody>
        <ButtonIcon aria-label="close"
                    onClick={() => handlerModalClose()}>
            <Icon iconType="close"/>
        </ButtonIcon>
        {controls}
    </StyledModal>);
};

const StyledModal = styled.dialog<{
    ariaLabelledby: string;
    ref: Ref<HTMLElement>;
    onKeyDown: (e: React.KeyboardEvent<HTMLDialogElement>) => void;
    children: ReactNode;
}>`
  display: flex;
  flex-direction: column;
  max-width: 360px;
  width: 90%;
  max-height: 80%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background-color: var(--white-color);
  box-sizing: border-box;
  border: 1px solid var(--gray-color);
  padding: 0;

  button[aria-label="close"] {
    position: absolute;
    top: 4px;
    right: 4px;
  }
`;

const StyledModalTitle = styled.div<{
    id: string;
    children: ReactNode;
}>`
  display: block;
  padding: 14px;
  background-color: var(--white-color);
`;

const StyledModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 14px;
`;