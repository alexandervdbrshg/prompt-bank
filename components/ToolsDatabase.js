'use client'

import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit2, ChevronDown, ChevronUp, Star, Upload, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const TAGS = ['Video', 'Photo', 'Text', 'Other'];

// Initialize Supabase client for direct uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ToolsDatabase({ onNavigate, onLogout }) {
  const [tools, setTools] = useState([]);
  const [useCases, setUseCases] = useState({}); // { toolId: [useCases] }
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [expandedTool, setExpandedTool] = useState(null);
  const [showAddToolForm, setShowAddToolForm] = useState(false);
  const [showAddUseCaseForm, setShowAddUseCaseForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [editingUseCase, setEditingUseCase] = useState(null);
  const [currentToolForUseCase, setCurrentToolForUseCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [toolFormData, setToolFormData] = useState({
    name: '',
    model: '',
    tag: 'Other',
    description: '',
    rating: 0,
  });

  const [useCaseFormData, setUseCaseFormData] = useState({
    title: '',
    explanation: '',
    example_images: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [toolsRes, promptsRes] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/prompts')
      ]);
      
      if (toolsRes.ok) {
        const data = await toolsRes.json();
        setTools(data.tools);
        
        // Load use cases for each tool
        for (const tool of data.tools) {
          loadUseCases(tool.id);
        }
      }
      
      if (promptsRes.ok) {
        const data = await promptsRes.json();
        setPrompts(data.prompts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUseCases = async (toolId) => {
    try {
      const response = await fetch(`/api/use-cases?tool_id=${toolId}`);
      if (response.ok) {
        const data = await response.json();
        setUseCases(prev => ({ ...prev, [toolId]: data.use_cases }));
      }
    } catch (error) {
      console.error('Error loading use cases:', error);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (useCaseFormData.example_images.length + files.length > 5) {
      alert('Maximum 5 example images allowed');
      return;
    }
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size: 10MB`);
        return;
      }
    }
    
    setUseCaseFormData({
      ...useCaseFormData,
      example_images: [...useCaseFormData.example_images, ...files]
    });
  };

  const removeFile = (index) => {
    setUseCaseFormData({
      ...useCaseFormData,
      example_images: useCaseFormData.example_images.filter((_, i) => i !== index)
    });
  };

  const uploadImagesToSupabase = async (files) => {
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('tool-examples')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('tool-examples')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }
    
    return uploadedUrls;
  };

  const handleToolSubmit = async (e) => {
    e.preventDefault();
    
    if (!toolFormData.name.trim()) {
      alert('Tool name is required');
      return;
    }

    try {
      const endpoint = editingTool ? `/api/tools?id=${editingTool.id}` : '/api/tools';
      const method = editingTool ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolFormData),
      });

      if (response.ok) {
        const data = await response.json();
        if (editingTool) {
          setTools(tools.map(t => t.id === editingTool.id ? data.tool : t));
        } else {
          setTools([data.tool, ...tools]);
        }
        setShowAddToolForm(false);
        setEditingTool(null);
        setToolFormData({ 
          name: '', 
          model: '', 
          tag: 'Other', 
          description: '', 
          rating: 0,
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save tool');
      }
    } catch (error) {
      console.error('Error saving tool:', error);
      alert('Error saving tool. Please try again.');
    }
  };

  const handleUseCaseSubmit = async (e) => {
    e.preventDefault();
    
    if (!useCaseFormData.title.trim()) {
      alert('Use case title is required');
      return;
    }

    setUploading(true);

    try {
      // Upload images directly to Supabase first
      let imageUrls = [];
      if (useCaseFormData.example_images.length > 0) {
        imageUrls = await uploadImagesToSupabase(useCaseFormData.example_images);
      }

      // If editing, merge with existing images
      if (editingUseCase && editingUseCase.example_image_urls) {
        imageUrls = [...editingUseCase.example_image_urls, ...imageUrls];
      }

      const endpoint = editingUseCase 
        ? `/api/use-cases?id=${editingUseCase.id}` 
        : '/api/use-cases';
      const method = editingUseCase ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: currentToolForUseCase,
          title: useCaseFormData.title,
          explanation: useCaseFormData.explanation,
          example_image_urls: imageUrls
        }),
      });

      if (response.ok) {
        // Reload use cases for this tool
        await loadUseCases(currentToolForUseCase);
        setShowAddUseCaseForm(false);
        setEditingUseCase(null);
        setUseCaseFormData({ 
          title: '', 
          explanation: '', 
          example_images: [],
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save use case');
      }
    } catch (error) {
      console.error('Error saving use case:', error);
      alert(error.message || 'Error saving use case. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditTool = (tool) => {
    setToolFormData({
      name: tool.name,
      model: tool.model || '',
      tag: tool.tag || 'Other',
      description: tool.description || '',
      rating: tool.rating || 0,
    });
    setEditingTool(tool);
    setShowAddToolForm(true);
  };

  const handleEditUseCase = (useCase, toolId) => {
    setUseCaseFormData({
      title: useCase.title,
      explanation: useCase.explanation || '',
      example_images: [],
    });
    setEditingUseCase(useCase);
    setCurrentToolForUseCase(toolId);
    setShowAddUseCaseForm(true);
  };

  const handleDeleteTool = async (id) => {
    try {
      const response = await fetch(`/api/tools?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTools(tools.filter(t => t.id !== id));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete tool');
      }
    } catch (error) {
      alert('Error deleting tool');
    }
  };

  const handleDeleteUseCase = async (id, toolId) => {
    try {
      const response = await fetch(`/api/use-cases?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadUseCases(toolId);
      } else {
        alert('Failed to delete use case');
      }
    } catch (error) {
      alert('Error deleting use case');
    }
  };

  const getSuggestedPrompts = (toolName) => {
    return prompts.filter(p => 
      p.tool && p.tool.toLowerCase() === toolName.toLowerCase()
    ).slice(0, 4);
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = !searchTerm || 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.model && tool.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = filterTag === 'all' || tool.tag === filterTag;
    
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-custom-white flex items-center justify-center">
        <p className="text-custom-white/60 text-lg font-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-custom-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 md:mb-12 border-b border-custom-white/10 pb-6 md:pb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-kurdis tracking-wider mb-2 md:mb-3">AI TOOLS GUIDE</h1>
              <p className="text-custom-white/60 text-base md:text-lg font-light">SporthouseGroup's approved AI toolkit</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('prompts')} 
                className="px-4 py-2 text-custom-white/60 hover:text-custom-white transition text-sm whitespace-nowrap"
              >
                Prompt Library
              </button>
              <button 
                onClick={() => onNavigate(null)} 
                className="px-4 py-2 text-custom-white/60 hover:text-custom-white transition text-sm whitespace-nowrap"
              >
                Home
              </button>
              <button 
                onClick={onLogout} 
                className="px-4 py-2 text-custom-white/60 hover:text-custom-white transition text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-custom-white/40" size={20} />
            <input 
              type="text" 
              placeholder="Search tools..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/40 focus:outline-none focus:border-custom-white/30 transition" 
            />
          </div>

          <select 
            value={filterTag} 
            onChange={(e) => setFilterTag(e.target.value)} 
            className="px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white focus:outline-none focus:border-custom-white/30 appearance-none transition"
          >
            <option value="all">All Tags</option>
            {TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          
          <button 
            onClick={() => {
              setShowAddToolForm(true);
              setEditingTool(null);
              setToolFormData({ 
                name: '', 
                model: '', 
                tag: 'Other', 
                description: '', 
                rating: 0,
              });
            }} 
            className="px-6 py-3 bg-custom-white text-black hover:bg-custom-white/90 transition flex items-center justify-center gap-2 font-medium whitespace-nowrap"
          >
            <Plus size={20} />
            Add Tool
          </button>
        </div>

        {/* Spreadsheet-like Table */}
        <div className="border border-custom-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 bg-white/5 border-b border-custom-white/10 px-6 py-4">
            <div className="col-span-1"></div>
            <div className="col-span-3 text-xs font-light text-custom-white/40 uppercase tracking-wide">Tool Name</div>
            <div className="col-span-2 text-xs font-light text-custom-white/40 uppercase tracking-wide">Model</div>
            <div className="col-span-2 text-xs font-light text-custom-white/40 uppercase tracking-wide">Tag</div>
            <div className="col-span-2 text-xs font-light text-custom-white/40 uppercase tracking-wide">Rating</div>
            <div className="col-span-2 text-xs font-light text-custom-white/40 uppercase tracking-wide">Actions</div>
          </div>

          {/* Rows */}
          {filteredTools.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="text-custom-white/40 text-base font-light">
                {tools.length === 0 ? 'No tools yet. Add your first tool to get started.' : 'No tools match your search.'}
              </p>
            </div>
          ) : (
            filteredTools.map(tool => (
              <div key={tool.id}>
                {/* Main Row */}
                <div 
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-custom-white/10 hover:bg-white/[0.02] transition cursor-pointer"
                  onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                >
                  <div className="col-span-1 flex items-center">
                    {expandedTool === tool.id ? (
                      <ChevronUp size={20} className="text-custom-white/60" />
                    ) : (
                      <ChevronDown size={20} className="text-custom-white/60" />
                    )}
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-custom-white font-light">{tool.name}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-custom-white/60 text-sm font-light">{tool.model || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="inline-block px-2 py-1 bg-white/5 border border-custom-white/10 text-custom-white/60 text-xs font-light">
                      {tool.tag || 'Other'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={i < (tool.rating || 0) ? 'fill-custom-white text-custom-white' : 'text-custom-white/20'}
                      />
                    ))}
                  </div>
                  <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleEditTool(tool)} 
                      className="text-custom-white/40 hover:text-custom-white transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ type: 'tool', id: tool.id })} 
                      className="text-custom-white/40 hover:text-custom-white transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTool === tool.id && (
                  <div className="bg-white/[0.02] border-b border-custom-white/10 px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Tool Info */}
                      <div className="space-y-6">
                        {tool.description && (
                          <div>
                            <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">Description</h3>
                            <p className="text-custom-white/80 text-sm leading-relaxed font-light whitespace-pre-wrap">
                              {tool.description}
                            </p>
                          </div>
                        )}

                        {/* Use Cases Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-light text-custom-white/40 uppercase tracking-wide">Use Cases</h3>
                            <button
                              onClick={() => {
                                setCurrentToolForUseCase(tool.id);
                                setEditingUseCase(null);
                                setUseCaseFormData({ title: '', explanation: '', example_images: [] });
                                setShowAddUseCaseForm(true);
                              }}
                              className="text-xs text-custom-white/60 hover:text-custom-white transition flex items-center gap-1"
                            >
                              <Plus size={14} />
                              Add Use Case
                            </button>
                          </div>

                          {(!useCases[tool.id] || useCases[tool.id].length === 0) ? (
                            <p className="text-custom-white/40 text-sm font-light italic">
                              No use cases yet. Click "Add Use Case" to create one.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {useCases[tool.id].map(useCase => (
                                <div 
                                  key={useCase.id}
                                  className="bg-white/5 border border-custom-white/10 p-4"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-custom-white font-light">{useCase.title}</h4>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditUseCase(useCase, tool.id)}
                                        className="text-custom-white/40 hover:text-custom-white transition"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirm({ type: 'useCase', id: useCase.id, toolId: tool.id })}
                                        className="text-custom-white/40 hover:text-custom-white transition"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {useCase.explanation && (
                                    <p className="text-custom-white/60 text-sm font-light mb-3 whitespace-pre-wrap">
                                      {useCase.explanation}
                                    </p>
                                  )}

                                  {useCase.example_image_urls && useCase.example_image_urls.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {useCase.example_image_urls.map((url, i) => (
                                        <div key={i} className="aspect-video bg-black border border-custom-white/10 overflow-hidden">
                                          <img src={url} alt={`Example ${i + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Suggested Prompts */}
                      <div>
                        <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">
                          Suggested Examples from Prompt Library
                        </h3>
                        {getSuggestedPrompts(tool.name).length === 0 ? (
                          <p className="text-custom-white/40 text-sm font-light italic">
                            No prompts using this tool yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {getSuggestedPrompts(tool.name).map(prompt => (
                              <div 
                                key={prompt.id}
                                className="bg-white/5 border border-custom-white/10 p-4 hover:border-custom-white/20 transition cursor-pointer"
                                onClick={() => onNavigate('prompts')}
                              >
                                <p className="text-custom-white/80 text-sm font-light line-clamp-2 mb-2">
                                  {prompt.prompt}
                                </p>
                                {prompt.result_file_urls && prompt.result_file_urls.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {prompt.result_file_urls.slice(0, 2).map((url, i) => (
                                      <div key={i} className="w-16 h-16 bg-black border border-custom-white/10 overflow-hidden">
                                        {url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') ? (
                                          <video src={url} className="w-full h-full object-cover" />
                                        ) : (
                                          <img src={url} alt="Result" className="w-full h-full object-cover" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Tool Form Modal */}
        {showAddToolForm && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-black border border-custom-white/20 w-full max-w-2xl">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-custom-white/10">
                  <h2 className="text-2xl md:text-3xl font-kurdis tracking-wide">
                    {editingTool ? 'EDIT TOOL' : 'ADD NEW TOOL'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowAddToolForm(false);
                      setEditingTool(null);
                    }} 
                    className="text-custom-white/40 hover:text-custom-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleToolSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                        Tool Name *
                      </label>
                      <input 
                        type="text" 
                        value={toolFormData.name} 
                        onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })} 
                        placeholder="e.g., ChatGPT, Midjourney, Claude" 
                        className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition font-light" 
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                        Model (Optional)
                      </label>
                      <input 
                        type="text" 
                        value={toolFormData.model} 
                        onChange={(e) => setToolFormData({ ...toolFormData, model: e.target.value })} 
                        placeholder="e.g., GPT-4, Claude 3.5 Sonnet" 
                        className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition font-light" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                        Tag
                      </label>
                      <select 
                        value={toolFormData.tag} 
                        onChange={(e) => setToolFormData({ ...toolFormData, tag: e.target.value })} 
                        className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white focus:outline-none focus:border-custom-white/30 appearance-none transition font-light"
                      >
                        {TAGS.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                        Rating (0-5)
                      </label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setToolFormData({ ...toolFormData, rating })}
                            className={`flex-1 px-4 py-3 border transition font-light ${
                              toolFormData.rating === rating 
                                ? 'bg-custom-white text-black border-custom-white' 
                                : 'bg-white/5 border-custom-white/10 text-custom-white hover:bg-white/10'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Description
                    </label>
                    <textarea 
                      value={toolFormData.description} 
                      onChange={(e) => setToolFormData({ ...toolFormData, description: e.target.value })} 
                      placeholder="What does this tool do? What are its main features?" 
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition resize-none font-light" 
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="submit" 
                      className="flex-1 px-6 py-3 bg-custom-white text-black hover:bg-custom-white/90 transition font-medium uppercase tracking-wide"
                    >
                      {editingTool ? 'Update Tool' : 'Add Tool'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddToolForm(false);
                        setEditingTool(null);
                      }} 
                      className="flex-1 px-6 py-3 border border-custom-white/20 text-custom-white hover:bg-white/5 transition font-light uppercase tracking-wide"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Use Case Form Modal */}
        {showAddUseCaseForm && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-black border border-custom-white/20 w-full max-w-3xl">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-custom-white/10">
                  <h2 className="text-2xl md:text-3xl font-kurdis tracking-wide">
                    {editingUseCase ? 'EDIT USE CASE' : 'ADD USE CASE'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowAddUseCaseForm(false);
                      setEditingUseCase(null);
                    }} 
                    className="text-custom-white/40 hover:text-custom-white transition"
                    disabled={uploading}
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleUseCaseSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Title *
                    </label>
                    <input 
                      type="text" 
                      value={useCaseFormData.title} 
                      onChange={(e) => setUseCaseFormData({ ...useCaseFormData, title: e.target.value })} 
                      placeholder="e.g., Sport Vlaanderen Text, Championship Visuals" 
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition font-light" 
                      required
                      disabled={uploading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Explanation
                    </label>
                    <textarea 
                      value={useCaseFormData.explanation} 
                      onChange={(e) => setUseCaseFormData({ ...useCaseFormData, explanation: e.target.value })} 
                      placeholder="Explain what this use case demonstrates..." 
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition resize-none font-light" 
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Example Images (Max 5, up to 10MB each)
                    </label>
                    <div className="space-y-3">
                      <label className={`block w-full px-4 py-8 bg-white/5 border-2 border-dashed border-custom-white/20 text-custom-white/40 transition text-center ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-custom-white/40 cursor-pointer'}`}>
                        <Upload className="mx-auto mb-2" size={24} />
                        <span className="text-sm font-light">
                          {uploading ? 'Uploading...' : 'Click to upload example images'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleFileUpload} 
                          className="hidden" 
                          disabled={uploading}
                        />
                      </label>

                      {editingUseCase && editingUseCase.example_image_urls && editingUseCase.example_image_urls.length > 0 && (
                        <div>
                          <p className="text-xs text-custom-white/40 mb-2">Existing Images:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {editingUseCase.example_image_urls.map((url, i) => (
                              <div key={i} className="aspect-video bg-black border border-custom-white/10 overflow-hidden">
                                <img 
                                  src={url} 
                                  alt={`Existing ${i + 1}`} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {useCaseFormData.example_images.length > 0 && (
                        <div>
                          <p className="text-xs text-custom-white/40 mb-2">New Images to Upload:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {useCaseFormData.example_images.map((file, i) => (
                              <div key={i} className="relative group">
                                <div className="aspect-video bg-black border border-custom-white/10 overflow-hidden">
                                  <img 
                                    src={URL.createObjectURL(file)} 
                                    alt={`New ${i + 1}`} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(i)}
                                  className="absolute top-2 right-2 bg-black/80 p-1 text-custom-white/60 hover:text-custom-white transition"
                                  disabled={uploading}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="submit" 
                      className="flex-1 px-6 py-3 bg-custom-white text-black hover:bg-custom-white/90 transition font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : (editingUseCase ? 'Update Use Case' : 'Add Use Case')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddUseCaseForm(false);
                        setEditingUseCase(null);
                      }} 
                      className="flex-1 px-6 py-3 border border-custom-white/20 text-custom-white hover:bg-white/5 transition font-light uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-black border border-custom-white/20 w-full max-w-md p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-kurdis tracking-wide mb-4">
                {deleteConfirm.type === 'tool' ? 'DELETE TOOL?' : 'DELETE USE CASE?'}
              </h3>
              <p className="text-custom-white/60 mb-6 font-light">
                Are you sure you want to delete this {deleteConfirm.type === 'tool' ? 'tool' : 'use case'}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (deleteConfirm.type === 'tool') {
                      handleDeleteTool(deleteConfirm.id);
                    } else {
                      handleDeleteUseCase(deleteConfirm.id, deleteConfirm.toolId);
                      setDeleteConfirm(null);
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition font-medium uppercase tracking-wide"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="flex-1 px-6 py-3 border border-custom-white/20 text-custom-white hover:bg-white/5 transition font-light uppercase tracking-wide"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
