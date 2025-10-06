/**
 * User login route
 * POST /api/v1/auth/login
 */

import { Elysia, t } from 'elysia';
import { userService } from './service-factory';

export const loginRoute = (app: Elysia) => app
  .post('/login', async ({ body, set, request }) => {
    const credentials = body as any;
    const options = {
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    };

    const result = await userService.loginUser(credentials.email, credentials.password, options);
    
    set.status = result.success ? 200 : (result.error === 'INVALID_CREDENTIALS' ? 401 : 400);
    return result;
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    detail: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user and return tokens',
    },
  });
