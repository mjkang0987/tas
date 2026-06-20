import {useEffect, useRef} from 'react';

import styled from 'styled-components';

import {ADSENSE_CLIENT} from '../../lib/ads';

declare global {
    interface Window {
        adsbygoogle: Array<Record<string, unknown>>;
    }
}

interface AdBannerProps {
    adSlot: string;
    adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
    fullWidthResponsive?: boolean;
    style?: React.CSSProperties;
}

export const AdBanner = ({
    adSlot,
    adFormat = 'auto',
    fullWidthResponsive = true,
    style
}: AdBannerProps) => {
    const adRef = useRef<HTMLModElement>(null);
    const enabled = !!ADSENSE_CLIENT && !!adSlot;

    useEffect(() => {
        if (process.env.NODE_ENV === 'development' || !enabled) return;
        const el = adRef.current;
        if (!el || el.dataset.adsbygoogleStatus) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // AdSense not loaded
        }
    }, [enabled]);

    if (process.env.NODE_ENV === 'development') {
        return (
            <StyledPlaceholder style={style}>
                <span>AD</span>
            </StyledPlaceholder>
        );
    }

    // 운영이지만 AdSense ID/슬롯 미설정 → 렌더하지 않음
    if (!enabled) return null;

    return (
        <ins ref={adRef}
             className="adsbygoogle"
             style={{display: 'block', ...style}}
             data-ad-client={ADSENSE_CLIENT}
             data-ad-slot={adSlot}
             data-ad-format={adFormat}
             data-full-width-responsive={fullWidthResponsive} />
    );
};

const StyledPlaceholder = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60px;
    border: 1px dashed var(--gray-color, #ccc);
    border-radius: var(--radius-md, 6px);
    background-color: rgba(0, 0, 0, 0.03);
    color: var(--gray-color, #999);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
`;
