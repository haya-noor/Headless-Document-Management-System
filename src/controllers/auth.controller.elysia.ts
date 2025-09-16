/**
 * Authentication controller for Elysia
 * Handles authentication-related HTTP requests with thin controller pattern
 */

import { Elysia, t } from 'elysia';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';

/**
 * Authentication controller class for Elysia
 * Implements thin controller pattern - validates input, calls services, returns responses
 */
export class AuthControllerElysia {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * User registration endpoint
   * POST /api/auth/register
   */
  register = async ({ body, set, request }: any) => {
    try {
      const userData = body;
      const options = {
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      };

      const result = await this.userService.registerUser(userData, options);

      if (result.success) {
        set.status = 201;
        return result;
      } else {
        const statusCode = result.error === 'EMAIL_EXISTS' ? 409 : 400;
        set.status = statusCode;
        return result;
      }
    } catch (error) {
      Logger.error('Registration error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };

  /**
   * User login endpoint
   * POST /api/auth/login
   */
  login = async ({ body, set, request }: any) => {
    try {
      const { email, password } = body;
      const options = {
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      };

      const result = await this.userService.loginUser(email, password, options);

      if (result.success) {
        set.status = 200;
        return result;
      } else {
        const statusCode = result.error === 'ACCOUNT_DEACTIVATED' ? 403 : 401;
        set.status = statusCode;
        return result;
      }
    } catch (error) {
      Logger.error('Login error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };

  /**
   * User logout endpoint
   * POST /api/auth/logout
   */
  logout = async ({ set }: any) => {
    // In a stateless JWT system, logout is handled client-side
    // Here we could implement token blacklisting if needed
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    set.status = 200;
    return response;
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile = async ({ jwt, set, headers }: any) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization token required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token',
          error: 'UNAUTHORIZED',
        };
      }

      const userId = payload.userId;
      const result = await this.userService.getUserById(userId);

      if (result.success) {
        set.status = 200;
        return result;
      } else {
        const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 500;
        set.status = statusCode;
        return result;
      }
    } catch (error) {
      Logger.error('Get profile error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  updateProfile = async ({ body, jwt, set, headers }: any) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization token required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token',
          error: 'UNAUTHORIZED',
        };
      }

      const userId = payload.userId;
      const updateData = body;
      
      // Remove sensitive fields that shouldn't be updated through this endpoint
      delete updateData.password;
      delete updateData.role;

      const result = await this.userService.updateUser(userId, updateData, userId);

      if (result.success) {
        set.status = 200;
        return result;
      } else {
        const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 400;
        set.status = statusCode;
        return result;
      }
    } catch (error) {
      Logger.error('Update profile error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };

  /**
   * Change user password
   * PUT /api/auth/password
   */
  changePassword = async ({ body, jwt, set, headers }: any) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization token required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token',
          error: 'UNAUTHORIZED',
        };
      }

      const userId = payload.userId;
      const { currentPassword, newPassword } = body;

      const result = await this.userService.changePassword(userId, currentPassword, newPassword);

      if (result.success) {
        set.status = 200;
        return result;
      } else {
        const statusCode = result.error === 'INVALID_PASSWORD' ? 400 : 500;
        set.status = statusCode;
        return result;
      }
    } catch (error) {
      Logger.error('Change password error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };

  /**
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  refreshToken = async ({ jwt, set, headers }: any) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization token required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token',
          error: 'UNAUTHORIZED',
        };
      }

      const userId = payload.userId;
      const result = await this.userService.getUserById(userId);

      if (result.success) {
        set.status = 200;
        return {
          success: true,
          message: 'Token refreshed successfully',
          data: result.data,
        };
      } else {
        set.status = 401;
        return {
          success: false,
          message: 'Token refresh failed',
          error: 'REFRESH_FAILED',
        };
      }
    } catch (error) {
      Logger.error('Refresh token error', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  };
}

// Create controller instance
const authController = new AuthControllerElysia();

// Export controller methods with validation
export const authRoutes = {
  register: (app: Elysia) => app
    .post('/register', authController.register, {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
      },
    }),

  login: (app: Elysia) => app
    .post('/login', authController.login, {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user with email and password',
      },
    }),

  logout: (app: Elysia) => app
    .post('/logout', authController.logout, {
      detail: {
        tags: ['Authentication'],
        summary: 'User logout',
        description: 'Logout the current user',
      },
    }),

  getProfile: (app: Elysia) => app
    .get('/me', authController.getProfile, {
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Get user profile',
        description: 'Get current user profile information',
      },
    }),

  updateProfile: (app: Elysia) => app
    .put('/profile', authController.updateProfile, {
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Update user profile',
        description: 'Update current user profile information',
      },
    }),

  changePassword: (app: Elysia) => app
    .put('/password', authController.changePassword, {
      body: t.Object({
        currentPassword: t.String(),
        newPassword: t.String({ minLength: 8 }),
        confirmPassword: t.String(),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Change password',
        description: 'Change user password',
      },
    }),

  refreshToken: (app: Elysia) => app
    .post('/refresh', authController.refreshToken, {
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Refresh token',
        description: 'Refresh authentication token',
      },
    }),
};
