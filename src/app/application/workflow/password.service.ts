/**
 * Password Service
 * Handles password hashing and verification
 * Pure domain service with no external dependencies
 */

import { Effect } from 'effect';
import { ValidationError } from "../shared/errors";

export class PasswordService {
  /**
   * Hash a password
   */
  hashPassword(password: string): Effect.Effect<string, ValidationError> {
    return Effect.gen(function* () {
      // Validate password strength
      if (password.length < 8) {
        return yield* Effect.fail(new ValidationError('Password must be at least 8 characters long'));
      }

      if (!/[A-Z]/.test(password)) {
        return yield* Effect.fail(new ValidationError('Password must contain at least one uppercase letter'));
      }

      if (!/[a-z]/.test(password)) {
        return yield* Effect.fail(new ValidationError('Password must contain at least one lowercase letter'));
      }

      if (!/[0-9]/.test(password)) {
        return yield* Effect.fail(new ValidationError('Password must contain at least one number'));
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return yield* Effect.fail(new ValidationError('Password must contain at least one special character'));
      }

      // In a real implementation, you would use bcrypt or similar
      // For now, we'll simulate hashing
      const hashedPassword = `hashed_${password}_${Date.now()}`;
      
      return hashedPassword;
    });
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hashedPassword: string): Effect.Effect<boolean, never> {
    return Effect.succeed(() => {
      // In a real implementation, you would use bcrypt.compare()
      // For now, we'll simulate verification
      return hashedPassword.startsWith('hashed_') && hashedPassword.includes(password);
    });
  }

  /**
   * Generate a random password
   */
  generatePassword(length = 12): Effect.Effect<string, never> {
    return Effect.succeed(() => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      
      return password;
    });
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): Effect.Effect<{
    isValid: boolean;
    score: number;
    feedback: string[];
  }, never> {
    return Effect.succeed(() => {
      const feedback: string[] = [];
      let score = 0;

      if (password.length >= 8) {
        score += 1;
      } else {
        feedback.push('Password should be at least 8 characters long');
      }

      if (password.length >= 12) {
        score += 1;
      }

      if (/[A-Z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('Add uppercase letters');
      }

      if (/[a-z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('Add lowercase letters');
      }

      if (/[0-9]/.test(password)) {
        score += 1;
      } else {
        feedback.push('Add numbers');
      }

      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
      } else {
        feedback.push('Add special characters');
      }

      if (password.length >= 16) {
        score += 1;
      }

      return {
        isValid: score >= 4,
        score,
        feedback
      };
    });
  }
}

