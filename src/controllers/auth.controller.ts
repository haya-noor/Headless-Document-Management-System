/**
 * Authentication controller
 * Handles authentication-related HTTP requests with thin controller pattern
 */

import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema, changePasswordSchema } from '../schemas/auth.schemas';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest, ApiResponse } from '../types';

/**
 * Authentication controller class
 * Implements thin controller pattern - validates input, calls services, returns responses
 */
export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * User registration endpoint
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData = req.body;
    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await this.userService.registerUser(userData, options);

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error === 'EMAIL_EXISTS' ? 409 : 400;
      res.status(statusCode).json(result);
    }
  });

  /**
   * User login endpoint
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await this.userService.loginUser(email, password, options);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error === 'ACCOUNT_DEACTIVATED' ? 403 : 401;
      res.status(statusCode).json(result);
    }
  });

  /**
   * User logout endpoint
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // In a stateless JWT system, logout is handled client-side
    // Here we could implement token blacklisting if needed
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    res.status(200).json(response);
  });

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user.userId;
    const result = await this.userService.getUserById(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user.userId;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated through this endpoint
    delete updateData.password;
    delete updateData.role;

    const result = await this.userService.updateUser(userId, updateData, userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 400;
      res.status(statusCode).json(result);
    }
  });

  /**
   * Change user password
   * PUT /api/auth/password
   */
  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const result = await this.userService.changePassword(userId, currentPassword, newPassword);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error === 'INVALID_PASSWORD' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  });

  /**
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // In this implementation, we'll just return the current user info
    // In a more complex system, you might implement refresh tokens
    const userId = req.user.userId;
    const result = await this.userService.getUserById(userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result.data,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token refresh failed',
        error: 'REFRESH_FAILED',
      });
    }
  });
}

// Create controller instance
const authController = new AuthController();

// Export controller methods with validation middleware
export const authRoutes = {
  register: [
    validateRequest({ body: registerSchema }),
    authController.register,
  ],
  login: [
    validateRequest({ body: loginSchema }),
    authController.login,
  ],
  logout: authController.logout,
  getProfile: authController.getProfile,
  updateProfile: authController.updateProfile,
  changePassword: [
    validateRequest({ body: changePasswordSchema }),
    authController.changePassword,
  ],
  refreshToken: authController.refreshToken,
};
