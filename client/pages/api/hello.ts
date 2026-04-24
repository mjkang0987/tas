import type {NextApiRequest, NextApiResponse} from 'next';

import reservations from './reservations.json';

type ReservationResponse = typeof reservations;

const handler = (
    req: NextApiRequest,
    res: NextApiResponse<ReservationResponse>
) => {
    res.status(200).json(reservations);
};

export default handler;
