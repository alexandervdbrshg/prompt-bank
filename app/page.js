'use client'

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import PromptBank from '@/components/PromptBank';
import ToolsDatabase from '@/components/ToolsDatabase';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null); // null, 'prompts', or 'tools'

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
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
      setCurrentView(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-custom-white/40 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-custom-white font-kurdis text-4xl md:text-5xl mb-2 tracking-wider">
              SHG-AI
            </h1>
            <p className="text-custom-white/40 text-sm font-light">
              Everything AI.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="bg-white/5 border border-custom-white/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Lock size={20} className="text-custom-white/40" />
              <h2 className="text-custom-white text-lg font-light uppercase tracking-wide">
                Login Required
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-black border border-custom-white/20 text-custom-white placeholder-custom-white/30 focus:outline-none focus:border-custom-white/40 transition font-light"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-red-400 text-sm font-light">{passwordError}</p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full px-6 py-3 bg-custom-white text-black font-medium uppercase tracking-wide hover:bg-custom-white/90 transition"
              >
                Access
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Landing page with navigation options
  if (!currentView) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-custom-white font-kurdis text-5xl md:text-7xl mb-4 tracking-wider">
              PROMPT BANK
            </h1>
            <p className="text-custom-white/40 text-base md:text-lg font-light">
              Choose your workspace
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prompt Bank Card */}
            <button
              onClick={() => setCurrentView('prompts')}
              className="group bg-white/5 border border-custom-white/10 p-8 md:p-12 hover:border-custom-white/30 transition text-left"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-custom-white/10 border border-custom-white/20 flex items-center justify-center group-hover:bg-custom-white/20 transition">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-custom-white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-custom-white text-2xl md:text-3xl font-kurdis mb-3 tracking-wide">
                PROMPT BANK
              </h2>
              <p className="text-custom-white/60 font-light leading-relaxed mb-4">
                Browse and manage your collection of successful prompts with results, notes, and tags.
              </p>
              <div className="text-custom-white/40 text-sm font-light uppercase tracking-wide group-hover:text-custom-white/60 transition">
                Enter →
              </div>
            </button>

            {/* Tools Database Card */}
            <button
              onClick={() => setCurrentView('tools')}
              className="group bg-white/5 border border-custom-white/10 p-8 md:p-12 hover:border-custom-white/30 transition text-left"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-custom-white/10 border border-custom-white/20 flex items-center justify-center group-hover:bg-custom-white/20 transition">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-custom-white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-custom-white text-2xl md:text-3xl font-kurdis mb-3 tracking-wide">
                TOOLS DATABASE
              </h2>
              <p className="text-custom-white/60 font-light leading-relaxed mb-4">
                Discover and learn about AI tools with detailed descriptions and best use cases.
              </p>
              <div className="text-custom-white/40 text-sm font-light uppercase tracking-wide group-hover:text-custom-white/60 transition">
                Enter →
              </div>
            </button>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={handleLogout}
              className="text-custom-white/40 hover:text-custom-white text-sm font-light uppercase tracking-wide transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the selected view
  if (currentView === 'prompts') {
    return <PromptBank onNavigate={setCurrentView} onLogout={handleLogout} />;
  }

  if (currentView === 'tools') {
    return <ToolsDatabase onNavigate={setCurrentView} onLogout={handleLogout} />;
  }
}
