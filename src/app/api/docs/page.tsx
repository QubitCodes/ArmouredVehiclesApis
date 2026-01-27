'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false }) as any;

export default function ApiDocs() {
  const [darkMode, setDarkMode] = useState(false);
  const [spec, setSpec] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch Spec
  useEffect(() => {
    fetch('/api/swagger')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load spec', err);
        setLoading(false);
      });
  }, []);

  // Dark Mode Persistence
  useEffect(() => {
    const saved = localStorage.getItem('swagger-theme');
    if (saved === 'dark' || !saved) { 
        setDarkMode(true);
        document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem('swagger-theme', newVal ? 'dark' : 'light');
    if (newVal) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  };

  // Deep Searching Logic
  const filteredSpec = useMemo(() => {
    if (!spec) return null;
    if (!searchQuery) return spec;

    const lowerQuery = searchQuery.toLowerCase();
    const newSpec = { ...spec, paths: {} };
    let foundAny = false;

    Object.keys(spec.paths).forEach(pathKey => {
      const pathItem = spec.paths[pathKey];
      let hasMatchInPath = pathKey.toLowerCase().includes(lowerQuery);
      let matchingMethods: any = {};

      ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
        if (pathItem[method]) {
          const content = pathItem[method];
          const summary = content.summary?.toLowerCase() || '';
          const description = content.description?.toLowerCase() || '';
          const tags = content.tags?.join(' ').toLowerCase() || '';

          if (hasMatchInPath || summary.includes(lowerQuery) || description.includes(lowerQuery) || tags.includes(lowerQuery)) {
            matchingMethods[method] = content;
            foundAny = true;
          }
        }
      });

      if (Object.keys(matchingMethods).length > 0) {
        newSpec.paths[pathKey] = matchingMethods;
      }
    });

    return newSpec;
  }, [spec, searchQuery]);


  // CSS Styles
  const css = `
    /* Reset & Typography */
    .swagger-ui { font-family: 'Inter', sans-serif !important; }
    
    /* Fixed Top Bar Layout */
    .custom-topbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0,0,0,0.1);
        transition: background 0.3s;
    }
    
    /* Move Authorize to Top Bar via CSS Transform */
    .swagger-ui .scheme-container {
        position: fixed;
        top: 10px;
        right: 140px; /* Left of Dark Mode Toggle */
        z-index: 2001;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        height: 40px;
        display: flex;
        align-items: center;
    }
    
    .swagger-ui .scheme-container .schemes-title,
    .swagger-ui .scheme-container select {
        display: none !important; /* Hide HTTP/HTTPS dropdown if not needed, or keep? specific user asked for Authorize */
    }

    .swagger-ui .btn.authorize {
        background: transparent !important;
        border: 1px solid #61affe !important;
        color: #61affe !important;
        border-radius: 6px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        padding: 6px 16px !important;
        font-size: 13px !important;
    }
    
    .swagger-ui .btn.authorize svg { fill: #61affe !important; }
    
    /* Layout Adjustments */
    .swagger-ui { padding-top: 70px !important; max-width: 1400px; margin: 0 auto; }
    .swagger-ui .wrapper { padding: 0 !important; }
    
    /* Hide Built-in Filter */
    .swagger-ui .filter { display: none !important; }

    /* Dark Mode Variables */
    body.dark-mode { background: #121212; color: #e0e0e0; }
    body.dark-mode .custom-topbar { background: rgba(30,30,30,0.9); border-bottom-color: #333; }
    
    /* Dark Mode Swagger Overrides */
    .dark-mode .swagger-ui .info .title, .dark-mode .swagger-ui .info h1, .dark-mode .swagger-ui .info h2, .dark-mode .swagger-ui .info h3 { color: #fff !important; }
    .dark-mode .swagger-ui .opblock .opblock-summary-operation-id, .dark-mode .swagger-ui .opblock .opblock-summary-path { color: #ddd !important; }
    .dark-mode .swagger-ui .opblock { background: #1e1e1e !important; border-color: #333 !important; }
    .dark-mode .swagger-ui .opblock-summary { border-bottom-color: #2a2a2a !important; }
    .dark-mode .swagger-ui .opblock-body { background: #1a1a1a !important; }
    .dark-mode .swagger-ui input, .dark-mode .swagger-ui select, .dark-mode .swagger-ui textarea { background: #252525 !important; color: #fff !important; border-color: #444 !important; }
    .dark-mode .swagger-ui section.models { background: #1e1e1e !important; border-color: #333 !important; }
    .dark-mode .swagger-ui .model { color: #ccc !important; }
    .dark-mode .swagger-ui table thead tr th { color: #eee !important; border-bottom-color: #444 !important; }
    .dark-mode .swagger-ui table tbody tr td { color: #ccc !important; border-bottom-color: #333 !important; }
    
    /* Custom Input in Header */
    .search-input {
        background: rgba(255,255,255,0.8);
        border: 1px solid #ddd;
        padding: 8px 16px;
        border-radius: 20px;
        width: 400px;
        outline: none;
        transition: all 0.2s;
        font-size: 14px;
    }
    .dark-mode .search-input {
        background: #252525;
        border-color: #444;
        color: #fff;
    }
    .search-input:focus {
        border-color: #61affe;
        box-shadow: 0 0 0 3px rgba(97,175,254,0.2);
    }
  `;

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading API Docs...</div>;

  return (
    <>
      <style>{css}</style>
      
      {/* Top Bar */}
      <div className="custom-topbar" style={{ background: darkMode ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: darkMode ? '#fff' : '#000' }}>
            Internal API Docs
        </div>
        
        {/* Central Search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input 
                type="text" 
                className="search-input"
                placeholder="Search endpoints, logs, orders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Right Actions */}
        <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end' }}>
             <button onClick={toggleDarkMode} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                {darkMode ? '☀️' : '🌙'}
             </button>
        </div>
      </div>

      <SwaggerUI 
        spec={filteredSpec}
        docExpansion={searchQuery ? 'list' : 'list'}
        persistAuthorization={true} 
      />
    </>
  );
}
