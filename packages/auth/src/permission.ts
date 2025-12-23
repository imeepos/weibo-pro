import { createMiddleware } from 'better-call';
import { APIError } from 'better-auth/api';
import { type UserWithRole } from 'better-auth/plugins/admin';

type PermissionConnector = 'OR' | 'AND';

interface SessionContext {
  user: UserWithRole | null;
  session: unknown;
}

export const permissionMiddleware = (
  permissions: Record<string, unknown>,
  connector: PermissionConnector = 'AND'
) => {
    return createMiddleware(async ctx => {
        const session = ctx.context.session as SessionContext;
        if (!session || !session.user) {
            throw new APIError('UNAUTHORIZED', {
                message: 'User is not authenticated',
            });
        }
        if (Object.keys(permissions).length === 0) {
            return;
        }
        const userRole = session.user.role;
        const roles: string[] = (userRole || 'user').split(',');
        throw new APIError('FORBIDDEN', {
            code: 'access.denied',
            message: `Role ${roles.join(',')} does not have access to ${JSON.stringify(permissions)}`,
        });
    });
};
