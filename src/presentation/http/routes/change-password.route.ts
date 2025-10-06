/**
 * Change password route
 * POST /api/v1/auth/change-password
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { userService } from './service-factory';

export const changePasswordRoute = (app: Elysia) => app
  .post('/change-password', async ({ body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const passwordData = body as any;
    const result = await userService.changeUserPassword(user.userId, passwordData);
    
    set.status = result.success ? 200 : 400;
    return result;
  }, {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String(),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'Change password',
      description: 'Change user password',
    },
  });
