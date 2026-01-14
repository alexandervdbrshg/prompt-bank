import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  const isValid = await verifyAuthToken(token);
  
  return NextResponse.json({ authenticated: isValid });
}