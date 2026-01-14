'use client'

import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Tag, Filter, Upload, FileText, Video, Lock } from 'lucide-react';

const PREDEFINED_TAGS = ['Photo', 'Video', 'Text', 'Other'];

export default function PromptBank() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [tools, setTools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showToolManager, setShowToolManager] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [formData, setFormData] = useState({
    prompt: '',
    tool: '',
    resultText: '',
    resultFiles: [],
    notes: '',
    tags: ''
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadData();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
        loadData();
      } else {
        setPasswordError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setPasswordError('Connection error. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setPassword('');
      setPrompts([]);
      setTools([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    try {
      const [toolsRes, promptsRes] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/prompts')
      ]);
      
      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        setTools(toolsData.tools.map(t => t.name));
      }
      
      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        setPrompts(promptsData.prompts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 files
    if (formData.resultFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    
    // Check file sizes
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size: 10MB`);
        return;
      }
    }
    
    setFormData({
      ...formData,
      resultFiles: [...formData.resultFiles, ...files]
    });
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      resultFiles: formData.resultFiles.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!formData.prompt || !formData.tool) {
      alert('Please fill in prompt and tool');
      return;
    }
    
    if (!formData.resultText && formData.resultFiles.length === 0) {
      alert('Please provide at least one result (text or file)');
      return;
    }
    
    setUploading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('prompt', formData.prompt);
      formDataToSend.append('tool', formData.tool);
      formDataToSend.append('resultText', formData.resultText);
      formDataToSend.append('notes', formData.notes);
      formDataToSend.append('tags', formData.tags);
      
      formData.resultFiles.forEach(file => {
        formDataToSend.append('files', file);
      });
      
      const response = await fetch('/api/prompts', {
        method: 'POST',
        body: formDataToSend,
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrompts([data.prompt, ...prompts]);
        setFormData({ prompt: '', tool: '', resultText: '', resultFiles: [], notes: '', tags: '' });
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save prompt');
      }
    } catch (error) {
      alert('Error saving prompt. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deletePrompt = async (id) => {
    try {
      const response = await fetch(`/api/prompts?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setPrompts(prompts.filter(p => p.id !== id));
      } else {
        alert('Failed to delete prompt');
      }
    } catch (error) {
      alert('Error deleting prompt');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const addTool = async () => {
    if (!newToolName.trim()) return;
    
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newToolName.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTools([...tools, data.tool.name].sort());
        setNewToolName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add tool');
      }
    } catch (error) {
      alert('Error adding tool');
    }
  };

  const deleteTool = async (toolName) => {
    try {
      const response = await fetch(`/api/tools?name=${encodeURIComponent(toolName)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setTools(tools.filter(t => t !== toolName));
      } else {
        alert('Failed to delete tool');
      }
    } catch (error) {
      alert('Error deleting tool');
    }
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = !searchTerm || 
      p.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.tool.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.result_text && p.result_text.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesTool = filterTool === 'all' || p.tool === filterTool;
    const matchesTag = filterTag === 'all' || (p.tags && p.tags.includes(filterTag));
    
    return matchesSearch && matchesTool && matchesTag;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Lock className="mx-auto mb-4 text-white/60" size={48} />
            <h1 className="text-3xl font-light mb-2">Prompt Bank</h1>
            <p className="text-white/60 font-light">Enter password to access</p>
          </div>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => { 
                setPassword(e.target.value); 
                setPasswordError(''); 
              }} 
              placeholder="Password" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition mb-4" 
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm mb-4">{passwordError}</p>
            )}
            <button 
              type="submit"
              className="w-full px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60 text-lg font-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 md:mb-12 border-b border-white/10 pb-6 md:pb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-2 md:mb-3">Prompt Bank</h1>
              <p className="text-white/60 text-base md:text-lg font-light">Curated collection of high-performance prompts</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 text-white/60 hover:text-white transition text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 md:mb-8 flex flex-col gap-3 md:gap-4">
          <div className="w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input 
              type="text" 
              placeholder="Search prompts, tools, tags..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition" 
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <select 
                value={filterTool} 
                onChange={(e) => setFilterTool(e.target.value)} 
                className="w-full pl-12 pr-8 py-3 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30 appearance-none transition"
              >
                <option value="all">All Tools</option>
                {tools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </div>
            
            <div className="relative flex-1 sm:flex-initial">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <select 
                value={filterTag} 
                onChange={(e) => setFilterTag(e.target.value)} 
                className="w-full pl-12 pr-8 py-3 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30 appearance-none transition"
              >
                <option value="all">All Tags</option>
                {PREDEFINED_TAGS.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={() => setShowToolManager(true)} 
              className="w-full sm:w-auto px-4 py-3 border border-white/10 rounded-none hover:bg-white/5 transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Manage Tools
            </button>
            
            <button 
              onClick={() => setShowForm(true)} 
              className="w-full sm:w-auto px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition flex items-center justify-center gap-2 font-medium whitespace-nowrap"
            >
              <Plus size={20} />
              Add Prompt
            </button>
          </div>
        </div>

        {viewingMedia && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingMedia(null)}>
            <button 
              onClick={() => setViewingMedia(null)} 
              className="absolute top-4 right-4 text-white/60 hover:text-white transition z-10"
            >
              <X size={32} />
            </button>
            <div className="w-[90vw] h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {viewingMedia.includes('.mp4') || viewingMedia.includes('.webm') || viewingMedia.includes('.mov') ? (
                <video src={viewingMedia} controls autoPlay className="max-w-full max-h-full object-contain" />
              ) : (
                <img src={viewingMedia} alt="Full size" className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        )}

        {showToolManager && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-md">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/10">
                  <h2 className="text-2xl md:text-3xl font-light">Manage Tools</h2>
                  <button 
                    onClick={() => setShowToolManager(false)} 
                    className="text-white/60 hover:text-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                      Add New Tool
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newToolName} 
                        onChange={(e) => setNewToolName(e.target.value)} 
                        onKeyPress={(e) => e.key === 'Enter' && addTool()} 
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition" 
                        placeholder="Tool name..." 
                        maxLength={100}
                      />
                      <button 
                        onClick={addTool} 
                        className="px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition font-medium whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-3 uppercase tracking-wide">
                      Current Tools
                    </label>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {tools.length === 0 ? (
                        <p className="text-white/40 text-sm font-light">No tools yet. Add one above.</p>
                      ) : (
                        tools.map((tool, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                            <span className="text-white/90 font-light break-all">{tool}</span>
                            <button 
                              onClick={() => deleteTool(tool)} 
                              className="text-white/40 hover:text-white transition ml-2 flex-shrink-0"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowToolManager(false)} 
                    className="w-full px-6 py-3 border border-white/10 rounded-none hover:bg-white/5 transition font-light"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-light mb-4">Delete Prompt?</h2>
              <p className="text-white/60 mb-6 md:mb-8 font-light">
                Are you sure you want to delete this prompt? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => deletePrompt(deleteConfirm)} 
                  className="flex-1 px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition font-medium"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="flex-1 px-6 py-3 border border-white/10 rounded-none hover:bg-white/5 transition font-light"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/10">
                  <h2 className="text-2xl md:text-3xl font-light">New Prompt</h2>
                  <button 
                    onClick={() => setShowForm(false)} 
                    className="text-white/60 hover:text-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                      Prompt *
                    </label>
                    <textarea 
                      value={formData.prompt} 
                      onChange={(e) => setFormData({...formData, prompt: e.target.value})} 
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition" 
                      rows={4} 
                      placeholder="Enter the prompt text..." 
                      maxLength={5000}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                        Tool/Model *
                      </label>
                      <select 
                        value={formData.tool} 
                        onChange={(e) => setFormData({...formData, tool: e.target.value})} 
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30 transition appearance-none"
                      >
                        <option value="">Select a tool...</option>
                        {tools.map(tool => (
                          <option key={tool} value={tool}>{tool}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                        Tags
                      </label>
                      <select 
                        value={formData.tags} 
                        onChange={(e) => setFormData({...formData, tags: e.target.value})} 
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white focus:outline-none focus:border-white/30 transition appearance-none"
                      >
                        <option value="">Select a tag...</option>
                        {PREDEFINED_TAGS.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                      Result Text
                    </label>
                    <textarea 
                      value={formData.resultText} 
                      onChange={(e) => setFormData({...formData, resultText: e.target.value})} 
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition" 
                      rows={4} 
                      placeholder="Describe the outcome..." 
                      maxLength={10000}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-3 uppercase tracking-wide">
                      Result Files (Max 5 files, 10MB each)
                    </label>
                    <div className="border-2 border-dashed border-white/10 p-6 md:p-8 text-center hover:border-white/30 transition">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,video/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        id="file-upload" 
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-3 text-white/40" size={32} />
                        <p className="text-sm text-white/60 font-light">Upload images or videos</p>
                        <p className="text-xs text-white/40 mt-2">JPG, PNG, GIF, WebP, MP4, WebM, MOV</p>
                      </label>
                    </div>
                    
                    {formData.resultFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.resultFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                            {file.type.startsWith('image/') && <FileText size={18} className="text-white/60 flex-shrink-0" />}
                            {file.type.startsWith('video/') && <Video size={18} className="text-white/60 flex-shrink-0" />}
                            <span className="text-sm text-white/80 flex-1 font-light break-all">{file.name}</span>
                            <button 
                              onClick={() => removeFile(index)} 
                              className="text-white/40 hover:text-white transition flex-shrink-0"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-white/60 mb-2 uppercase tracking-wide">
                      Notes
                    </label>
                    <textarea 
                      value={formData.notes} 
                      onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition" 
                      rows={3} 
                      placeholder="Additional context, tips, observations..." 
                      maxLength={5000}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-6">
                    <button 
                      onClick={handleSubmit} 
                      disabled={uploading} 
                      className="flex-1 px-6 py-3 bg-white text-black rounded-none hover:bg-white/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Save Prompt'}
                    </button>
                    <button 
                      onClick={() => setShowForm(false)} 
                      disabled={uploading} 
                      className="px-6 py-3 border border-white/10 rounded-none hover:bg-white/5 transition font-light disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredPrompts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-base md:text-lg font-light">
              {prompts.length === 0 ? 'No prompts yet. Create your first entry.' : 'No prompts match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPrompts.map(prompt => (
              <div key={prompt.id} className="bg-white/5 border border-white/10 p-4 md:p-6 hover:border-white/20 transition group relative flex flex-col">
                <button 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setDeleteConfirm(prompt.id); 
                  }} 
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition opacity-100 z-10"
                >
                  <X size={18} />
                </button>
                
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-white text-black text-xs font-medium uppercase tracking-wide">
                    {prompt.tool}
                  </span>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-xs font-light text-white/40 mb-2 uppercase tracking-wide">Prompt</h3>
                  <p className="text-white/90 text-sm leading-relaxed line-clamp-3 font-light break-words">
                    {prompt.prompt}
                  </p>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-xs font-light text-white/40 mb