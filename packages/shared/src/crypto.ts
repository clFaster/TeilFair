/**
 * Cryptographic utilities for capability-based security
 * These functions work in both browser and React Native environments
 */

const TOKEN_LENGTH = 32;
const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a cryptographically secure random token
 * Works in browser (crypto.getRandomValues) and Node.js (crypto.randomBytes)
 */
export function generateToken(length: number = TOKEN_LENGTH): string {
  let result = '';
  
  // Browser/React Native environment
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += TOKEN_CHARS[array[i] % TOKEN_CHARS.length];
    }
  } else {
    // Fallback for environments without crypto (should not happen in production)
    throw new Error('No cryptographic random number generator available');
  }
  
  return result;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Set version (4) and variant (2) bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  
  throw new Error('No cryptographic random number generator available');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Create capability URLs for a group
 */
export interface GroupUrls {
  readUrl: string;
  writeUrl: string;
}

export function createGroupUrls(
  baseUrl: string,
  groupId: string,
  readToken: string,
  writeToken: string
): GroupUrls {
  return {
    readUrl: `${baseUrl}/g/${groupId}?t=${readToken}`,
    writeUrl: `${baseUrl}/g/${groupId}?t=${writeToken}`,
  };
}

/**
 * Parse a capability URL to extract group ID and token
 */
export interface ParsedCapabilityUrl {
  groupId: string;
  token: string;
}

export function parseCapabilityUrl(url: string): ParsedCapabilityUrl | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/g\/([a-f0-9-]+)/i);
    const token = urlObj.searchParams.get('t');
    
    if (pathMatch && token) {
      return {
        groupId: pathMatch[1],
        token,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate that a token has the expected format
 */
export function isValidToken(token: string): boolean {
  if (token.length !== TOKEN_LENGTH) {
    return false;
  }
  
  for (const char of token) {
    if (!TOKEN_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}
