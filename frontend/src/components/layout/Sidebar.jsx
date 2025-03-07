import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Music, 
  Plus, 
  List, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Home, 
  PlusCircle 
} from 'lucide-react';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';
import { useProjectContext } from '../../context/ProjectContext';

/**
 * Sidebar component with navigation and project management
 * Supports collapsible view and responsive design
 */
const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { project, tracks } = useProjectContext();
  const [collapsed, setCollapsed] = useState(false);
  
  // Toggle sidebar collapsed state (for desktop)
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  // Create a new project
  const handleCreateProject = () => {
    const projectName = prompt('Enter a name for your new project:');
    
    if (projectName && projectName.trim()) {
      // Navigate to generation page or creation flow
      navigate('/generate');
    }
  };
  
  // Handle mobile sidebar close
  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
    }
  };
  
  // Determine sidebar width based on state
  const sidebarWidth = collapsed ? 'w-16' : 'w-64';
  
  // For mobile: full-width sidebar with overlay
  const mobileStyles = isMobile
    ? 'fixed inset-y-0 left-0 z-20 w-64 transform transition-transform duration-300 ease-in-out shadow-lg ' +
      (isOpen ? 'translate-x-0' : '-translate-x-full')
    : '';
  
  // For desktop: persistent sidebar with variable width
  const desktopStyles = !isMobile
    ? `relative ${sidebarWidth} transition-width duration-300 ease-in-out`
    : '';
  
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside className={`bg-gray-800 border-r border-gray-700 h-full flex flex-col ${mobileStyles} ${desktopStyles}`}>
        {/* Sidebar header - only shown in expanded mode or mobile */}
        {(!collapsed || isMobile) && (
          <div className="h-16 border-b border-gray-700 flex items-center justify-between px-4">
            <h2 className="text-lg font-semibold">Navigation</h2>
            
            {/* Collapse button (desktop only) */}
            {!isMobile && (
              <button 
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            
            {/* Close button (mobile only) */}
            {isMobile && (
              <button 
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <ChevronLeft size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Collapsed mode expand button */}
        {collapsed && !isMobile && (
          <div className="h-16 flex items-center justify-center">
            <button 
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        
        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {/* Dashboard */}
            <li>
              <NavLink
                to="/"
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center px-3 py-2 rounded-md
                  ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                `}
              >
                {collapsed && !isMobile ? (
                  <Tooltip content="Dashboard" position="right">
                    <Home size={20} />
                  </Tooltip>
                ) : (
                  <>
                    <Home size={20} className="mr-3" />
                    <span>Dashboard</span>
                  </>
                )}
              </NavLink>
            </li>
            
            {/* Projects */}
            <li>
              <NavLink
                to="/projects"
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center px-3 py-2 rounded-md
                  ${isActive || location.pathname.includes('/projects/') 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                `}
              >
                {collapsed && !isMobile ? (
                  <Tooltip content="Projects" position="right">
                    <List size={20} />
                  </Tooltip>
                ) : (
                  <>
                    <List size={20} className="mr-3" />
                    <span>Projects</span>
                  </>
                )}
              </NavLink>
            </li>
            
            {/* Settings */}
            <li>
              <NavLink
                to="/settings"
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center px-3 py-2 rounded-md
                  ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                `}
              >
                {collapsed && !isMobile ? (
                  <Tooltip content="Settings" position="right">
                    <Settings size={20} />
                  </Tooltip>
                ) : (
                  <>
                    <Settings size={20} className="mr-3" />
                    <span>Settings</span>
                  </>
                )}
              </NavLink>
            </li>
            
            {/* Help */}
            <li>
              <NavLink
                to="/help"
                onClick={handleLinkClick}
                className={({ isActive }) => `
                  flex items-center px-3 py-2 rounded-md
                  ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                `}
              >
                {collapsed && !isMobile ? (
                  <Tooltip content="Help" position="right">
                    <HelpCircle size={20} />
                  </Tooltip>
                ) : (
                  <>
                    <HelpCircle size={20} className="mr-3" />
                    <span>Help</span>
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          
          {/* Create project button */}
          <div className="px-2 mt-6">
            {collapsed && !isMobile ? (
              <Tooltip content="Create New Project" position="right">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={handleCreateProject}
                  icon={<PlusCircle size={20} />}
                />
              </Tooltip>
            ) : (
              <Button
                variant="primary"
                fullWidth
                onClick={handleCreateProject}
                icon={<PlusCircle size={18} />}
              >
                Create New Project
              </Button>
            )}
          </div>
          
          {/* Recent projects section */}
          {(!collapsed || isMobile) && (
            <div className="mt-8 px-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-700">
                Recent Projects
              </h3>
              
              <ul className="mt-2 space-y-1">
                <li>
                  <NavLink
                    to="/projects/123"
                    onClick={handleLinkClick}
                    className={({ isActive }) => `
                      block px-3 py-2 text-sm rounded-md truncate
                      ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                    `}
                  >
                    My First Project
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/projects/456"
                    onClick={handleLinkClick}
                    className={({ isActive }) => `
                      block px-3 py-2 text-sm rounded-md truncate
                      ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                    `}
                  >
                    Electronic Beat Demo
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/projects/789"
                    onClick={handleLinkClick}
                    className={({ isActive }) => `
                      block px-3 py-2 text-sm rounded-md truncate
                      ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                    `}
                  >
                    Jazz Experiment
                  </NavLink>
                </li>
              </ul>
            </div>
          )}
        </nav>
        
        {/* Current project tracks section (only when in a project) */}
        {project && (!collapsed || isMobile) && (
          <div className="mt-auto border-t border-gray-700 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Current Project Tracks
            </h3>
            
            {tracks.length > 0 ? (
              <ul className="space-y-1">
                {tracks.map(track => (
                  <li key={track.id} className="flex items-center px-1 py-1">
                    <div 
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: track.color }}
                    ></div>
                    <span className="text-sm truncate">{track.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No tracks yet</p>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;