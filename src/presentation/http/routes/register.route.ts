/**
 * User registration route
 * POST /api/v1/auth/register
 */

import { Elysia, t } from 'elysia';
import { userService } from './service-factory';

export const registerRoute = (app: Elysia) => app
  .post('/register', async ({ body, set, request }) => {
    const userData = body as any;
    const options = {
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    };

    const result = await userService.registerUser(userData, options);
    
    set.status = result.success ? 201 : (result.error === 'EMAIL_EXISTS' ? 409 : 400);
    return result;
  }, {
    body: t.Object({
      firstName: t.String(),
      lastName: t.String(),
      email: t.String(),
      password: t.String(),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'Register new user',
      description: 'Create a new user account',
    },
  });
