/**
 * Authentication routes
 * Defines authentication-related HTTP endpoints
 */

import { Elysia, t } from 'elysia';
import { userService } from '../../services';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema
} from '../../db/schemas/auth.schemas';

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

      const result = await userService.registerUser(userData, options);
      
      set.status = result.success ? 201 : (result.error === 'EMAIL_EXISTS' ? 409 : 400);
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

      const result = await userService.loginUser(credentials.email, credentials.password, options);
      
      set.status = result.success ? 200 : (result.error === 'INVALID_CREDENTIALS' ? 401 : 400);
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
    }),

  /**
   * Get user profile
   * GET /api/v1/auth/profile
   */
  getProfile: (app: Elysia) => app
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
    }),

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  updateProfile: (app: Elysia) => app
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
    }),

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword: (app: Elysia) => app
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
    }),

};
