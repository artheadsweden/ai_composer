import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Save, Download, Settings, HelpCircle, User, Menu, X } from 'lucide-react';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';
import { useProjectContext } from '../../context/ProjectContext';

/**
 * Header component that appears at the top of every page
 * Contains navigation, actions, and user controls
 */
const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const location = useLocation();
  const { project, saveProject, saveInProgress } = useProjectContext();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Check if we're in a project
  const inProject = location.pathname.includes('/projects/') && project;
  
  // Handle save action
  const handleSave = () => {
    if (inProject && !saveInProgress) {
      saveProject();
    }
  };
  
  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };
  
  return (
    <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-4 z-10">
      {/* Left side - Logo and menu toggle */}
      <div className="flex items-center">
        <button 
          className="mr-4 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 md:hidden"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <Link to="/" className="flex items-center">
          <Music className="h-8 w-8 text-blue-500" />
          <h1 className="ml-2 text-xl font-bold hidden sm:block">AI Ensemble Composer</h1>
          <h1 className="ml-2 text-xl font-bold sm:hidden">AI Composer</h1>
        </Link>
      </div>
      
      {/* Center - Current project title (if applicable) */}
      {inProject && (
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center hidden md:block">
          <h2 className="text-lg font-medium truncate max-w-xs">
            {project.name}
          </h2>
        </div>
      )}
      
      {/* Right side - Actions and user */}
      <div className="flex items-center space-x-2">
        {/* Project-specific actions */}
        {inProject && (
          <>
            <Tooltip content="Save Project">
              <Button 
                variant="ghost" 
                size="small"
                onClick={handleSave}
                disabled={saveInProgress}
                icon={<Save size={18} />}
                className="hidden sm:flex"
              >
                {saveInProgress ? 'Saving...' : 'Save'}
              </Button>
            </Tooltip>
            
            <Tooltip content="Export">
              <Button 
                variant="ghost" 
                size="small"
                icon={<Download size={18} />}
                className="hidden sm:flex"
              >
                Export
              </Button>
            </Tooltip>
          </>
        )}
        
        {/* Always-visible actions */}
        <Tooltip content="Settings">
          <Button 
            variant="ghost" 
            size="small"
            icon={<Settings size={18} />}
            className="p-2"
            aria-label="Settings"
          />
        </Tooltip>
        
        <Tooltip content="Help">
          <Button 
            variant="ghost" 
            size="small"
            icon={<HelpCircle size={18} />}
            className="p-2"
            aria-label="Help"
          />
        </Tooltip>
        
        {/* User profile button */}
        <div className="relative">
          <button
            className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={toggleUserMenu}
            aria-label="User menu"
          >
            <User size={18} />
          </button>
          
          {/* User dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-20">
              <div className="py-1">
                <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700">
                  Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700">
                  Settings
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                <button className="w-full text-left px-4 py-2 text-white hover:bg-gray-700">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;