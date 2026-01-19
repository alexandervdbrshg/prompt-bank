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

  const { name, description, use_cases } = await request.json();
  const sanitizedName = sanitizeInput(name, 100);
  const sanitizedDescription = description ? sanitizeInput(description, 1000) : null;
  const sanitizedUseCases = use_cases ? sanitizeInput(use_cases, 1000) : null;

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
    .insert([{ 
      name: sanitizedName,
      description: sanitizedDescription,
      use_cases: sanitizedUseCases
    }])
    .select();

  if (error) {
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }

  return NextResponse.json({ tool: data[0] }, { status: 201 });
}

// PUT update tool
export async function PUT(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const { name, description, use_cases } = await request.json();
  const sanitizedName = sanitizeInput(name, 100);
  const sanitizedDescription = description ? sanitizeInput(description, 1000) : null;
  const sanitizedUseCases = use_cases ? sanitizeInput(use_cases, 1000) : null;

  if (!sanitizedName) {
    return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('tools')
    .update({ 
      name: sanitizedName,
      description: sanitizedDescription,
      use_cases: sanitizedUseCases
    })
    .eq('id', id)
    .select();

  if (error) {
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }

  return NextResponse.json({ tool: data[0] });
}

// DELETE tool
export async function DELETE(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const name = searchParams.get('name');

  if (!id && !name) {
    return NextResponse.json({ error: 'ID or name required' }, { status: 400 });
  }

  let query = supabaseServer.from('tools').delete();
  
  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('name', name);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}