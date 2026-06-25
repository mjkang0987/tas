export const reservationInclude = {
    paymentEntries: true,
    customer: {select: {legacyId: true}},
    assignee: {select: {legacyId: true}},
} as const;

export const reservationIncludeWithNames = {
    paymentEntries: true,
    customer: {select: {legacyId: true, name: true}},
    assignee: {select: {legacyId: true, name: true}},
} as const;
