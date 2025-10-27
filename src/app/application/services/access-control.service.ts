export class AccessControlService {
    can(user: { roles: string[] }, permission: string): boolean {
    // Simplified RBAC logic
    const rolePermissions: Record<string, string[]> = {
    admin: ['*'],
    editor: ['document:create', 'document:update'],
    viewer: ['document:read'],
    };
    
    
    return user.roles.some(role => {
    const permissions = rolePermissions[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
    });
    }
    }