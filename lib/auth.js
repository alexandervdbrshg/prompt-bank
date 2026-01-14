import { SignJWT, jwtVerify } from 'jose';

// CRITICAL FIX #1: No fallback secret - fail fast if not configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set');
}
if (JWT_SECRET.length < 32) {
  throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters long');
}

const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function createAuthToken(sessionId = null) {
  const jti = sessionId || crypto.randomUUID();
  
  return await new SignJWT({ 
    authenticated: true,
    jti // Unique token ID for session tracking
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Reduced from 24h to 1h
    .setJti(jti)
    .sign(encodedSecret);
}

export async function verifyAuthToken(token) {
  try {
    if (!token) return false;
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload.authenticated === true;
  } catch (error) {
    return false;
  }
}

// CRITICAL FIX #5: Enhanced rate limiting with better tracking
// In production, replace this with Redis for persistence across server restarts
class RateLimiter {
  constructor() {
    this.loginAttempts = new Map();
    this.ipBlacklist = new Set();
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.loginAttempts.entries()) {
      if (now > data.resetAt) {
        this.loginAttempts.delete(key);
      }
    }
  }

  checkRateLimit(identifier) {
    const now = Date.now();
    
    // Check if IP is blacklisted
    if (this.ipBlacklist.has(identifier)) {
      return { 
        allowed: false, 
        remaining: 0,
        message: 'IP address temporarily blocked due to suspicious activity',
        resetAt: now + 3600000 // 1 hour
      };
    }
    
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      this.loginAttempts.set(identifier, { 
        count: 1, 
        resetAt: now + 900000, // 15 minutes
        firstAttempt: now 
      });
      return { allowed: true, remaining: 4 };
    }
    
    // Reset if window expired
    if (now > attempts.resetAt) {
      this.loginAttempts.set(identifier, { 
        count: 1, 
        resetAt: now + 900000,
        firstAttempt: now 
      });
      return { allowed: true, remaining: 4 };
    }
    
    // Block after 5 failed attempts
    if (attempts.count >= 5) {
      // After 10 failed attempts, add to blacklist for 1 hour
      if (attempts.count >= 10) {
        this.ipBlacklist.add(identifier);
        setTimeout(() => this.ipBlacklist.delete(identifier), 3600000);
      }
      
      return { 
        allowed: false, 
        remaining: 0,
        resetAt: attempts.resetAt,
        message: `Too many attempts. Try again in ${Math.ceil((attempts.resetAt - now) / 60000)} minutes.`
      };
    }
    
    attempts.count++;
    return { 
      allowed: true, 
      remaining: 5 - attempts.count 
    };
  }

  recordFailedAttempt(identifier) {
    const attempts = this.loginAttempts.get(identifier);
    if (attempts) {
      attempts.count++;
    }
  }

  resetRateLimit(identifier) {
    this.loginAttempts.delete(identifier);
  }
}

// Single instance for the application
const rateLimiter = new RateLimiter();

export function checkRateLimit(identifier) {
  return rateLimiter.checkRateLimit(identifier);
}

export function resetRateLimit(identifier) {
  return rateLimiter.resetRateLimit(identifier);
}

// CRITICAL FIX #4: Enhanced file validation with signature checking
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
  'video/mp4': [0x66, 0x74, 0x79, 0x70], // ftyp (at offset 4)
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
  'video/quicktime': [0x66, 0x74, 0x79, 0x70, 0x71, 0x74] // ftypqt
};

const ALLOWED_EXTENSIONS = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov']
};

function validateFileSignature(buffer, mimeType) {
  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) return false;
  
  // Special case for MP4 - signature is at offset 4
  let offset = 0;
  if (mimeType === 'video/mp4') {
    offset = 4;
  }
  
  // Check if buffer is long enough
  if (buffer.length < offset + signature.length) {
    return false;
  }
  
  // Verify signature bytes
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  
  return true;
}

function sanitizeFilename(filename) {
  // Remove any path traversal attempts and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 255);
}

export async function validateFile(file, maxSizeMB = 10) {
  const errors = [];
  
  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${maxSizeMB}MB`);
  }
  
  // Check minimum size (avoid empty files or zip bombs)
  if (file.size < 100) {
    errors.push('File too small or empty');
  }
  
  // Validate MIME type is in allowed list
  if (!ALLOWED_EXTENSIONS[file.type]) {
    errors.push('Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV');
  }
  
  // Validate file extension matches MIME type
  const filename = sanitizeFilename(file.name);
  const fileExt = filename.split('.').pop()?.toLowerCase();
  
  if (!fileExt || !ALLOWED_EXTENSIONS[file.type]?.includes(fileExt)) {
    errors.push(`File extension .${fileExt} does not match file type ${file.type}`);
  }
  
  // Check for double extensions (e.g., file.jpg.exe)
  const parts = filename.split('.');
  if (parts.length > 2) {
    errors.push('Multiple file extensions detected. Possible malicious file.');
  }
  
  // Validate file signature (magic numbers)
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (!validateFileSignature(buffer, file.type)) {
      errors.push('File content does not match declared file type. Possible malicious file.');
    }
    
    // Additional checks for images
    if (file.type.startsWith('image/')) {
      // Check for embedded scripts in images (basic check)
      const fileContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
      if (fileContent.includes('<script') || fileContent.includes('<?php')) {
        errors.push('File contains suspicious content');
      }
    }
    
  } catch (error) {
    errors.push('Failed to validate file content');
  }
  
  return { 
    valid: errors.length === 0, 
    errors,
    sanitizedFilename: filename 
  };
}

export function sanitizeInput(input, maxLength = 10000) {
  if (typeof input !== 'string') return '';
  
  // Trim and limit length
  let sanitized = input.slice(0, maxLength).trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Basic HTML entity encoding for special characters (prevent XSS)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

// Security logging function
export function logSecurityEvent(event, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details
  };
  
  // In production, send to a secure logging service
  console.log('[SECURITY]', JSON.stringify(logEntry));
  
  // For critical events, you could send alerts
  if (event === 'MULTIPLE_FAILED_LOGINS' || event === 'SUSPICIOUS_FILE_UPLOAD') {
    // TODO: Implement alerting (email, Slack, PagerDuty, etc.)
  }
}
