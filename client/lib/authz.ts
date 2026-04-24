export type AppRole = 'owner' | 'manager' | 'staff';

export const ROLE_PRIORITY: Record<AppRole, number> = {
    owner: 0,
    manager: 1,
    staff: 2,
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
