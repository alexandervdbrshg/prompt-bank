import { NextResponse } from 'next/server';
import { verifyAuthToken, sanitizeInput } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  return await verifyAuthToken(token);
}

// GET all use cases for a tool
export async function GET(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const toolId = searchParams.get('tool_id');

  if (!toolId) {
    return NextResponse.json({ error: 'Tool ID required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('use_cases')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching use cases:', error);
    return NextResponse.json({ error: 'Failed to fetch use cases' }, { status: 500 });
  }

  return NextResponse.json({ use_cases: data });
}

// POST new use case
export async function POST(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tool_id, title, explanation, example_image_urls } = body;

    const sanitizedTitle = sanitizeInput(title, 200);
    const sanitizedExplanation = explanation ? sanitizeInput(explanation, 2000) : null;

    if (!tool_id) {
      return NextResponse.json({ error: 'Tool ID required' }, { status: 400 });
    }

    if (!sanitizedTitle) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('use_cases')
      .insert([{
        tool_id: parseInt(tool_id),
        title: sanitizedTitle,
        explanation: sanitizedExplanation,
        example_image_urls: example_image_urls && example_image_urls.length > 0 ? example_image_urls : null
      }])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to create use case' }, { status: 500 });
    }

    return NextResponse.json({ use_case: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating use case:', error);
    return NextResponse.json({ error: error.message || 'Failed to create use case' }, { status: 500 });
  }
}

// PUT update use case
export async function PUT(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Use case ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, explanation, example_image_urls } = body;

    const sanitizedTitle = sanitizeInput(title, 200);
    const sanitizedExplanation = explanation ? sanitizeInput(explanation, 2000) : null;

    if (!sanitizedTitle) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('use_cases')
      .update({
        title: sanitizedTitle,
        explanation: sanitizedExplanation,
        example_image_urls: example_image_urls && example_image_urls.length > 0 ? example_image_urls : null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update use case' }, { status: 500 });
    }

    return NextResponse.json({ use_case: data[0] });
  } catch (error) {
    console.error('Error updating use case:', error);
    return NextResponse.json({ error: error.message || 'Failed to update use case' }, { status: 500 });
  }
}

// DELETE use case
export async function DELETE(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Use case ID required' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('use_cases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete use case' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
