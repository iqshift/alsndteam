import { SetMetadata } from '@nestjs/common';

export interface PermissionRequirement {
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete';
}

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (requirement: PermissionRequirement) =>
  SetMetadata(PERMISSIONS_KEY, requirement);
