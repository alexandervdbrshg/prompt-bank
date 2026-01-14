import { NextResponse } from 'next/server';
import { verifyAuthToken, sanitizeInput } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  return await verifyAuthToken(token);
}

// GET all tools
export async function GET() {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('tools')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }

  return NextResponse.json({ tools: data });
}

// POST new tool
export async function POST(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();
  const sanitizedName = sanitizeInput(name, 100);

  if (!sanitizedName) {
    return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
  }

  // Check if exists
  const { data: existing } = await supabaseServer
    .from('tools')
    .select('name')
    .eq('name', sanitizedName)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Tool already exists' }, { status: 409 });
  }

  const { data, error } = await supabaseServer
    .from('tools')
    .insert([{ name: sanitizedName }])
    .select();

  if (error) {
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }

  return NextResponse.json({ tool: data[0] }, { status: 201 });
}

// DELETE tool
export async function DELETE(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('tools')
    .delete()
    .eq('name', name);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}