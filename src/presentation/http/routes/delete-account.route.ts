/**
 * Delete user account route
 * DELETE /api/v1/auth/account
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { userService } from './service-factory';

export const deleteAccountRoute = (app: Elysia) => app
  .delete('/account', async ({ body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { password } = body as any;
    const result = await userService.deleteUserAccount(user.userId, password);
    
    set.status = result.success ? 200 : 400;
    return result;
  }, {
    body: t.Object({
      password: t.String(),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'Delete account',
      description: 'Delete user account permanently',
    },
  });
