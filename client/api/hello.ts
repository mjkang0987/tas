// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type {NextApiRequest, NextApiResponse} from 'next';
import reservations from './reservations.json';

type ReservationType = {
    reservations: any
}

export default (
    req: NextApiRequest,
    res: NextApiResponse<ReservationType>
) => {

    res.status(200).json(reservations);
}
