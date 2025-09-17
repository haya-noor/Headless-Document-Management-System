/**
 * Authentication controller
 * Handles authentication business logic
 */

import { UserService } from '../services/user.service';
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { generateToken, getTokenExpiration, verifyToken } from '../utils/jwt';
import { TokenBlacklistRepository } from '../repositories/implementations/token-blacklist.repository';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface RequestOptions {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Authentication controller class
 * Implements thin controller pattern - validates input, calls services, returns responses
 */
export class AuthController {
  private userService: UserService;
  private tokenBlacklistRepository: TokenBlacklistRepository;

  constructor() {
    this.userService = new UserService();
    this.tokenBlacklistRepository = new TokenBlacklistRepository();
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest, options: RequestOptions = {}): Promise<ApiResponse> {
    try {
      const result = await this.userService.registerUser(userData, options);
      return result;
    } catch (error) {
      Logger.error('Registration error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * User login
   */
  async login(credentials: LoginRequest, options: RequestOptions = {}): Promise<ApiResponse> {
    try {
      const result = await this.userService.loginUser(credentials.email, credentials.password, options);
      return result;
    } catch (error) {
      Logger.error('Login error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }


  /**
   * User logout
   */
  async logout(logoutData: LogoutRequest): Promise<ApiResponse> {
    try {
      const { refreshToken } = logoutData;
      
      // Get token expiration date and decode to get userId
      const expiresAt = getTokenExpiration(refreshToken);
      if (!expiresAt) {
        return {
          success: false,
          message: 'Invalid token format',
          error: 'INVALID_TOKEN',
        };
      }

      // Decode token to get userId
      let userId = '';
      try {
        const decoded = verifyToken(refreshToken);
        userId = decoded.userId;
      } catch (error) {
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Add token to blacklist
      await this.tokenBlacklistRepository.addToBlacklist({
        token: refreshToken,
        userId: userId,
        expiresAt: expiresAt,
      });

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      Logger.error('Logout error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get user profile
   */
  async getProfile(user: AuthenticatedRequest): Promise<ApiResponse> {
    try {
      const result = await this.userService.getUserById(user.userId);
      return result;
    } catch (error) {
      Logger.error('Get profile error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(user: AuthenticatedRequest, updateData: Partial<RegisterRequest>): Promise<ApiResponse> {
    try {
      const result = await this.userService.updateUser(user.userId, updateData, user.userId);
      return result;
    } catch (error) {
      Logger.error('Update profile error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(user: AuthenticatedRequest, passwordData: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    try {
      const result = await this.userService.changePassword(user.userId, passwordData.currentPassword, passwordData.newPassword);
      return result;
    } catch (error) {
      Logger.error('Change password error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(user: AuthenticatedRequest, password: string): Promise<ApiResponse> {
    try {
      const result = await this.userService.deactivateUser(user.userId, user.userId);
      return result;
    } catch (error) {
      Logger.error('Delete account error', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

}
