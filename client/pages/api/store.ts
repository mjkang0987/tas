import type {NextApiRequest, NextApiResponse} from 'next';

import fs from 'fs';
import path from 'path';

import type {StoreSettings} from '../../utils/storeSettings';
import {DEFAULT_STORE_SETTINGS} from '../../utils/storeSettings';

const DATA_PATH = path.join(process.cwd(), 'pages/api/store.json');

function readData(): StoreSettings {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeData(data: StoreSettings): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

function isValidTime(value: unknown): value is string {
    return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const data = readData();
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const {businessHours, closedDates, pointSettings} = req.body as StoreSettings;

        if (
            typeof businessHours !== 'object' ||
            businessHours === null ||
            !isValidTime(businessHours.start) ||
            !isValidTime(businessHours.end)
        ) {
            return res.status(400).json({error: 'Invalid businessHours payload'});
        }

        if (!Array.isArray(closedDates) || closedDates.some((date) => typeof date !== 'string')) {
            return res.status(400).json({error: 'Invalid closedDates payload'});
        }

        const nextPointSettings = pointSettings ?? DEFAULT_STORE_SETTINGS.pointSettings;
        const isValidPointMode = typeof nextPointSettings.enableServiceRate === 'boolean'
            && typeof nextPointSettings.enableRecharge === 'boolean';
        const isValidServiceRate = typeof nextPointSettings.serviceRate === 'number' && nextPointSettings.serviceRate >= 0;
        const isValidRechargeRules = Array.isArray(nextPointSettings.rechargeRules)
            && nextPointSettings.rechargeRules.every((rule) => (
                typeof rule?.baseAmount === 'number'
                && rule.baseAmount >= 0
                && typeof rule?.bonusAmount === 'number'
                && rule.bonusAmount >= 0
            ));

        if (!isValidPointMode || !isValidServiceRate || !isValidRechargeRules) {
            return res.status(400).json({error: 'Invalid pointSettings payload'});
        }

        const nextData: StoreSettings = {businessHours, closedDates, pointSettings: nextPointSettings};
        writeData(nextData);
        return res.status(200).json(nextData);
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
