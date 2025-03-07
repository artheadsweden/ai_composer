import React, { createContext, useContext, useState, useEffect, useCallback, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Define actions for the reducer
const PROJECT_ACTIONS = {
  SET_PROJECT: 'set_project',
  UPDATE_PROJECT: 'update_project',
  SET_TRACKS: 'set_tracks',
  ADD_TRACK: 'add_track',
  ADD_TRACKS: 'add_tracks',
  UPDATE_TRACK: 'update_track',
  REMOVE_TRACK: 'remove_track',
  DUPLICATE_TRACK: 'duplicate_track',
  CLEAR_PROJECT: 'clear_project'
};

// Project and tracks reducer
const projectReducer = (state, action) => {
  switch (action.type) {
    case PROJECT_ACTIONS.SET_PROJECT:
      return { ...state, project: action.payload, loading: false };
      
    case PROJECT_ACTIONS.UPDATE_PROJECT:
      return { 
        ...state, 
        project: { ...state.project, ...action.payload },
        unsavedChanges: true
      };
      
    case PROJECT_ACTIONS.SET_TRACKS:
      return { ...state, tracks: action.payload };
      
    case PROJECT_ACTIONS.ADD_TRACK:
      return { 
        ...state,
        tracks: [...state.tracks, action.payload],
        unsavedChanges: true
      };
      
    case PROJECT_ACTIONS.ADD_TRACKS:
      return { 
        ...state,
        tracks: [...state.tracks, ...action.payload],
        unsavedChanges: true
      };
      
    case PROJECT_ACTIONS.UPDATE_TRACK: {
      const { trackId, updates } = action.payload;
      const updatedTracks = state.tracks.map(track => 
        track.id === trackId ? { ...track, ...updates } : track
      );
      return { 
        ...state,
        tracks: updatedTracks,
        unsavedChanges: true
      };
    }
      
    case PROJECT_ACTIONS.REMOVE_TRACK:
      return { 
        ...state,
        tracks: state.tracks.filter(track => track.id !== action.payload),
        unsavedChanges: true
      };
      
    case PROJECT_ACTIONS.DUPLICATE_TRACK: {
      const trackToDuplicate = state.tracks.find(track => track.id === action.payload);
      if (!trackToDuplicate) return state;
      
      const duplicatedTrack = {
        ...trackToDuplicate,
        id: `duplicate-${Date.now()}-${trackToDuplicate.id}`,
        name: `${trackToDuplicate.name} (Copy)`
      };
      
      return { 
        ...state,
        tracks: [...state.tracks, duplicatedTrack],
        unsavedChanges: true
      };
    }
      
    case PROJECT_ACTIONS.CLEAR_PROJECT:
      return { 
        project: null, 
        tracks: [], 
        loading: false, 
        unsavedChanges: false 
      };
      
    default:
      return state;
  }
};

// Create the context
const ProjectContext = createContext();

// Provider component
export const ProjectProvider = ({ children }) => {
  // Initial state
  const initialState = {
    project: null,
    tracks: [],
    loading: true,
    unsavedChanges: false
  };
  
  // Set up reducer
  const [state, dispatch] = useReducer(projectReducer, initialState);
  
  // Extract values from state
  const { project, tracks, loading, unsavedChanges } = state;
  
  // For auto-saving and navigation
  const [saveInProgress, setSaveInProgress] = useState(false);
  const navigate = useNavigate();
  
  // Load project data
  const loadProject = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Project not found');
          navigate('/projects');
          return;
        }
        throw new Error('Failed to load project');
      }
      
      const data = await response.json();
      
      // Set project data
      dispatch({ type: PROJECT_ACTIONS.SET_PROJECT, payload: data });
      
      // Set tracks if included in response
      if (data.tracks) {
        dispatch({ type: PROJECT_ACTIONS.SET_TRACKS, payload: data.tracks });
      }
      
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    }
  }, [navigate]);
  
  // Save project changes
  const saveProject = useCallback(async () => {
    if (!project || saveInProgress) return;
    
    setSaveInProgress(true);
    
    try {
      // Update project data
      const projectResponse = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: project.name,
          bpm: project.bpm,
          time_signature: project.time_signature
        }),
      });
      
      if (!projectResponse.ok) {
        throw new Error('Failed to save project');
      }
      
      // Update tracks if needed
      // This is a simplified approach - in a real app, you might want to
      // only save tracks that have changes
      for (const track of tracks) {
        const trackResponse = await fetch(`/api/tracks/${track.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: track.name,
            color: track.color,
            muted: track.muted,
            solo: track.solo,
            volume: track.volume
          }),
        });
        
        if (!trackResponse.ok) {
          throw new Error(`Failed to save track: ${track.name}`);
        }
      }
      
      // Show success message
      toast.success('Project saved successfully');
      
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    } finally {
      setSaveInProgress(false);
    }
  }, [project, tracks, saveInProgress]);
  
  // Auto-save when changes are made
  useEffect(() => {
    if (unsavedChanges && project) {
      const timer = setTimeout(() => {
        saveProject();
      }, 5000); // Autosave after 5 seconds of inactivity
      
      return () => clearTimeout(timer);
    }
  }, [unsavedChanges, project, saveProject]);
  
  // Create a new project
  const createProject = useCallback(async (projectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      const data = await response.json();
      
      // Navigate to the new project
      navigate(`/projects/${data.id}`);
      
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  }, [navigate]);
  
  // Delete a project
  const deleteProject = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Clear current project if it's the one being deleted
      if (project && project.id === projectId) {
        dispatch({ type: PROJECT_ACTIONS.CLEAR_PROJECT });
      }
      
      // Navigate back to projects list
      navigate('/projects');
      
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  }, [project, navigate]);
  
  // Update project properties
  const updateProject = useCallback((updates) => {
    dispatch({ 
      type: PROJECT_ACTIONS.UPDATE_PROJECT, 
      payload: updates 
    });
  }, []);
  
  // Add a single track
  const addTrack = useCallback((track) => {
    dispatch({ 
      type: PROJECT_ACTIONS.ADD_TRACK, 
      payload: track 
    });
  }, []);
  
  // Add multiple tracks
  const addTracks = useCallback((newTracks) => {
    dispatch({ 
      type: PROJECT_ACTIONS.ADD_TRACKS, 
      payload: newTracks 
    });
  }, []);
  
  // Update a track
  const updateTrack = useCallback((trackId, updates) => {
    dispatch({ 
      type: PROJECT_ACTIONS.UPDATE_TRACK, 
      payload: { trackId, updates } 
    });
  }, []);
  
  // Remove a track
  const removeTrack = useCallback((trackId) => {
    dispatch({ 
      type: PROJECT_ACTIONS.REMOVE_TRACK, 
      payload: trackId 
    });
  }, []);
  
  // Duplicate a track
  const duplicateTrack = useCallback((trackId) => {
    dispatch({ 
      type: PROJECT_ACTIONS.DUPLICATE_TRACK, 
      payload: trackId 
    });
  }, []);
  
  // Clear the current project
  const clearProject = useCallback(() => {
    dispatch({ type: PROJECT_ACTIONS.CLEAR_PROJECT });
  }, []);
  
  // The context value
  const value = {
    project,
    tracks,
    loading,
    unsavedChanges,
    saveInProgress,
    loadProject,
    saveProject,
    createProject,
    deleteProject,
    updateProject,
    addTrack,
    addTracks,
    updateTrack,
    removeTrack,
    duplicateTrack,
    clearProject
  };
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook for using the context
export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;