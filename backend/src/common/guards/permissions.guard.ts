import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific permission is required, pass.
    if (!requirement) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Only admin type accounts (Master Admins and Sub-Admins/Staff) use these permissions.
    if (user.userType !== 'admin') {
      return false;
    }

    // Master Admin has full bypass permissions
    if (user.role === 'admin') {
      return true;
    }

    // Granular check for Sub-Admins/Staff
    const permissions = user.permissions;
    if (!permissions) {
      throw new ForbiddenException('عذراً، لا تمتلك أي صلاحيات في هذا النظام');
    }

    const resourcePerms = permissions[requirement.resource];
    if (resourcePerms && resourcePerms[requirement.action] === true) {
      return true;
    }

    throw new ForbiddenException('عذراً، أنت غير مخول بإجراء هذه العملية');
  }
}
