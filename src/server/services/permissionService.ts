import { UserRole, PermissionDefinition, RolePermissions } from '../types/auth';
import logger from '../utils/logger';

/**
 * Permission service for role-based access control
 */
class PermissionService {
  // Define permissions for each role
  private rolePermissions: RolePermissions = {
    [UserRole.ADMIN]: [
      // Admin can do everything
      { action: '*', subject: '*' }
    ],
    [UserRole.RESEARCHER]: [
      // Session permissions
      { action: 'create', subject: 'session' },
      { action: 'read', subject: 'session', conditions: { ownedByUser: true } },
      { action: 'update', subject: 'session', conditions: { ownedByUser: true } },
      { action: 'delete', subject: 'session', conditions: { ownedByUser: true } },
      
      // File permissions
      { action: 'upload', subject: 'file' },
      { action: 'read', subject: 'file', conditions: { ownedByUser: true } },
      { action: 'delete', subject: 'file', conditions: { ownedByUser: true } },
      
      // Structure permissions
      { action: 'read', subject: 'structure' },
      { action: 'modify', subject: 'structure', conditions: { ownedByUser: true } },
      
      // Snapshot permissions
      { action: 'create', subject: 'snapshot', conditions: { ownedByUser: true } },
      { action: 'read', subject: 'snapshot', conditions: { ownedByUser: true } },
      { action: 'update', subject: 'snapshot', conditions: { ownedByUser: true } },
      { action: 'delete', subject: 'snapshot', conditions: { ownedByUser: true } },
      
      // Movie permissions
      { action: 'create', subject: 'movie', conditions: { ownedByUser: true } },
      { action: 'read', subject: 'movie', conditions: { ownedByUser: true } },
      { action: 'update', subject: 'movie', conditions: { ownedByUser: true } },
      { action: 'delete', subject: 'movie', conditions: { ownedByUser: true } },
      
      // User profile permissions
      { action: 'read', subject: 'user', conditions: { sameUser: true } },
      { action: 'update', subject: 'user', conditions: { sameUser: true } },
    ],
    [UserRole.VIEWER]: [
      // Session permissions
      { action: 'read', subject: 'session', conditions: { ownedByUser: true } },
      
      // File permissions
      { action: 'read', subject: 'file', conditions: { ownedByUser: true } },
      
      // Structure permissions
      { action: 'read', subject: 'structure' },
      
      // Snapshot permissions
      { action: 'read', subject: 'snapshot', conditions: { ownedByUser: true } },
      
      // Movie permissions
      { action: 'read', subject: 'movie', conditions: { ownedByUser: true } },
      
      // User profile permissions
      { action: 'read', subject: 'user', conditions: { sameUser: true } },
      { action: 'update', subject: 'user', conditions: { sameUser: true } },
    ],
    [UserRole.GUEST]: [
      // Guest permissions
      { action: 'read', subject: 'session', conditions: { isPublic: true } },
      { action: 'read', subject: 'structure', conditions: { isPublic: true } },
      { action: 'read', subject: 'snapshot', conditions: { isPublic: true } },
      { action: 'read', subject: 'movie', conditions: { isPublic: true } },
    ]
  };

  /**
   * Checks if a user has permission to perform an action on a subject
   * @param userRole User role
   * @param action Action to perform
   * @param subject Subject to perform action on
   * @param conditions Additional conditions for permission check
   * @returns True if permission is granted
   */
  public hasPermission(
    userRole: UserRole,
    action: string,
    subject: string,
    conditions: Record<string, any> = {}
  ): boolean {
    // Get permissions for the user's role
    const permissions = this.rolePermissions[userRole] || [];

    // Check for wildcard permission (admin)
    if (permissions.some(p => p.action === '*' && p.subject === '*')) {
      return true;
    }

    // Find specific permission
    const permission = permissions.find(p => 
      (p.action === action || p.action === '*') && 
      (p.subject === subject || p.subject === '*')
    );

    if (!permission) {
      return false;
    }

    // If permission has conditions, check them
    if (permission.conditions) {
      return this.checkConditions(permission.conditions, conditions);
    }

    return true;
  }

  /**
   * Checks permission conditions
   * @param permissionConditions Conditions from permission definition
   * @param requestConditions Conditions from request context
   * @returns True if conditions are satisfied
   */
  private checkConditions(
    permissionConditions: Record<string, any>,
    requestConditions: Record<string, any>
  ): boolean {
    // Check each condition in the permission
    for (const [key, value] of Object.entries(permissionConditions)) {
      if (!requestConditions.hasOwnProperty(key) || requestConditions[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets all permissions for a role
   * @param role User role
   * @returns Array of permission definitions
   */
  public getPermissionsForRole(role: UserRole): PermissionDefinition[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Updates permissions for a role (admin only)
   * @param role User role
   * @param permissions New permission definitions
   */
  public updateRolePermissions(role: UserRole, permissions: PermissionDefinition[]): void {
    this.rolePermissions[role] = permissions;
    logger.info(`Updated permissions for role ${role}`);
  }
}

export default new PermissionService();