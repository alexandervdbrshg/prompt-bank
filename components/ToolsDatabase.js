'use client'

import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit2, ChevronDown, ChevronUp, Star, Upload, Image as ImageIcon } from 'lucide-react';

const TAGS = ['Video', 'Photo', 'Text', 'Other'];

export default function ToolsDatabase({ onNavigate, onLogout }) {
  const [tools, setTools] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [expandedTool, setExpandedTool] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    tag: 'Other',
    description: '',
    use_cases: '',
    rating: 0,
    example_images: [],
    example_explanations: '',
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.example_images.length + files.length > 5) {
      alert('Maximum 5 example images allowed');
      return;
    }
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size: 10MB`);
        return;
      }
    }
    
    setFormData({
      ...formData,
      example_images: [...formData.example_images, ...files]
    });
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      example_images: formData.example_images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Tool name is required');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('model', formData.model);
      submitData.append('tag', formData.tag);
      submitData.append('description', formData.description);
      submitData.append('use_cases', formData.use_cases);
      submitData.append('rating', formData.rating);
      submitData.append('example_explanations', formData.example_explanations);
      
      formData.example_images.forEach(file => {
        submitData.append('example_images', file);
      });

      const endpoint = editingTool ? `/api/tools?id=${editingTool.id}` : '/api/tools';
      const method = editingTool ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        body: submitData,
      });

      if (response.ok) {
        const data = await response.json();
        if (editingTool) {
          setTools(tools.map(t => t.id === editingTool.id ? data.tool : t));
        } else {
          setTools([data.tool, ...tools]);
        }
        setShowAddForm(false);
        setEditingTool(null);
        setFormData({ 
          name: '', 
          model: '', 
          tag: 'Other', 
          description: '', 
          use_cases: '',
          rating: 0,
          example_images: [],
          example_explanations: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save tool');
      }
    } catch (error) {
      alert('Error saving tool. Please try again.');
    }
  };

  const handleEdit = (tool) => {
    setFormData({
      name: tool.name,
      model: tool.model || '',
      tag: tool.tag || 'Other',
      description: tool.description || '',
      use_cases: tool.use_cases || '',
      rating: tool.rating || 0,
      example_images: [],
      example_explanations: tool.example_explanations || '',
    });
    setEditingTool(tool);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
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
              setShowAddForm(true);
              setEditingTool(null);
              setFormData({ 
                name: '', 
                model: '', 
                tag: 'Other', 
                description: '', 
                use_cases: '',
                rating: 0,
                example_images: [],
                example_explanations: '',
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
                      onClick={() => handleEdit(tool)} 
                      className="text-custom-white/40 hover:text-custom-white transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(tool.id)} 
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
                      {/* Left Column */}
                      <div className="space-y-6">
                        {tool.description && (
                          <div>
                            <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">Description</h3>
                            <p className="text-custom-white/80 text-sm leading-relaxed font-light whitespace-pre-wrap">
                              {tool.description}
                            </p>
                          </div>
                        )}

                        {tool.use_cases && (
                          <div>
                            <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">Use Cases</h3>
                            <p className="text-custom-white/80 text-sm leading-relaxed font-light whitespace-pre-wrap">
                              {tool.use_cases}
                            </p>
                          </div>
                        )}

                        {tool.example_explanations && (
                          <div>
                            <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">Example Explanations</h3>
                            <p className="text-custom-white/80 text-sm leading-relaxed font-light whitespace-pre-wrap">
                              {tool.example_explanations}
                            </p>
                          </div>
                        )}

                        {/* Example Images */}
                        {tool.example_image_urls && tool.example_image_urls.length > 0 && (
                          <div>
                            <h3 className="text-xs font-light text-custom-white/40 mb-3 uppercase tracking-wide">Example Images</h3>
                            <div className="grid grid-cols-2 gap-3">
                              {tool.example_image_urls.map((url, i) => (
                                <div key={i} className="aspect-video bg-black border border-custom-white/10 overflow-hidden">
                                  <img src={url} alt={`Example ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-black border border-custom-white/20 w-full max-w-4xl">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-custom-white/10">
                  <h2 className="text-2xl md:text-3xl font-kurdis tracking-wide">
                    {editingTool ? 'EDIT TOOL' : 'ADD NEW TOOL'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingTool(null);
                      setFormData({ 
                        name: '', 
                        model: '', 
                        tag: 'Other', 
                        description: '', 
                        use_cases: '',
                        rating: 0,
                        example_images: [],
                        example_explanations: '',
                      });
                    }} 
                    className="text-custom-white/40 hover:text-custom-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                        Tool Name *
                      </label>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
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
                        value={formData.model} 
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })} 
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
                        value={formData.tag} 
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })} 
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
                            onClick={() => setFormData({ ...formData, rating })}
                            className="flex-1 px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white hover:bg-white/10 transition font-light"
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
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder="What does this tool do? What are its main features?" 
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition resize-none font-light" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Use Cases
                    </label>
                    <textarea 
                      value={formData.use_cases} 
                      onChange={(e) => setFormData({ ...formData, use_cases: e.target.value })} 
                      placeholder="When should you use this tool? What problems does it solve best?" 
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition resize-none font-light" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Example Explanations
                    </label>
                    <textarea 
                      value={formData.example_explanations} 
                      onChange={(e) => setFormData({ ...formData, example_explanations: e.target.value })} 
                      placeholder="Explain the examples you're uploading - what do they demonstrate?" 
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/30 transition resize-none font-light" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">
                      Example Images (Max 5)
                    </label>
                    <div className="space-y-3">
                      <label className="block w-full px-4 py-8 bg-white/5 border-2 border-dashed border-custom-white/20 text-custom-white/40 hover:border-custom-white/40 transition cursor-pointer text-center">
                        <Upload className="mx-auto mb-2" size={24} />
                        <span className="text-sm font-light">Click to upload example images</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>

                      {formData.example_images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {formData.example_images.map((file, i) => (
                            <div key={i} className="relative group">
                              <div className="aspect-video bg-black border border-custom-white/10 overflow-hidden">
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt={`Example ${i + 1}`} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="absolute top-2 right-2 bg-black/80 p-1 text-custom-white/60 hover:text-custom-white transition"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                        setShowAddForm(false);
                        setEditingTool(null);
                        setFormData({ 
                          name: '', 
                          model: '', 
                          tag: 'Other', 
                          description: '', 
                          use_cases: '',
                          rating: 0,
                          example_images: [],
                          example_explanations: '',
                        });
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

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-black border border-custom-white/20 w-full max-w-md p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-kurdis tracking-wide mb-4">DELETE TOOL?</h3>
              <p className="text-custom-white/60 mb-6 font-light">
                Are you sure you want to delete this tool? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirm)} 
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
