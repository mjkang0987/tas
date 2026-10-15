export {default} from '../../../server/api/client-errors';

// Next 가 정적으로 읽는 값이라 재export 가 안 된다 — 라우트 파일에 직접 둔다.
// 로그인 없이도 크래시는 나므로 공개 엔드포인트이고, 본문은 작게 끊는다.
export const config = {api: {bodyParser: {sizeLimit: '16kb'}}};
