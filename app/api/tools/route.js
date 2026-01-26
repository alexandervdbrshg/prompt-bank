import { NextResponse } from 'next/server';
import { verifyAuthToken, sanitizeInput, validateFile, logSecurityEvent } from '@/lib/auth';
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

  try {
    const formData = await request.formData();
    
    const name = formData.get('name');
    const model = formData.get('model');
    const tag = formData.get('tag');
    const description = formData.get('description');
    const use_cases = formData.get('use_cases');
    const rating = parseInt(formData.get('rating') || '0');
    const example_explanations = formData.get('example_explanations');
    const files = formData.getAll('example_images');

    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedModel = model ? sanitizeInput(model, 100) : null;
    const sanitizedTag = tag ? sanitizeInput(tag, 50) : 'Other';
    const sanitizedDescription = description ? sanitizeInput(description, 2000) : null;
    const sanitizedUseCases = use_cases ? sanitizeInput(use_cases, 2000) : null;
    const sanitizedExampleExplanations = example_explanations ? sanitizeInput(example_explanations, 2000) : null;

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

    // Upload example images if any
    const imageUrls = [];
    for (const file of files) {
      if (file && file.size > 0) {
        const validation = validateFile(file);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `tool-examples/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabaseServer.storage
          .from('tool-examples')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          return NextResponse.json({ error: 'Failed to upload example image' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseServer.storage
          .from('tool-examples')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }
    }

    // Create tool
    const { data, error } = await supabaseServer
      .from('tools')
      .insert([{ 
        name: sanitizedName,
        model: sanitizedModel,
        tag: sanitizedTag,
        description: sanitizedDescription,
        use_cases: sanitizedUseCases,
        rating: rating,
        example_explanations: sanitizedExampleExplanations,
        example_image_urls: imageUrls.length > 0 ? imageUrls : null
      }])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    return NextResponse.json({ tool: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
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

  try {
    const formData = await request.formData();
    
    const name = formData.get('name');
    const model = formData.get('model');
    const tag = formData.get('tag');
    const description = formData.get('description');
    const use_cases = formData.get('use_cases');
    const rating = parseInt(formData.get('rating') || '0');
    const example_explanations = formData.get('example_explanations');
    const files = formData.getAll('example_images');

    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedModel = model ? sanitizeInput(model, 100) : null;
    const sanitizedTag = tag ? sanitizeInput(tag, 50) : 'Other';
    const sanitizedDescription = description ? sanitizeInput(description, 2000) : null;
    const sanitizedUseCases = use_cases ? sanitizeInput(use_cases, 2000) : null;
    const sanitizedExampleExplanations = example_explanations ? sanitizeInput(example_explanations, 2000) : null;

    if (!sanitizedName) {
      return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
    }

    // Get existing tool to preserve or delete old images
    const { data: existingTool } = await supabaseServer
      .from('tools')
      .select('example_image_urls')
      .eq('id', id)
      .single();

    // Upload new example images if any
    const imageUrls = existingTool?.example_image_urls || [];
    for (const file of files) {
      if (file && file.size > 0) {
        const validation = validateFile(file);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `tool-examples/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabaseServer.storage
          .from('tool-examples')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue; // Skip this file but don't fail the whole update
        }

        const { data: { publicUrl } } = supabaseServer.storage
          .from('tool-examples')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }
    }

    const { data, error } = await supabaseServer
      .from('tools')
      .update({ 
        name: sanitizedName,
        model: sanitizedModel,
        tag: sanitizedTag,
        description: sanitizedDescription,
        use_cases: sanitizedUseCases,
        rating: rating,
        example_explanations: sanitizedExampleExplanations,
        example_image_urls: imageUrls.length > 0 ? imageUrls : null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
    }

    return NextResponse.json({ tool: data[0] });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
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

  // Get tool to delete associated images
  let query = supabaseServer.from('tools').select('example_image_urls');
  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('name', name);
  }
  
  const { data: toolData } = await query.single();

  // Delete associated images from storage
  if (toolData?.example_image_urls && toolData.example_image_urls.length > 0) {
    for (const url of toolData.example_image_urls) {
      try {
        const fileName = url.split('/tool-examples/')[1];
        if (fileName) {
          await supabaseServer.storage
            .from('tool-examples')
            .remove([`tool-examples/${fileName}`]);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  }

  // Delete tool
  let deleteQuery = supabaseServer.from('tools').delete();
  
  if (id) {
    deleteQuery = deleteQuery.eq('id', id);
  } else {
    deleteQuery = deleteQuery.eq('name', name);
  }

  const { error } = await deleteQuery;

  if (error) {
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
