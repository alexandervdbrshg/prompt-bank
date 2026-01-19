'use client'

import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit2, Save } from 'lucide-react';

export default function ToolsDatabase({ onNavigate, onLogout }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    use_cases: '',
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools);
      }
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Tool name is required');
      return;
    }

    try {
      const endpoint = editingTool ? `/api/tools?id=${editingTool.id}` : '/api/tools';
      const method = editingTool ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        setFormData({ name: '', description: '', use_cases: '' });
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
      description: tool.description || '',
      use_cases: tool.use_cases || '',
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

  const filteredTools = tools.filter(tool =>
    !searchTerm ||
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tool.use_cases && tool.use_cases.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-custom-white flex items-center justify-center">
        <p className="text-custom-white/60 text-lg font-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-custom-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
              placeholder="Search tools, descriptions, use cases..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-custom-white/10 text-custom-white placeholder-custom-white/40 focus:outline-none focus:border-custom-white/30 transition" 
            />
          </div>
          
          <button 
            onClick={() => {
              setShowAddForm(true);
              setEditingTool(null);
              setFormData({ name: '', description: '', use_cases: '' });
            }} 
            className="px-6 py-3 bg-custom-white text-black hover:bg-custom-white/90 transition flex items-center justify-center gap-2 font-medium whitespace-nowrap"
          >
            <Plus size={20} />
            Add Tool
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto pt-8 pb-8">
            <div className="bg-black border border-custom-white/20 w-full max-w-2xl">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-custom-white/10">
                  <h2 className="text-2xl md:text-3xl font-kurdis tracking-wide">
                    {editingTool ? 'EDIT TOOL' : 'ADD NEW TOOL'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingTool(null);
                      setFormData({ name: '', description: '', use_cases: '' });
                    }} 
                    className="text-custom-white/40 hover:text-custom-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
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
                      Best Use Cases
                    </label>
                    <textarea 
                      value={formData.use_cases} 
                      onChange={(e) => setFormData({ ...formData, use_cases: e.target.value })} 
                      placeholder="When should you use this tool? What problems does it solve best?" 
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
                        setShowAddForm(false);
                        setEditingTool(null);
                        setFormData({ name: '', description: '', use_cases: '' });
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

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-custom-white/40 text-base md:text-lg font-light">
              {tools.length === 0 ? 'No tools yet. Add your first tool to get started.' : 'No tools match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map(tool => (
              <div 
                key={tool.id} 
                className="bg-white/5 border border-custom-white/10 p-6 hover:border-custom-white/20 transition group relative flex flex-col"
              >
                <div className="absolute top-4 right-4 flex gap-2 opacity-100">
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
                
                <div className="mb-4">
                  <h3 className="text-xl md:text-2xl font-kurdis tracking-wide text-custom-white pr-16">
                    {tool.name}
                  </h3>
                </div>
                
                {tool.description && (
                  <div className="mb-4 flex-1">
                    <h4 className="text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">Description</h4>
                    <p className="text-custom-white/80 text-sm leading-relaxed font-light break-words whitespace-pre-wrap">
                      {tool.description}
                    </p>
                  </div>
                )}
                
                {tool.use_cases && (
                  <div className="mb-4">
                    <h4 className="text-xs font-light text-custom-white/40 mb-2 uppercase tracking-wide">Best Use Cases</h4>
                    <p className="text-custom-white/60 text-sm leading-relaxed font-light break-words whitespace-pre-wrap">
                      {tool.use_cases}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-custom-white/10 mt-auto">
                  <p className="text-xs text-custom-white/40 font-light">
                    {tool.created_at ? new Date(tool.created_at).toLocaleDateString() : 'Recently added'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
