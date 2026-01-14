import { NextResponse } from 'next/server';
import { createAuthToken, checkRateLimit, resetRateLimit } from '@/lib/auth';

const CORRECT_PASSWORD = process.env.APP_PASSWORD;

export async function POST(request) {
  try {
    const { password } = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${waitMinutes} minutes.` },
        { status: 429 }
      );
    }
    
    if (!password || password !== CORRECT_PASSWORD) {
      return NextResponse.json(
        { 
          error: 'Incorrect password',
          remaining: rateLimit.remaining 
        },
        { status: 401 }
      );
    }
    
    const token = await createAuthToken();
    resetRateLimit(ip);
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}