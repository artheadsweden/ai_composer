import React from 'react';
import { useLocation } from 'react-router-dom';
import { useProjectContext } from '../../context/ProjectContext';

/**
 * MainContent component serves as the container for the main content area
 * Adjusts based on the current route and project state
 */
const MainContent = ({ children }) => {
  const location = useLocation();
  const { project, loading } = useProjectContext();
  
  // Determine if we're in a project view
  const isProjectView = location.pathname.includes('/projects/') && project;
  
  // Determine appropriate padding and styling based on route
  const getContentStyles = () => {
    // Project view gets less padding to maximize space for tracks
    if (isProjectView) {
      return 'p-2 md:p-4';
    }
    
    // Dashboard, settings, etc. get more padding
    return 'p-4 md:p-6';
  };
  
  // Show loading state if project is loading
  if (location.pathname.includes('/projects/') && loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className={`flex-1 overflow-auto bg-gray-900 ${getContentStyles()}`}>
      {/* Error boundary could be added here */}
      <div className="h-full">
        {children}
      </div>
    </main>
  );
};

export default MainContent;