import { NextResponse } from 'next/server';
import { verifyAuthToken } from './lib/auth';

export async function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/api/auth/login')) {
    
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