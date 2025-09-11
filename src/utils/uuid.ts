/**
 * UUID utility functions
 * Provides application-generated UUID functionality
 */

import { v4 as uuidv4, validate as validateUuid } from 'uuid';

/**
 * Generate a new UUID v4
 * @returns {string} UUID string
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Validate UUID format
 * @param {string} id - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidId(id: string): boolean {
  return validateUuid(id);
}

/**
 * Generate multiple UUIDs
 * @param {number} count - Number of UUIDs to generate
 * @returns {string[]} Array of UUIDs
 */
export function generateIds(count: number): string[] {
  return Array.from({ length: count }, () => generateId());
}
