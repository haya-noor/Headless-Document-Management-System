/**
 * Get user profile route
 * GET /api/v1/auth/profile
 */

import { Elysia } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { userService } from './service-factory';

export const getProfileRoute = (app: Elysia) => app
  .get('/profile', async ({ set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const result = await userService.getUserProfile(user.userId);
    
    set.status = result.success ? 200 : 404;
    return result;
  }, {
    detail: {
      tags: ['Authentication'],
      summary: 'Get user profile',
      description: 'Get current user profile information',
    },
  });
