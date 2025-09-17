/**
 * Token blacklist repository interface
 * Defines methods for managing blacklisted JWT tokens
 */

export interface TokenBlacklist {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateTokenBlacklistDTO {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface ITokenBlacklistRepository {
  /**
   * Add token to blacklist
   */
  addToBlacklist(data: CreateTokenBlacklistDTO): Promise<TokenBlacklist>;

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token: string): Promise<boolean>;

  /**
   * Remove expired tokens from blacklist
   */
  cleanupExpiredTokens(): Promise<number>;

  /**
   * Get all blacklisted tokens for a user
   */
  getUserBlacklistedTokens(userId: string): Promise<TokenBlacklist[]>;

  /**
   * Remove all tokens for a user (logout from all devices)
   */
  removeAllUserTokens(userId: string): Promise<number>;
}
