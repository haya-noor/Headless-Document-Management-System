/**
 * Authentication routes
 * Defines authentication-related HTTP endpoints
 */

import { Elysia, t } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { createAuthMiddleware, verifyAuthToken } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema
} from '../schemas/auth.schemas';

const authController = new AuthController();
const authMiddleware = createAuthMiddleware();

export const authRoutes = {
  /**
   * User registration
   * POST /api/v1/auth/register
   */
  register: (app: Elysia) => app
    .post('/register', async ({ body, set, request }) => {
      const userData = body as any;
      const options = {
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      };

      const result = await authController.register(userData, options);
      
      if (result.success) {
        set.status = 201;
      } else {
        const statusCode = result.error === 'EMAIL_EXISTS' ? 409 : 400;
        set.status = statusCode;
      }
      
      return result;
    }, {
      body: registerSchema,
      detail: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account',
      },
    }),

  /**
   * User login
   * POST /api/v1/auth/login
   */
  login: (app: Elysia) => app
    .post('/login', async ({ body, set, request }) => {
      const credentials = body as any;
      const options = {
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      };

      const result = await authController.login(credentials, options);
      
      if (result.success) {
        set.status = 200;
      } else {
        const statusCode = result.error === 'INVALID_CREDENTIALS' ? 401 : 400;
        set.status = statusCode;
      }
      
      return result;
    }, {
      body: loginSchema,
      detail: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and return tokens',
      },
    }),


  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  logout: (app: Elysia) => app
    .post('/logout', async ({ body, set }) => {
      const logoutData = body as any;
      const result = await authController.logout(logoutData);
      
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
    }),

  /**
   * Get user profile
   * GET /api/v1/auth/profile
   */
  getProfile: (app: Elysia) => app
    .get('/profile', async ({ set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const result = await authController.getProfile(user);
      
      set.status = result.success ? 200 : 404;
      return result;
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Get user profile',
        description: 'Get current user profile information',
      },
    }),

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  updateProfile: (app: Elysia) => app
    .put('/profile', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const updateData = body as any;
      const result = await authController.updateProfile(user, updateData);
      
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
    }),

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword: (app: Elysia) => app
    .post('/change-password', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const passwordData = body as any;
      const result = await authController.changePassword(user, passwordData);
      
      set.status = result.success ? 200 : 400;
      return result;
    }, {
      body: changePasswordSchema,
      detail: {
        tags: ['Authentication'],
        summary: 'Change password',
        description: 'Change user password',
      },
    }),

  /**
   * Delete user account
   * DELETE /api/v1/auth/account
   */
  deleteAccount: (app: Elysia) => app
    .delete('/account', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { password } = body as any;
      const result = await authController.deleteAccount(user, password);
      
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
    }),

};
