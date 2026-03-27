import type {NextApiRequest, NextApiResponse} from 'next';

import fs from 'fs';
import path from 'path';

import type {Reservation, ReservationHistoryEntry, ReservationStatus} from '../../utils/reservations';

interface ReservationData {
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
}

const DATA_PATH = path.join(process.cwd(), 'pages/api/reservations.json');

function readData(): ReservationData {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeData(data: ReservationData): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const data = readData();
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const reservation = req.body as Reservation;
        const data = readData();

        data.reservations.push(reservation);
        writeData(data);

        return res.status(201).json({reservation});
    }

    if (req.method === 'PUT') {
        const {prev, updated} = req.body as { prev: Reservation; updated: Reservation };
        const data = readData();

        const idx = data.reservations.findIndex((r) => r.id === prev.id);

        if (idx > -1) {
            data.reservations[idx] = updated;
        }

        const entry: ReservationHistoryEntry = {
            reservationId: prev.id,
            before: prev,
            after: updated,
            timestamp: new Date().toISOString()
        };

        data.history.push(entry);

        writeData(data);

        return res.status(200).json({reservation: updated, historyEntry: entry});
    }

    if (req.method === 'PATCH') {
        const {id, status} = req.body as { id: number; status: ReservationStatus };
        const data = readData();

        const idx = data.reservations.findIndex((r) => r.id === id);

        if (idx === -1) {
            return res.status(404).json({error: 'Reservation not found'});
        }

        const before = {...data.reservations[idx]};
        data.reservations[idx] = {...data.reservations[idx], status};

        const entry: ReservationHistoryEntry = {
            reservationId: id,
            before,
            after: data.reservations[idx],
            timestamp: new Date().toISOString()
        };

        data.history.push(entry);
        writeData(data);

        return res.status(200).json({reservation: data.reservations[idx], historyEntry: entry});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
