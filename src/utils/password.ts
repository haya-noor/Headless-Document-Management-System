/**
 * Password utility functions for hashing and verification
 * Uses bcrypt for secure password handling
 */

import bcrypt from 'bcryptjs';
import { config } from '../config';

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password
 * @throws {Error} If hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = config.security.bcryptRounds;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error}`);
  }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} True if password matches hash
 * @throws {Error} If verification fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    throw new Error(`Password verification failed: ${error}`);
  }
}

/**
 * Validate password strength
 * Ensures password meets security requirements
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with success status and errors
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS attacks)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }

  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Contains special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    '123456',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
  ];

  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password contains common weak patterns');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
