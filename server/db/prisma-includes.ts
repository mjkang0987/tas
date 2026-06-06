export const reservationInclude = {
    paymentEntries: true,
    customer: {select: {legacyId: true}},
    designer: {select: {legacyId: true}},
} as const;

export const reservationIncludeWithNames = {
    paymentEntries: true,
    customer: {select: {legacyId: true, name: true}},
    designer: {select: {legacyId: true, name: true}},
} as const;
