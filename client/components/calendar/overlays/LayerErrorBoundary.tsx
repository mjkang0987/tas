import {Component, type ErrorInfo, type ReactNode} from 'react';

import {ConfirmDialog} from '../../ui/ConfirmDialog';
import {reportClientError} from '../../../utils/reportClientError';

interface LayerErrorBoundaryProps {
    children: ReactNode;
    /** 안내 문구에 쓸 자리 이름. 예: '예약 상세' */
    title: string;
    /** '닫기' — 부모가 이 레이어를 실제로 걷어낸다(경계도 함께 사라져 상태가 초기화된다). */
    onClose: () => void;
}

interface LayerErrorBoundaryState {
    failed: boolean;
}

/**
 * 레이어 하나의 렌더 실패를 그 자리에 가둔다.
 *
 * 경계가 없으면 레이어의 예외가 페이지 루트까지 올라가, 운영 빌드에서 Next 가
 * 페이지 내용을 통째로 영문 "Application error" 화면으로 바꾼다. 예약 하나를 열려다
 * 그날 일정 전체를 잃는 셈이라, 달력은 살려 두고 레이어 자리만 안내로 대체한다.
 *
 * 훅으로는 렌더 에러를 잡을 수 없어 클래스 컴포넌트여야 한다.
 */
export class LayerErrorBoundary extends Component<LayerErrorBoundaryProps, LayerErrorBoundaryState> {
    state: LayerErrorBoundaryState = {failed: false};

    static getDerivedStateFromError(): LayerErrorBoundaryState {
        return {failed: true};
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // 운영 번들은 스택이 난독화돼 있어 "어느 레이어였는지"가 유일한 단서가 된다.
        console.error(`[${this.props.title}] 레이어를 표시하지 못했습니다.`, error, info.componentStack);
        // 사용자 브라우저에서 생기고 사라지지 않도록 ops 채널까지 올린다.
        // componentStack 은 난독화된 컴포넌트 이름뿐이라 알림에서 읽히지 않는다.
        // error.stack 은 최소한 터진 청크·오프셋을 가리켜 빌드와 대조할 수 있다.
        reportClientError(this.props.title, error);
    }

    private handleRetry = () => {
        this.setState({failed: false});
    };

    render() {
        const {children, title, onClose} = this.props;

        if (!this.state.failed) return children;

        return (
            <ConfirmDialog title={`${title}를 표시하지 못했습니다`}
                           message={'예기치 못한 문제가 생겼습니다.\n다시 시도하거나, 닫고 하던 작업을 이어가실 수 있습니다.'}
                           confirmLabel="다시 시도"
                           cancelLabel="닫기"
                           ariaLabel={`${title} 표시 실패`}
                           layerKey="layer-error"
                           onConfirm={this.handleRetry}
                           onClose={onClose}/>
        );
    }
}
