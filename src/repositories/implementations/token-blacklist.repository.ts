/**
 * Token blacklist repository implementation using Drizzle ORM
 * Implements token blacklist data access operations
 */

import { eq, and, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseConfig } from '../../config/database';
import { tokenBlacklist } from '../../db/models/schema';
import { 
  ITokenBlacklistRepository, 
  CreateTokenBlacklistDTO,
  TokenBlacklist 
} from '../interfaces/token-blacklist.repository';

export class TokenBlacklistRepository implements ITokenBlacklistRepository {
  /**
   * Get database instance with null check
   */
  private getDb() {
    return databaseConfig.getDatabase();
  }

  /**
   * Add token to blacklist
   */
  async addToBlacklist(data: CreateTokenBlacklistDTO): Promise<TokenBlacklist> {
    try {
      const blacklistId = uuidv4();
      const now = new Date();

      const [blacklistedToken] = await this.getDb()
        .insert(tokenBlacklist)
        .values({
          id: blacklistId,
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: now,
        })
        .returning();

      return blacklistedToken;
    } catch (error) {
      throw new Error(`Failed to add token to blacklist: ${error}`);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const [blacklistedToken] = await this.getDb()
        .select({ id: tokenBlacklist.id })
        .from(tokenBlacklist)
        .where(and(
          eq(tokenBlacklist.token, token),
          lt(new Date(), tokenBlacklist.expiresAt) // Token not expired
        ))
        .limit(1);

      return !!blacklistedToken;
    } catch (error) {
      throw new Error(`Failed to check token blacklist: ${error}`);
    }
  }

  /**
   * Remove expired tokens from blacklist
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(tokenBlacklist)
        .where(lt(tokenBlacklist.expiresAt, new Date()));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error}`);
    }
  }

  /**
   * Get all blacklisted tokens for a user
   */
  async getUserBlacklistedTokens(userId: string): Promise<TokenBlacklist[]> {
    try {
      const result = await this.getDb()
        .select()
        .from(tokenBlacklist)
        .where(eq(tokenBlacklist.userId, userId))
        .orderBy(tokenBlacklist.createdAt);

      return result;
    } catch (error) {
      throw new Error(`Failed to get user blacklisted tokens: ${error}`);
    }
  }

  /**
   * Remove all tokens for a user (logout from all devices)
   */
  async removeAllUserTokens(userId: string): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(tokenBlacklist)
        .where(eq(tokenBlacklist.userId, userId));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to remove all user tokens: ${error}`);
    }
  }
}
