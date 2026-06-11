import {prisma} from '../db/prisma';

// Exclude ambiguous characters: 0/O, 1/I/L
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;
const INVITE_TTL_HOURS = 24;

export function generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return code;
}

export type InviteValidation =
    | {valid: true; invite: {id: string; storeId: string; role: 'owner' | 'staff'}}
    | {valid: false; reason: 'not-found' | 'expired' | 'used'};

export async function validateInviteCode(code: string): Promise<InviteValidation> {
    const invite = await prisma.invite.findUnique({
        where: {code: code.toUpperCase()},
        select: {id: true, storeId: true, role: true, expiresAt: true, usedAt: true},
    });

    if (!invite) {
        return {valid: false, reason: 'not-found'};
    }

    if (invite.usedAt) {
        return {valid: false, reason: 'used'};
    }

    if (invite.expiresAt < new Date()) {
        return {valid: false, reason: 'expired'};
    }

    return {valid: true, invite: {id: invite.id, storeId: invite.storeId, role: invite.role}};
}

export async function consumeInvite(inviteId: string, userId: string): Promise<void> {
    await prisma.invite.update({
        where: {id: inviteId},
        data: {usedAt: new Date(), usedById: userId},
    });
}

export function getInviteExpiresAt(): Date {
    return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
}
