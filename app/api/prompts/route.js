import { NextResponse } from 'next/server';
import { verifyAuthToken, sanitizeInput, validateFile, logSecurityEvent } from '@/lib/auth';
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

// POST new prompt - CRITICAL FIX #4: Enhanced file validation
export async function POST(request) {
  if (!await checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    
    // Sanitize text inputs (now includes HTML encoding)
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
    
    // Handle file uploads with ENHANCED VALIDATION
    const files = formData.getAll('files');
    const fileUrls = [];
    
    if (files && files.length > 0) {
      // Limit number of files per upload
      if (files.length > 5) {
        logSecurityEvent('SUSPICIOUS_FILE_UPLOAD', {
          reason: 'too_many_files',
          count: files.length
        });
        return NextResponse.json(
          { error: 'Maximum 5 files allowed per upload' },
          { status: 400 }
        );
      }
      
      // Limit total upload size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 50 * 1024 * 1024; // 50MB total
      if (totalSize > maxTotalSize) {
        return NextResponse.json(
          { error: 'Total upload size exceeds 50MB limit' },
          { status: 400 }
        );
      }
      
      for (const file of files) {
        if (file.size === 0) continue;
        
        // ENHANCED FILE VALIDATION - checks signatures, extensions, content
        const validation = await validateFile(file, 10); // 10MB max per file
        
        if (!validation.valid) {
          // Log suspicious upload attempts
          logSecurityEvent('SUSPICIOUS_FILE_UPLOAD', {
            filename: file.name,
            type: file.type,
            size: file.size,
            errors: validation.errors
          });
          
          return NextResponse.json(
            { error: validation.errors[0] },
            { status: 400 }
          );
        }
        
        // Use sanitized filename from validation
        const fileExt = validation.sanitizedFilename.split('.').pop()?.toLowerCase();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Supabase Storage
        const { data, error } = await supabaseServer.storage
          .from('prompt-results')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) {
          console.error('Upload error:', error);
          
          logSecurityEvent('FILE_UPLOAD_FAILED', {
            filename: validation.sanitizedFilename,
            error: error.message
          });
          
          return NextResponse.json(
            { error: 'File upload failed' },
            { status: 500 }
          );
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabaseServer.storage
          .from('prompt-results')
          .getPublicUrl(fileName);
        
        fileUrls.push(publicUrl);
        
        // Log successful upload
        logSecurityEvent('FILE_UPLOADED', {
          filename: validation.sanitizedFilename,
          type: file.type,
          size: file.size,
          storedAs: fileName
        });
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
    
    // Log successful prompt creation
    logSecurityEvent('PROMPT_CREATED', {
      promptId: data[0].id,
      filesCount: fileUrls.length
    });
    
    return NextResponse.json({ prompt: data[0] }, { status: 201 });
    
  } catch (error) {
    console.error('Server error:', error);
    
    logSecurityEvent('PROMPT_CREATION_ERROR', {
      error: error.message
    });
    
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

  // Sanitize ID to prevent injection
  const sanitizedId = sanitizeInput(id, 100);

  const { error } = await supabaseServer
    .from('prompts')
    .delete()
    .eq('id', sanitizedId);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }

  // Log deletion
  logSecurityEvent('PROMPT_DELETED', {
    promptId: sanitizedId
  });

  return NextResponse.json({ success: true });
}
