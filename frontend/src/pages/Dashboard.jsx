import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, PlusCircle, Clock, Calendar, BarChart, ArrowRight, List, Grid, HardDrive } from 'lucide-react';
import { useUIContext } from '../context/UIContext';
import storageUtils from '../services/storageUtils';

/**
 * Dashboard page component showing recent projects, stats and quick actions
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { notifyError } = useUIContext();
  
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    total: 0,
    percentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Load recent projects and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get recent project IDs
        const recentIds = storageUtils.getRecentProjects();
        
        // Load details for each project
        const projectDetails = [];
        
        // Collect all projects for stats
        const allProjects = await storageUtils.getAllProjects();
        
        // Load details for recent projects
        for (const id of recentIds) {
          try {
            const project = await storageUtils.loadProject(id);
            if (project) {
              projectDetails.push(project);
            }
          } catch (err) {
            // Skip projects that fail to load
            console.error(`Failed to load project ${id}:`, err);
          }
        }
        
        // Generate project stats
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const thisWeekProjects = allProjects.filter(
          p => new Date(p.createdAt) >= oneWeekAgo
        ).length;
        
        const thisMonthProjects = allProjects.filter(
          p => new Date(p.createdAt) >= oneMonthAgo
        ).length;
        
        setProjectStats({
          total: allProjects.length,
          thisWeek: thisWeekProjects,
          thisMonth: thisMonthProjects
        });
        
        // Get storage info
        const storageData = await storageUtils.checkStorageQuota();
        setStorageInfo({
          used: storageData.usage || 0,
          total: storageData.quota || 0,
          percentage: storageData.usagePercentage || 0
        });
        
        // Update state
        setRecentProjects(projectDetails);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        notifyError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [notifyError]);
  
  // Format date to readable string
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Format file size to readable string
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Navigate to create new project
  const handleCreateProject = () => {
    navigate('/projects/new');
  };
  
  // Render recent projects in grid mode
  const renderProjectGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Create new project card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-750 transition-colors h-full"
        onClick={handleCreateProject}
      >
        <PlusCircle size={40} className="text-blue-500 mb-4" />
        <h3 className="text-lg font-medium">Create New Project</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          Start a new music composition with AI
        </p>
      </div>
      
      {/* Recent project cards */}
      {recentProjects.map(project => (
        <Link 
          key={project.id}
          to={`/projects/${project.id}`}
          className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors"
        >
          <div className="h-36 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            <Music size={40} className="text-white opacity-75" />
          </div>
          <div className="p-4">
            <h3 className="font-medium truncate">{project.name}</h3>
            <div className="flex items-center text-sm text-gray-400 mt-2">
              <Clock size={14} className="mr-1" />
              <span>{formatDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-400 mt-2">
              <span>{project.tracks?.length || 0} tracks</span>
              <span>{project.bpm || 120} BPM</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
  
  // Render recent projects in list mode
  const renderProjectList = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="grid grid-cols-12 gap-4 p-3 border-b border-gray-700 bg-gray-750 text-sm font-medium text-gray-400">
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-2">Tracks</div>
        <div className="col-span-1">BPM</div>
        <div className="col-span-2">Duration</div>
      </div>
      
      {/* Create new project row */}
      <div 
        className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
        onClick={handleCreateProject}
      >
        <div className="col-span-5 flex items-center">
          <PlusCircle size={16} className="text-blue-500 mr-2" />
          <span className="font-medium">Create New Project</span>
        </div>
        <div className="col-span-2">-</div>
        <div className="col-span-2">-</div>
        <div className="col-span-1">-</div>
        <div className="col-span-2">-</div>
      </div>
      
      {/* Project rows */}
      {recentProjects.map(project => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors"
        >
          <div className="col-span-5 flex items-center">
            <Music size={16} className="text-blue-500 mr-2" />
            <span className="font-medium truncate">{project.name}</span>
          </div>
          <div className="col-span-2 text-gray-400 text-sm">
            {formatDate(project.createdAt)}
          </div>
          <div className="col-span-2 text-gray-400 text-sm">
            {project.tracks?.length || 0} tracks
          </div>
          <div className="col-span-1 text-gray-400 text-sm">
            {project.bpm || 120}
          </div>
          <div className="col-span-2 text-gray-400 text-sm">
            {project.duration ? `${Math.floor(project.duration / 60)}:${String(project.duration % 60).padStart(2, '0')}` : '-'}
          </div>
        </Link>
      ))}
    </div>
  );
  
  return (
    <div className="dashboard-page container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Welcome to AI Ensemble Composer
        </p>
      </header>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Projects</h3>
            <div className="w-8 h-8 rounded-full bg-blue-900 bg-opacity-30 flex items-center justify-center">
              <Music size={16} className="text-blue-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{projectStats.total}</p>
              <p className="text-sm text-gray-400">
                +{projectStats.thisWeek} this week
              </p>
            </div>
            <div className="flex items-center text-green-500 text-sm">
              <BarChart size={14} className="mr-1" />
              <span>+{projectStats.thisMonth} this month</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Recent Activity</h3>
            <div className="w-8 h-8 rounded-full bg-purple-900 bg-opacity-30 flex items-center justify-center">
              <Calendar size={16} className="text-purple-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{recentProjects.length}</p>
              <p className="text-sm text-gray-400">
                recently accessed projects
              </p>
            </div>
            <div className="flex items-center text-purple-500 text-sm">
              <Link to="/projects" className="flex items-center">
                <span>View all</span>
                <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Storage</h3>
            <div className="w-8 h-8 rounded-full bg-green-900 bg-opacity-30 flex items-center justify-center">
              <HardDrive size={16} className="text-green-500" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {formatFileSize(storageInfo.used)}
              </p>
              <p className="text-sm text-gray-400">
                of {formatFileSize(storageInfo.total)}
              </p>
            </div>
            <div className="flex items-center text-green-500 text-sm">
              <span>{storageInfo.percentage}% used</span>
            </div>
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500"
              style={{ width: `${storageInfo.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Recent projects section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700' : 'hover:bg-gray-750'}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700' : 'hover:bg-gray-750'}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : recentProjects.length === 0 && projectStats.total === 0 ? (
          <div className="bg-gray-800 rounded-lg p-10 border border-gray-700 text-center">
            <Music size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-medium mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first project to get started with AI Ensemble Composer
            </p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={handleCreateProject}
            >
              Create New Project
            </button>
          </div>
        ) : (
          viewMode === 'grid' ? renderProjectGrid() : renderProjectList()
        )}
      </div>
      
      {/* Quick links */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/generate"
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">New Composition</h3>
              <div className="w-8 h-8 rounded-full bg-blue-900 bg-opacity-30 flex items-center justify-center">
                <PlusCircle size={16} className="text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Start a new project with AI generation
            </p>
          </Link>
          
          <Link
            to="/projects"
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">All Projects</h3>
              <div className="w-8 h-8 rounded-full bg-purple-900 bg-opacity-30 flex items-center justify-center">
                <Music size={16} className="text-purple-500" />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Browse and manage all your projects
            </p>
          </Link>
          
          <Link
            to="/settings"
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Settings</h3>
              <div className="w-8 h-8 rounded-full bg-gray-900 bg-opacity-30 flex items-center justify-center">
                <HardDrive size={16} className="text-gray-500" />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Configure application preferences
            </p>
          </Link>
          
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Documentation</h3>
              <div className="w-8 h-8 rounded-full bg-green-900 bg-opacity-30 flex items-center justify-center">
                <ArrowRight size={16} className="text-green-500" />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Learn how to use AI Ensemble Composer
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;