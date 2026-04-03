import type {NextApiRequest, NextApiResponse} from 'next';

import fs from 'fs';
import path from 'path';

import type {Designer} from '../../utils/designers';

interface DesignerData {
    designers: Designer[];
}

const DATA_PATH = path.join(process.cwd(), 'pages/api/designers.json');

function readData(): DesignerData {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeData(data: DesignerData): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const data = readData();
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const {designers} = req.body as DesignerData;

        if (!Array.isArray(designers)) {
            return res.status(400).json({error: 'Invalid designers payload'});
        }

        writeData({designers});
        return res.status(200).json({designers});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
