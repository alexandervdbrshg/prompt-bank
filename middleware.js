import { NextResponse } from 'next/server';
import { verifyAuthToken } from './lib/auth';

export async function middleware(request) {
  // Protect API routes except login
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow login endpoint
    if (request.nextUrl.pathname === '/api/auth/login') {
      return NextResponse.next();
    }
    
    // Check authentication for all other API routes
    const token = request.cookies.get('auth-token')?.value;
    const isValid = await verifyAuthToken(token);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
