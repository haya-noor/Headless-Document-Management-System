/**
 * User logout route
 * POST /api/v1/auth/logout
 */

import { Elysia, t } from 'elysia';
import { userService } from './service-factory';

export const logoutRoute = (app: Elysia) => app
  .post('/logout', async ({ body, set }) => {
    const logoutData = body as any;
    const result = await userService.logoutUser(logoutData.refreshToken);
    
    set.status = result.success ? 200 : 400;
    return result;
  }, {
    body: t.Object({
      refreshToken: t.String(),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'User logout',
      description: 'Logout user and invalidate refresh token',
    },
  });
