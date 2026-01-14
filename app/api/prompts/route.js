import { NextResponse } from 'next/server';
import { verifyAuthToken, sanitizeInput, validateFile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  return await verifyAuthToken(token);
}

// GET all prompts
export async function GET() {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }

  return NextResponse.json({ prompts: data });
}

// POST new prompt
export async function POST(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    
    // Sanitize text inputs
    const prompt = sanitizeInput(formData.get('prompt'), 5000);
    const tool = sanitizeInput(formData.get('tool'), 100);
    const resultText = sanitizeInput(formData.get('resultText'), 10000);
    const notes = sanitizeInput(formData.get('notes'), 5000);
    const tags = formData.get('tags') ? [sanitizeInput(formData.get('tags'), 50)] : [];
    
    // Validation
    if (!prompt || !tool) {
      return NextResponse.json(
        { error: 'Prompt and tool are required' },
        { status: 400 }
      );
    }
    
    // Handle file uploads
    const files = formData.getAll('files');
    const fileUrls = [];
    
    if (files && files.length > 0) {
      // Limit number of files
      if (files.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 files allowed' },
          { status: 400 }
        );
      }
      
      for (const file of files) {
        if (file.size === 0) continue;
        
        // Validate file
        const validation = validateFile(file, 10); // 10MB max
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.errors[0] },
            { status: 400 }
          );
        }
        
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const { data, error } = await supabaseServer.storage
          .from('prompt-results')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) {
          console.error('Upload error:', error);
          return NextResponse.json(
            { error: 'File upload failed' },
            { status: 500 }
          );
        }
        
        const { data: { publicUrl } } = supabaseServer.storage
          .from('prompt-results')
          .getPublicUrl(fileName);
        
        fileUrls.push(publicUrl);
      }
    }
    
    // Validate at least one result
    if (!resultText && fileUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one result (text or file) is required' },
        { status: 400 }
      );
    }
    
    // Insert into database
    const { data, error } = await supabaseServer
      .from('prompts')
      .insert([{
        prompt,
        tool,
        result_text: resultText || null,
        result_file_urls: fileUrls,
        notes: notes || null,
        tags,
      }])
      .select();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save prompt' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ prompt: data[0] }, { status: 201 });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE prompt
export async function DELETE(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}