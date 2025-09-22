/**
 * Security configuration
 * Contains all security-related configuration settings
 */

export const securityConfig = {
  bcryptRounds: 12, // Number of salt rounds for bcrypt
  downloadLinkExpiry: 3600, // Pre-signed URL expiry in seconds (1 hour)
} as const;
