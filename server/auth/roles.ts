export type AppRole = 'owner' | 'staff';

export const ROLE_PRIORITY: Record<AppRole, number> = {
    owner: 0,
    staff: 1,
};

export function hasRequiredRole(
    currentRole: AppRole | null | undefined,
    requiredRole: AppRole
): boolean {
    if (!currentRole) {
        return false;
    }

    return ROLE_PRIORITY[currentRole] <= ROLE_PRIORITY[requiredRole];
}
