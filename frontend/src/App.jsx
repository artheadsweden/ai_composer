import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout components
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import Composer from './pages/Composer';
import Settings from './pages/Settings';

// Context providers
import { ProjectProvider } from './context/ProjectContext';
import { UIProvider } from './context/UIContext';
import { AudioProvider } from './context/AudioContext';

// Theme utilities
import { applyTheme, getPreferredTheme } from './styles/theme';

/**
 * Main App component that sets up routing and global context providers
 */
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize theme and other app settings
  useEffect(() => {
    // Apply theme based on user preference or system setting
    const theme = getPreferredTheme();
    applyTheme(theme);
    
    // Simulate loading time for initial resources
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  // If app is still loading, show a minimal loading indicator
  // (main loading screen is in index.html)
  if (isLoading) {
    return null;
  }
  
  return (
    <Router>
      <UIProvider>
        <ProjectProvider>
          <AudioProvider>
            <Routes>
              {/* Main routes wrapped in Layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/:projectId" element={<Composer />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Generate route (could be integrated into projects flow) */}
                <Route path="/generate" element={<Navigate to="/projects/new" replace />} />
                
                {/* 404 route */}
                <Route path="*" element={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4">404</h1>
                      <p className="text-xl mb-6">Page not found</p>
                      <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Return Home
                      </a>
                    </div>
                  </div>
                } />
              </Route>
            </Routes>
            
            {/* Toast notifications */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                  duration: 5000,
                },
              }}
            />
            
            {/* Global modal portal container */}
            <div id="modal-container" />
          </AudioProvider>
        </ProjectProvider>
      </UIProvider>
    </Router>
  );
};

export default App;