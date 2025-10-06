/**
 * Update user profile route
 * PUT /api/v1/auth/profile
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { userService } from './service-factory';

export const updateProfileRoute = (app: Elysia) => app
  .put('/profile', async ({ body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const updateData = body as any;
    const result = await userService.updateUserProfile(user.userId, updateData);
    
    set.status = result.success ? 200 : 400;
    return result;
  }, {
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      email: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'Update user profile',
      description: 'Update current user profile information',
    },
  });
