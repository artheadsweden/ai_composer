import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Music, PlusCircle, Search, Calendar, Clock, Trash2, 
  Edit, MoreVertical, Download, Grid, List, ChevronDown, 
  ChevronUp, Loader, X
} from 'lucide-react';
import { useUIContext } from '../context/UIContext';
import storageUtils from '../services/storageUtils';
import api from '../services/api';

/**
 * ProjectList page component for browsing and managing all projects
 */
const ProjectList = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, openModal, closeModal } = useUIContext();
  
  // State
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [creatingProject, setCreatingProject] = useState(false);
  
  // Load projects from storage or API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Try to load from API first
        try {
          const apiProjects = await api.projects.getAll();
          setProjects(apiProjects);
          setIsLoading(false);
          return;
        } catch (apiError) {
          console.warn('Could not load projects from API, falling back to local storage', apiError);
        }
        
        // Fallback to local storage
        const localProjects = await storageUtils.getAllProjects();
        setProjects(localProjects);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading projects:', error);
        notifyError('Failed to load projects');
        setIsLoading(false);
      }
    };
    
    loadProjects();
  }, [notifyError]);
  
  // Filter and sort projects when dependencies change
  useEffect(() => {
    // Filter projects based on search query
    let filtered = [...projects];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query)
      );
    }
    
    // Sort projects
    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      // Handle string comparison
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      
      // Handle dates stored as timestamps
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      
      // Apply sort direction
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
    
    setFilteredProjects(filtered);
  }, [projects, searchQuery, sortField, sortDirection]);
  
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
  
  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  // Toggle project selection
  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };
  
  // Delete selected projects
  const handleDeleteSelected = async () => {
    if (selectedProjects.length === 0) return;
    
    // Open confirmation modal
    openModal('confirmation', {
      title: 'Delete Projects',
      message: `Are you sure you want to delete ${selectedProjects.length} selected project(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          // Delete each selected project
          for (const projectId of selectedProjects) {
            try {
              // Try API first
              await api.projects.delete(projectId);
            } catch (apiError) {
              console.warn('API delete failed, falling back to local storage', apiError);
              // Fallback to local storage
              await storageUtils.deleteProject(projectId);
            }
          }
          
          // Update projects list
          setProjects(prev => prev.filter(project => !selectedProjects.includes(project.id)));
          setSelectedProjects([]);
          
          notifySuccess(`${selectedProjects.length} project(s) deleted`);
          closeModal();
        } catch (error) {
          console.error('Error deleting projects:', error);
          notifyError('Failed to delete some projects');
          closeModal();
        }
      }
    });
  };
  
  // Create a new project
  const handleCreateProject = async () => {
    setCreatingProject(true);
    
    try {
      // Open modal to get project name
      openModal('prompt', {
        title: 'Create New Project',
        message: 'Enter a name for your new project:',
        defaultValue: 'New Project',
        confirmLabel: 'Create',
        onConfirm: async (name) => {
          try {
            // Create project via API
            const projectData = {
              name,
              bpm: 120,
              time_signature: '4/4',
            };
            
            let newProject;
            
            try {
              newProject = await api.projects.create(projectData);
            } catch (apiError) {
              console.warn('API project creation failed, using local storage', apiError);
              
              // Fallback to local creation
              newProject = {
                id: `local-${Date.now()}`,
                ...projectData,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              
              await storageUtils.saveProject(newProject);
            }
            
            // Navigate to the new project
            navigate(`/projects/${newProject.id}`);
            closeModal();
          } catch (error) {
            console.error('Error creating project:', error);
            notifyError('Failed to create project');
            closeModal();
          } finally {
            setCreatingProject(false);
          }
        },
        onCancel: () => {
          setCreatingProject(false);
          closeModal();
        }
      });
    } catch (error) {
      console.error('Error showing create project modal:', error);
      setCreatingProject(false);
    }
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <div className="bg-gray-800 rounded-lg p-10 border border-gray-700 text-center">
      <Music size={48} className="mx-auto text-gray-600 mb-4" />
      <h3 className="text-xl font-medium mb-2">No projects found</h3>
      {searchQuery ? (
        <p className="text-gray-400 mb-6">
          No projects match your search query. Try a different search or clear the filter.
        </p>
      ) : (
        <p className="text-gray-400 mb-6">
          Create your first project to get started with AI Ensemble Composer.
        </p>
      )}
      <div className="flex justify-center space-x-4">
        {searchQuery && (
          <button
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            onClick={handleClearSearch}
          >
            Clear Search
          </button>
        )}
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={handleCreateProject}
          disabled={creatingProject}
        >
          {creatingProject ? (
            <>
              <Loader size={16} className="inline-block mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create New Project'
          )}
        </button>
      </div>
    </div>
  );
  
  // Render project grid view
  const renderProjectGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Create new project card */}
      <div 
        className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-750 transition-colors h-full"
        onClick={handleCreateProject}
      >
        <PlusCircle size={40} className="text-blue-500 mb-4" />
        <h3 className="text-lg font-medium">Create New Project</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          Start a new music composition
        </p>
      </div>
      
      {/* Project cards */}
      {filteredProjects.map(project => (
        <div 
          key={project.id}
          className={`bg-gray-800 rounded-lg border ${selectedProjects.includes(project.id) ? 'border-blue-500' : 'border-gray-700'} overflow-hidden relative group`}
        >
          {/* Selection checkbox */}
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selectedProjects.includes(project.id)}
              onChange={() => toggleProjectSelection(project.id)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 checked:bg-blue-600 focus:ring-blue-500"
            />
          </div>
          
          {/* Project content */}
          <Link to={`/projects/${project.id}`} className="block">
            <div className="h-36 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <Music size={40} className="text-white opacity-75" />
            </div>
            <div className="p-4">
              <h3 className="font-medium truncate">{project.name}</h3>
              <div className="flex items-center text-sm text-gray-400 mt-2">
                <Clock size={14} className="mr-1" />
                <span>Updated: {formatDate(project.updatedAt || project.createdAt)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400 mt-1">
                <Calendar size={14} className="mr-1" />
                <span>Created: {formatDate(project.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400 mt-2">
                <span>{project.tracks?.length || 0} tracks</span>
                <span>{project.bpm || 120} BPM</span>
              </div>
            </div>
          </Link>
          
          {/* Action buttons shown on hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="p-1 bg-gray-800 bg-opacity-80 rounded hover:bg-gray-700"
              onClick={() => {
                openModal('prompt', {
                  title: 'Rename Project',
                  message: 'Enter a new name for this project:',
                  defaultValue: project.name,
                  confirmLabel: 'Rename',
                  onConfirm: async (newName) => {
                    try {
                      // Update project
                      const updatedProject = { ...project, name: newName };
                      
                      // Try API first
                      try {
                        await api.projects.update(project.id, { name: newName });
                      } catch (apiError) {
                        console.warn('API update failed, using local storage', apiError);
                        await storageUtils.saveProject(updatedProject);
                      }
                      
                      // Update state
                      setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
                      notifySuccess('Project renamed');
                      closeModal();
                    } catch (error) {
                      console.error('Error renaming project:', error);
                      notifyError('Failed to rename project');
                      closeModal();
                    }
                  }
                });
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
  
  // Render project list view
  const renderProjectList = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 p-3 border-b border-gray-700 bg-gray-750 text-sm font-medium text-gray-400">
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={selectedProjects.length > 0 && selectedProjects.length === filteredProjects.length}
            onChange={() => {
              if (selectedProjects.length === filteredProjects.length) {
                setSelectedProjects([]);
              } else {
                setSelectedProjects(filteredProjects.map(p => p.id));
              }
            }}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 checked:bg-blue-600 focus:ring-blue-500"
          />
        </div>
        <div 
          className="col-span-4 flex items-center cursor-pointer"
          onClick={() => handleSort('name')}
        >
          <span>Name</span>
          {sortField === 'name' && (
            sortDirection === 'asc' ? 
            <ChevronUp size={14} className="ml-1" /> : 
            <ChevronDown size={14} className="ml-1" />
          )}
        </div>
        <div 
          className="col-span-2 flex items-center cursor-pointer"
          onClick={() => handleSort('createdAt')}
        >
          <span>Created</span>
          {sortField === 'createdAt' && (
            sortDirection === 'asc' ? 
            <ChevronUp size={14} className="ml-1" /> : 
            <ChevronDown size={14} className="ml-1" />
          )}
        </div>
        <div 
          className="col-span-2 flex items-center cursor-pointer"
          onClick={() => handleSort('updatedAt')}
        >
          <span>Updated</span>
          {sortField === 'updatedAt' && (
            sortDirection === 'asc' ? 
            <ChevronUp size={14} className="ml-1" /> : 
            <ChevronDown size={14} className="ml-1" />
          )}
        </div>
        <div className="col-span-1">Tracks</div>
        <div className="col-span-1">BPM</div>
        <div className="col-span-1">Actions</div>
      </div>
      
      {/* Create new project row */}
      <div 
        className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
        onClick={handleCreateProject}
      >
        <div className="col-span-1"></div>
        <div className="col-span-4 flex items-center">
          <PlusCircle size={16} className="text-blue-500 mr-2" />
          <span className="font-medium">Create New Project</span>
        </div>
        <div className="col-span-2">-</div>
        <div className="col-span-2">-</div>
        <div className="col-span-1">-</div>
        <div className="col-span-1">-</div>
        <div className="col-span-1">-</div>
      </div>
      
      {/* Project rows */}
      {filteredProjects.map(project => (
        <div 
          key={project.id}
          className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-700 ${selectedProjects.includes(project.id) ? 'bg-blue-900 bg-opacity-10' : 'hover:bg-gray-750'} transition-colors`}
        >
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedProjects.includes(project.id)}
              onChange={() => toggleProjectSelection(project.id)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 checked:bg-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-4 flex items-center">
            <Link 
              to={`/projects/${project.id}`}
              className="flex items-center hover:text-blue-400"
            >
              <Music size={16} className="text-blue-500 mr-2" />
              <span className="font-medium truncate">{project.name}</span>
            </Link>
          </div>
          <div className="col-span-2 text-gray-400 text-sm">
            {formatDate(project.createdAt)}
          </div>
          <div className="col-span-2 text-gray-400 text-sm">
            {formatDate(project.updatedAt || project.createdAt)}
          </div>
          <div className="col-span-1 text-gray-400 text-sm">
            {project.tracks?.length || 0}
          </div>
          <div className="col-span-1 text-gray-400 text-sm">
            {project.bpm || 120}
          </div>
          <div className="col-span-1 flex space-x-1">
            <button 
              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
              onClick={() => {
                openModal('prompt', {
                  title: 'Rename Project',
                  message: 'Enter a new name for this project:',
                  defaultValue: project.name,
                  confirmLabel: 'Rename',
                  onConfirm: async (newName) => {
                    try {
                      // Update project
                      const updatedProject = { ...project, name: newName };
                      
                      // Try API first
                      try {
                        await api.projects.update(project.id, { name: newName });
                      } catch (apiError) {
                        console.warn('API update failed, using local storage', apiError);
                        await storageUtils.saveProject(updatedProject);
                      }
                      
                      // Update state
                      setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
                      notifySuccess('Project renamed');
                      closeModal();
                    } catch (error) {
                      console.error('Error renaming project:', error);
                      notifyError('Failed to rename project');
                      closeModal();
                    }
                  }
                });
              }}
            >
              <Edit size={16} />
            </button>
            <button 
              className="p-1 text-gray-400 hover:text-green-400 transition-colors"
              onClick={() => {
                // Handle export
                navigate(`/projects/${project.id}/export`);
              }}
            >
              <Download size={16} />
            </button>
            <button 
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              onClick={() => {
                openModal('confirmation', {
                  title: 'Delete Project',
                  message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
                  confirmLabel: 'Delete',
                  confirmVariant: 'danger',
                  onConfirm: async () => {
                    try {
                      // Try API first
                      try {
                        await api.projects.delete(project.id);
                      } catch (apiError) {
                        console.warn('API delete failed, falling back to local storage', apiError);
                        // Fallback to local storage
                        await storageUtils.deleteProject(project.id);
                      }
                      
                      // Update projects list
                      setProjects(prev => prev.filter(p => p.id !== project.id));
                      
                      notifySuccess('Project deleted');
                      closeModal();
                    } catch (error) {
                      console.error('Error deleting project:', error);
                      notifyError('Failed to delete project');
                      closeModal();
                    }
                  }
                });
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="projects-page container mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            onClick={handleCreateProject}
            disabled={creatingProject}
          >
            {creatingProject ? (
              <>
                <Loader size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <PlusCircle size={16} className="mr-2" />
                New Project
              </>
            )}
          </button>
        </div>
        <p className="text-gray-400 mt-2">
          Manage and organize your music projects
        </p>
      </header>
      
      {/* Filters and search bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg block w-full pl-10 p-2.5 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={handleClearSearch}
            >
              <X size={16} className="text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Bulk actions */}
          {selectedProjects.length > 0 && (
            <div className="flex items-center">
              <span className="text-sm text-gray-400 mr-2">
                {selectedProjects.length} selected
              </span>
              <button
                className="text-sm text-red-500 hover:text-red-400 transition-colors flex items-center"
                onClick={handleDeleteSelected}
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </button>
            </div>
          )}
          
          {/* View toggle */}
          <div className="flex items-center space-x-2 ml-auto">
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
      </div>
      
      {/* Project list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        renderEmptyState()
      ) : (
        viewMode === 'grid' ? renderProjectGrid() : renderProjectList()
      )}
    </div>
  );
};

export default ProjectList;