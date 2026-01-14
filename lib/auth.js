import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev');

export async function createAuthToken() {
  return await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(token) {
  try {
    if (!token) return false;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.authenticated === true;
  } catch (error) {
    return false;
  }
}

const loginAttempts = new Map();

export function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + 900000 });
    return { allowed: true, remaining: 4 };
  }
  
  if (now > attempts.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + 900000 });
    return { allowed: true, remaining: 4 };
  }
  
  if (attempts.count >= 5) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: attempts.resetAt 
    };
  }
  
  attempts.count++;
  return { allowed: true, remaining: 5 - attempts.count };
}

export function resetRateLimit(identifier) {
  loginAttempts.delete(identifier);
}

export function validateFile(file, maxSizeMB = 10) {
  const errors = [];
  
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${maxSizeMB}MB`);
  }
  
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV');
  }
  
  return { valid: errors.length === 0, errors };
}

export function sanitizeInput(input, maxLength = 10000) {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}