import {SeoHead} from '../components/ui/SeoHead';
import {LandingContent} from '../components/landing/LandingContent';
import {LANDING_DESCRIPTION} from '../lib/seo';

/**
 * 소개 페이지. 같은 내용을 루트(`/`)도 익명 방문자에게 서버렌더하므로,
 * canonical 은 루트로 지정해 색인을 한쪽으로 모은다(사이트맵에도 `/` 만 싣는다).
 */
export default function AboutPage() {
    return (
        <>
            <SeoHead title="서비스 소개" description={LANDING_DESCRIPTION} path="/" />
            <LandingContent />
        </>
    );
}
