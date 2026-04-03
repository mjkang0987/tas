import type {NextApiRequest, NextApiResponse} from 'next';

import fs from 'fs';
import path from 'path';

import type {Customer} from '../../utils/customers';

interface CustomerData {
    customers: Customer[];
}

const DATA_PATH = path.join(process.cwd(), 'pages/api/customers.json');

function readData(): CustomerData {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeData(data: CustomerData): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const data = readData();
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const {customers} = req.body as CustomerData;

        if (!Array.isArray(customers)) {
            return res.status(400).json({error: 'Invalid customers payload'});
        }

        writeData({customers});
        return res.status(200).json({customers});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
