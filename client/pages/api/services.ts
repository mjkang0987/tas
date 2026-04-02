import type {NextApiRequest, NextApiResponse} from 'next';

import fs from 'fs';
import path from 'path';

import type {ServiceItem} from '../../utils/services';

interface ServiceData {
    services: ServiceItem[];
    categoryBaseColors: Record<string, string>;
}

const DATA_PATH = path.join(process.cwd(), 'pages/api/services.json');

function readData(): ServiceData {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeData(data: ServiceData): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const data = readData();
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const {services, categoryBaseColors} = req.body as ServiceData;

        if (!Array.isArray(services)) {
            return res.status(400).json({error: 'Invalid services payload'});
        }

        if (typeof categoryBaseColors !== 'object' || categoryBaseColors === null || Array.isArray(categoryBaseColors)) {
            return res.status(400).json({error: 'Invalid categoryBaseColors payload'});
        }

        writeData({services, categoryBaseColors});
        return res.status(200).json({services, categoryBaseColors});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
