import { NextResponse } from 'next/server';
import { createAuthToken, checkRateLimit, resetRateLimit, logSecurityEvent } from '@/lib/auth';
import { createHash, timingSafeEqual } from 'crypto';

// CRITICAL FIX #2: Validate password is set and strong
const CORRECT_PASSWORD = process.env.APP_PASSWORD;

if (!CORRECT_PASSWORD) {
  throw new Error('CRITICAL: APP_PASSWORD environment variable must be set');
}

if (CORRECT_PASSWORD.length < 12) {
  throw new Error('CRITICAL: APP_PASSWORD must be at least 12 characters long');
}

// Hash the correct password once at startup for constant-time comparison
const hashedPassword = createHash('sha256').update(CORRECT_PASSWORD).digest();

// Timing-safe password comparison to prevent timing attacks
function verifyPassword(inputPassword) {
  if (!inputPassword || typeof inputPassword !== 'string') {
    return false;
  }
  
  const inputHash = createHash('sha256').update(inputPassword).digest();
  
  try {
    // Use timing-safe comparison
    return timingSafeEqual(hashedPassword, inputHash);
  } catch {
    return false;
  }
}

export async function POST(request) {
  let ip = 'unknown';
  
  try {
    const { password } = await request.json();
    
    // Get client IP address
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || // Cloudflare
         'unknown';
    
    // Check rate limiting
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      
      // Log suspicious activity
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip,
        attempts: 'exceeded',
        action: 'login_blocked'
      });
      
      return NextResponse.json(
        { 
          error: rateLimit.message || `Too many attempts. Try again in ${waitMinutes} minutes.`,
          remaining: 0
        },
        { status: 429 }
      );
    }
    
    // Validate password (using timing-safe comparison)
    const isValid = verifyPassword(password);
    
    if (!isValid) {
      // Log failed attempt
      logSecurityEvent('FAILED_LOGIN', {
        ip,
        reason: 'incorrect_password',
        remaining: rateLimit.remaining
      });
      
      return NextResponse.json(
        { 
          error: 'Incorrect password',
          remaining: rateLimit.remaining 
        },
        { status: 401 }
      );
    }
    
    // Successful login - create token
    const sessionId = crypto.randomUUID();
    const token = await createAuthToken(sessionId);
    resetRateLimit(ip);
    
    // Log successful login
    logSecurityEvent('SUCCESSFUL_LOGIN', {
      ip,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Authentication successful'
    });
    
    // Set secure cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true, // Prevents JavaScript access
      secure: true, // Always require HTTPS (even in dev - use local HTTPS)
      sameSite: 'strict', // Strict CSRF protection
      maxAge: 3600, // 1 hour (reduced from 24 hours)
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Log error
    logSecurityEvent('LOGIN_ERROR', {
      ip,
      error: error.message
    });
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
