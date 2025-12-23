import { createMiddleware } from 'better-call';
import { APIError } from 'better-auth/api';
import { type UserWithRole } from 'better-auth/plugins/admin';


export const permissionMiddleware = (permissions: any, connector: 'OR' | 'AND' = 'AND') => {
    return createMiddleware(async ctx => {
        const session = ctx.context.session as { user: UserWithRole | null; session: any };
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
