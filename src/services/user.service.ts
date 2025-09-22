/**
 * User service layer
 * Implements business logic for user management operations
 */

import { User, PaginationParams, PaginatedResponse, ApiResponse } from '../types';
import { IUserRepository, CreateUserDTO, UpdateUserDTO, UserFiltersDTO } from '../repositories/interfaces/user.repository';
import { UserRepository } from '../repositories/implementations/user.repository';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateToken, getTokenExpiration, verifyToken } from '../utils/jwt';
import { Logger, AuditLogger } from '../http/middleware/logging';
import { TokenBlacklistRepository } from '../repositories/implementations/token-blacklist.repository';

/**
 * User service class
 * Provides business logic layer for user operations
 */
export class UserService {
  private userRepository: IUserRepository;
  private tokenBlacklistRepository: TokenBlacklistRepository;

  constructor(userRepository?: IUserRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.tokenBlacklistRepository = new TokenBlacklistRepository();
  }

  /**
   * Register a new user,  DTO = Data Transfer Object
   * @param {CreateUserDTO} userData - User registration data
   * @param {Object} options - Registration options
   * @returns {Promise<ApiResponse<{user: User; token: string}>>} Registration result
   */
  async registerUser(
    userData: CreateUserDTO,
    options: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      // Check if email is already taken
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        AuditLogger.logAuth({
          action: 'login_failed' as any,
          email: userData.email,
          ip: options.ipAddress,
          userAgent: options.userAgent,
          success: false,
          reason: 'Email already exists',
        });

        return {
          success: false,
          message: 'Email address is already registered',
          error: 'EMAIL_EXISTS',
        };
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'Password does not meet security requirements',
          error: 'WEAK_PASSWORD',
          data: { errors: passwordValidation.errors } as any,
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Log successful registration
      AuditLogger.logAuth({
        action: 'login' as any,
        userId: user.id,
        email: user.email,
        ip: options.ipAddress,
        userAgent: options.userAgent,
        success: true,
      });

      Logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        message: 'User registered successfully',
        data: { user, token },
      };
    } catch (error) {
      Logger.error('User registration failed', { error, userData: { email: userData.email } });
      return {
        success: false,
        message: 'Registration failed',
        error: 'REGISTRATION_FAILED',
      };
    }
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Login options
   * @returns {Promise<ApiResponse<{user: User; token: string}>>} Login result
   */
  async loginUser(
    email: string,
    password: string,
    options: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        AuditLogger.logAuth({
          action: 'login_failed' as any,
          email,
          ip: options.ipAddress,
          userAgent: options.userAgent,
          success: false,
          reason: 'User not found',
        });

        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        AuditLogger.logAuth({
          action: 'login_failed' as any,
          userId: user.id,
          email,
          ip: options.ipAddress,
          userAgent: options.userAgent,
          success: false,
          reason: 'Account deactivated',
        });

        return {
          success: false,
          message: 'Account has been deactivated',
          error: 'ACCOUNT_DEACTIVATED',
        };
      }

      // Verify password
      const userWithPassword = await this.userRepository.findOne({ email }, true);
      if (!userWithPassword || !(userWithPassword as any).password) {
        AuditLogger.logAuth({
          action: 'login_failed' as any,
          email,
          ip: options.ipAddress,
          userAgent: options.userAgent,
          success: false,
          reason: 'Password verification failed',
        });

        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        };
      }

      const isPasswordValid = await verifyPassword(password, (userWithPassword as any).password);
      if (!isPasswordValid) {
        AuditLogger.logAuth({
          action: 'login_failed' as any,
          userId: user.id,
          email,
          ip: options.ipAddress,
          userAgent: options.userAgent,
          success: false,
          reason: 'Invalid password',
        });

        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        };
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Log successful login
      AuditLogger.logAuth({
        action: 'login' as any,
        userId: user.id,
        email,
        ip: options.ipAddress,
        userAgent: options.userAgent,
        success: true,
      });

      Logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Login successful',
        data: { user, token },
      };
    } catch (error) {
      Logger.error('User login failed', { error, email });
      return {
        success: false,
        message: 'Login failed',
        error: 'LOGIN_FAILED',
      };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User unique identifier
   * @returns {Promise<ApiResponse<User>>} User data
   */
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
      };
    } catch (error) {
      Logger.error('Failed to get user by ID', { error, userId });
      return {
        success: false,
        message: 'Failed to retrieve user',
        error: 'USER_RETRIEVAL_FAILED',
      };
    }
  }

  /**
   * Get users with pagination and filtering
   * @param {PaginationParams} pagination - Pagination parameters
   * @param {UserFiltersDTO} filters - Optional filters
   * @returns {Promise<ApiResponse<PaginatedResponse<User>>>} Paginated users
   */
  async getUsers(
    pagination: PaginationParams,
    filters?: UserFiltersDTO
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      const result = await this.userRepository.findManyPaginated(pagination, filters);
      
      return {
        success: true,
        message: 'Users retrieved successfully',
        data: result,
      };
    } catch (error) {
      Logger.error('Failed to get users', { error, pagination, filters });
      return {
        success: false,
        message: 'Failed to retrieve users',
        error: 'USERS_RETRIEVAL_FAILED',
      };
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User unique identifier
   * @param {UpdateUserDTO} updateData - User update data
   * @param {string} updatedBy - ID of user making the update
   * @returns {Promise<ApiResponse<User>>} Updated user
   */
  async updateUser(
    userId: string,
    updateData: UpdateUserDTO,
    updatedBy: string
  ): Promise<ApiResponse<User>> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Check if email is being changed and if it's already taken
      if (updateData.email && updateData.email !== existingUser.email) {
        const isEmailTaken = await this.userRepository.isEmailTaken(updateData.email, userId);
        if (isEmailTaken) {
          return {
            success: false,
            message: 'Email address is already in use',
            error: 'EMAIL_EXISTS',
          };
        }
      }

      // Hash new password if provided
      if (updateData.password) {
        const passwordValidation = validatePasswordStrength(updateData.password);
        if (!passwordValidation.isValid) {
          return {
            success: false,
            message: 'Password does not meet security requirements',
            error: 'WEAK_PASSWORD',
            data: { errors: passwordValidation.errors } as any,
          };
        }
        updateData.password = await hashPassword(updateData.password);
      }

      // Update user
      const updatedUser = await this.userRepository.update(userId, updateData);
      
      if (!updatedUser) {
        return {
          success: false,
          message: 'Failed to update user',
          error: 'UPDATE_FAILED',
        };
      }

      Logger.info('User updated successfully', {
        userId,
        updatedBy,
        changes: Object.keys(updateData),
      });

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      Logger.error('Failed to update user', { error, userId, updateData });
      return {
        success: false,
        message: 'Failed to update user',
        error: 'UPDATE_FAILED',
      };
    }
  }

  /**
   * Change user password
   * @param {string} userId - User unique identifier
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<ApiResponse<void>>} Password change result
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    try {
      // Get user with password
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      const user = await this.userRepository.findOne({ email: existingUser.email }, true);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Verify current password
      if (!(await verifyPassword(currentPassword, (user as any).password))) {
        return {
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_PASSWORD',
        };
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'New password does not meet security requirements',
          error: 'WEAK_PASSWORD',
          data: { errors: passwordValidation.errors } as any,
        };
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword);
      const success = await this.userRepository.updatePassword(userId, hashedPassword);

      if (!success) {
        return {
          success: false,
          message: 'Failed to update password',
          error: 'PASSWORD_UPDATE_FAILED',
        };
      }

      Logger.info('User password changed successfully', { userId });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      Logger.error('Failed to change password', { error, userId });
      return {
        success: false,
        message: 'Failed to change password',
        error: 'PASSWORD_CHANGE_FAILED',
      };
    }
  }

  /**
   * Deactivate user account
   * @param {string} userId - User unique identifier
   * @param {string} deactivatedBy - ID of user performing deactivation
   * @returns {Promise<ApiResponse<void>>} Deactivation result
   */
  async deactivateUser(userId: string, deactivatedBy: string): Promise<ApiResponse<void>> {
    try {
      const success = await this.userRepository.deactivateUser(userId);
      
      if (!success) {
        return {
          success: false,
          message: 'Failed to deactivate user',
          error: 'DEACTIVATION_FAILED',
        };
      }

      Logger.info('User deactivated successfully', { userId, deactivatedBy });

      return {
        success: true,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      Logger.error('Failed to deactivate user', { error, userId, deactivatedBy });
      return {
        success: false,
        message: 'Failed to deactivate user',
        error: 'DEACTIVATION_FAILED',
      };
    }
  }


  /**
   * Search users
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @returns {Promise<ApiResponse<User[]>>} Search results
   */
  async searchUsers(searchTerm: string, limit = 10): Promise<ApiResponse<User[]>> {
    try {
      const users = await this.userRepository.searchUsers(searchTerm, limit);
      
      return {
        success: true,
        message: 'Users search completed',
        data: users,
      };
    } catch (error) {
      Logger.error('Failed to search users', { error, searchTerm });
      return {
        success: false,
        message: 'Failed to search users',
        error: 'SEARCH_FAILED',
      };
    }
  }

  // ===== ENHANCED METHODS FROM AUTH CONTROLLER =====

  /**
   * User logout with token blacklisting (Enhanced from controller)
   */
  async logoutUser(refreshToken: string): Promise<ApiResponse<void>> {
    try {
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
        Logger.warn('Invalid refresh token during logout', { error });
        return {
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_TOKEN',
        };
      }

      // Add token to blacklist
      await this.tokenBlacklistRepository.addToBlacklist({
        token: refreshToken,
        userId,
        expiresAt,
      });

      // Log audit trail
      AuditLogger.logAuth({
        action: 'logout' as any,
        userId,
        success: true,
      });

      Logger.info('User logged out successfully', { userId });

      return {
        success: true,
        message: 'Logged out successfully',
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
   * Get user profile (Enhanced from controller)
   */
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      };
    } catch (error) {
      Logger.error('Failed to get user profile', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update user profile (Enhanced from controller)
   */
  async updateUserProfile(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<ApiResponse<User>> {
    try {
      // Check if email is being updated and if it's already taken
      if (updateData.email) {
        const existingUser = await this.userRepository.findByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          return {
            success: false,
            message: 'Email address is already registered',
            error: 'EMAIL_EXISTS',
          };
        }
      }

      const updatedUser = await this.userRepository.update(userId, updateData);
      if (!updatedUser) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      Logger.info('User profile updated successfully', { userId });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      Logger.error('Failed to update user profile', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Change user password (Enhanced from controller)
   */
  async changeUserPassword(
    userId: string,
    passwordData: {
      currentPassword: string;
      newPassword: string;
    }
  ): Promise<ApiResponse<void>> {
    try {
      // Get user first to get email
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Get user with password using email
      const userWithPassword = await this.userRepository.findOne({ email: user.email }, true);
      if (!userWithPassword || !(userWithPassword as any).password) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        passwordData.currentPassword,
        (userWithPassword as any).password
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD',
        };
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'New password does not meet security requirements',
          error: 'WEAK_PASSWORD',
          data: { errors: passwordValidation.errors } as any,
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password
      await this.userRepository.update(userId, { password: hashedPassword });

      Logger.info('User password changed successfully', { userId });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      Logger.error('Failed to change user password', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Delete user account (Enhanced from controller)
   */
  async deleteUserAccount(userId: string, password: string): Promise<ApiResponse<void>> {
    try {
      // Get user first to get email
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Get user with password using email
      const userWithPassword = await this.userRepository.findOne({ email: user.email }, true);
      if (!userWithPassword || !(userWithPassword as any).password) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, (userWithPassword as any).password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Password is incorrect',
          error: 'INVALID_PASSWORD',
        };
      }

      // Soft delete user account
      await this.userRepository.update(userId, { isActive: false });

      Logger.info('User account deleted successfully', { userId });

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      Logger.error('Failed to delete user account', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      };
    }
  }
}
