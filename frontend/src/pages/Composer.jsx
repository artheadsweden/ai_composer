import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, Pause, Save, Download, SkipBack, Layers, Music, 
  Settings, Clock, Volume2, VolumeX, Sliders, Loader, PlusCircle
} from 'lucide-react';
import { useProjectContext } from '../context/ProjectContext';
import { useAudioContext } from '../context/AudioContext';
import { useUIContext } from '../context/UIContext';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import TrackList from '../components/tracks/TrackList';
import TrackControls from '../components/tracks/TrackControls';
import MixerPanel from '../components/mixer/MixerPanel';
import EffectsPanel from '../components/mixer/EffectsPanel';
import GeneratorPanel from '../components/generator/GeneratorPanel';
import Button from '../components/common/Button';
import Tooltip from '../components/common/Tooltip';

/**
 * Composer page component - main workspace for editing projects
 */
const Composer = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isNewProject, setIsNewProject] = useState(projectId === 'new');
  
  // Context hooks
  const { 
    project, tracks, loading, loadProject, saveProject, 
    updateProject, createProject, saveInProgress
  } = useProjectContext();
  
  const {
    isPlaying, currentTime, duration, togglePlayPause,
    startPlayback, stopPlayback, seekTo, setMasterVolume
  } = useAudioContext();
  
  const {
    activePanel, changeActivePanel, activePanelTabs, changePanelTab,
    selectedTrackId, setSelectedTrackId, openModal, notifySuccess, notifyError,
    preferences
  } = useUIContext();
  
  // Local state
  const [masterVolume, setMasterVolumeLocal] = useState(preferences.defaultVolume || 80);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(masterVolume);
  const [isSettingUpProject, setIsSettingUpProject] = useState(false);
  
  // Refs
  const timelineRef = useRef(null);
  
  // Load project when component mounts or projectId changes
  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProject(projectId);
    } else if (projectId === 'new') {
      setIsNewProject(true);
      // Show project creation dialog
      setupNewProject();
    }
  }, [projectId, loadProject]);
  
  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    'space': togglePlayPause,
    'ctrl+s': handleSave,
    'escape': stopPlayback,
    'm': toggleMute
  });
  
  // Set master volume when it changes
  useEffect(() => {
    if (!isMuted) {
      setMasterVolume(masterVolume / 100);
    }
  }, [masterVolume, isMuted, setMasterVolume]);
  
  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle timeline click for seeking
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const seekTime = position * duration;
    
    seekTo(seekTime);
  };
  
  // Toggle mute state
  function toggleMute() {
    if (isMuted) {
      setIsMuted(false);
      setMasterVolumeLocal(previousVolume);
      setMasterVolume(previousVolume / 100);
    } else {
      setPreviousVolume(masterVolume);
      setIsMuted(true);
      setMasterVolume(0);
    }
  }
  
  // Handle volume change
  const handleVolumeChange = (value) => {
    setMasterVolumeLocal(value);
    setIsMuted(false);
  };
  
  // Handle project save
  async function handleSave() {
    if (!project || saveInProgress) return;
    
    if (isNewProject) {
      // If this is a new project, we need to create it first
      try {
        await createProject({
          name: project.name,
          bpm: project.bpm,
          time_signature: project.time_signature
        });
        
        setIsNewProject(false);
        notifySuccess('Project created successfully');
      } catch (error) {
        console.error('Error creating project:', error);
        notifyError('Failed to create project');
      }
    } else {
      // Otherwise just save the existing project
      try {
        await saveProject();
        notifySuccess('Project saved successfully');
      } catch (error) {
        console.error('Error saving project:', error);
        notifyError('Failed to save project');
      }
    }
  }
  
  // Set up a new project
  const setupNewProject = () => {
    if (isSettingUpProject) return;
    
    setIsSettingUpProject(true);
    
    // Show modal to get project details
    openModal('projectSetup', {
      title: 'Create New Project',
      onConfirm: async (projectData) => {
        try {
          // Create temporary project in context
          updateProject({
            name: projectData.name,
            bpm: projectData.bpm,
            time_signature: projectData.timeSignature
          });
          
          // If the user wants to go straight to generation
          if (projectData.generateNow) {
            changeActivePanel('generator');
          }
          
          setIsSettingUpProject(false);
        } catch (error) {
          console.error('Error setting up project:', error);
          notifyError('Failed to set up project');
          setIsSettingUpProject(false);
          navigate('/projects');
        }
      },
      onCancel: () => {
        setIsSettingUpProject(false);
        navigate('/projects');
      }
    });
  };
  
  // Handle BPM change
  const handleBpmChange = (bpm) => {
    updateProject({ bpm });
  };
  
  // Return to projects list
  const handleBackToProjects = () => {
    if (isNewProject && !tracks.length) {
      // If this is a new project with no tracks, just navigate away
      navigate('/projects');
      return;
    }
    
    // Otherwise confirm if there are unsaved changes
    if (project && project.unsavedChanges) {
      openModal('confirmation', {
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save before leaving?',
        confirmLabel: 'Save & Leave',
        cancelLabel: 'Leave Without Saving',
        onConfirm: async () => {
          await saveProject();
          navigate('/projects');
        },
        onCancel: () => {
          navigate('/projects');
        }
      });
    } else {
      navigate('/projects');
    }
  };
  
  // Handle export
  const handleExport = () => {
    if (!project) return;
    
    openModal('exportOptions', {
      title: 'Export Project',
      project,
      onConfirm: (format) => {
        // Handle export here
        notifySuccess(`Exporting project as ${format}...`);
      }
    });
  };
  
  // Show loading state while project loads
  if (loading && !isNewProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold mb-2">Loading Project</h2>
          <p className="text-gray-400">Please wait while we load your project...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if no project loaded
  if (!project && !isNewProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-900 mx-auto mb-4 flex items-center justify-center">
            <Music size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-gray-400 mb-6">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="composer-page h-full flex flex-col overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-850 border-b border-gray-700">
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <button 
              className="mr-2 p-1 rounded hover:bg-gray-700"
              onClick={handleBackToProjects}
              aria-label="Back to projects"
            >
              <SkipBack size={20} />
            </button>
            <h1 className="text-lg font-semibold truncate max-w-xs">
              {project?.name || 'New Project'}
            </h1>
          </div>
          
          <div className="flex items-center ml-4 space-x-1">
            <Tooltip content="Save Project (Ctrl+S)">
              <Button
                variant="ghost"
                size="small"
                className="p-1.5"
                onClick={handleSave}
                disabled={saveInProgress}
              >
                {saveInProgress ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
              </Button>
            </Tooltip>
            
            <Tooltip content="Export">
              <Button
                variant="ghost"
                size="small"
                className="p-1.5"
                onClick={handleExport}
              >
                <Download size={20} />
              </Button>
            </Tooltip>
            
            <Tooltip content="Project Settings">
              <Button
                variant="ghost"
                size="small"
                className="p-1.5"
                onClick={() => {
                  openModal('projectSettings', {
                    project,
                    onSave: (updatedSettings) => {
                      updateProject(updatedSettings);
                    }
                  });
                }}
              >
                <Settings size={20} />
              </Button>
            </Tooltip>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* BPM control */}
          <div className="flex items-center mr-4">
            <Clock size={18} className="mr-2 text-gray-400" />
            <div className="relative w-20">
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                value={project?.bpm || 120}
                onChange={(e) => handleBpmChange(parseInt(e.target.value || 120))}
                min={40}
                max={240}
              />
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                BPM
              </span>
            </div>
          </div>
          
          {/* Transport controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="small"
              className="p-1.5"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </Button>
            
            <div className="text-sm text-gray-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          {/* Master volume */}
          <div className="flex items-center ml-4 w-32">
            <Button
              variant="ghost"
              size="small"
              className="p-1 mr-2"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>
            
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-grow"
            />
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div 
        className="h-8 bg-gray-850 border-b border-gray-700 relative"
        ref={timelineRef}
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        <div className="absolute inset-0 flex items-center">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className="absolute border-l border-gray-700 h-full flex items-center"
              style={{ left: `${i * 10}%` }}
            >
              <span className="text-xs text-gray-500 ml-1">
                {formatTime((duration / 10) * i)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
          style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
        ></div>
      </div>
      
      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - tracks, mixer, or generator */}
        <div className="flex-1 overflow-hidden border-r border-gray-700">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-700 bg-gray-850">
            <button
              className={`px-4 py-2 flex items-center ${activePanel === 'tracks' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
              onClick={() => changeActivePanel('tracks')}
            >
              <Layers size={16} className="mr-2" />
              <span>Tracks</span>
            </button>
            <button
              className={`px-4 py-2 flex items-center ${activePanel === 'mixer' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
              onClick={() => changeActivePanel('mixer')}
            >
              <Sliders size={16} className="mr-2" />
              <span>Mixer</span>
            </button>
            <button
              className={`px-4 py-2 flex items-center ${activePanel === 'generator' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
              onClick={() => changeActivePanel('generator')}
            >
              <Music size={16} className="mr-2" />
              <span>Generator</span>
            </button>
          </div>
          
          {/* Panel content */}
          <div className="h-full p-2 overflow-auto">
            {activePanel === 'tracks' && (
              <TrackList
                onTrackSelect={setSelectedTrackId}
                selectedTrackId={selectedTrackId}
              />
            )}
            
            {activePanel === 'mixer' && (
              <MixerPanel onTrackSelect={setSelectedTrackId} />
            )}
            
            {activePanel === 'generator' && (
              <GeneratorPanel projectId={project?.id} />
            )}
          </div>
        </div>
        
        {/* Right panel - track details or effects */}
        <div className="w-80 bg-gray-850 overflow-y-auto">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 flex-1 text-center ${activePanelTabs[activePanel] === 'details' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
              onClick={() => changePanelTab(activePanel, 'details')}
            >
              Details
            </button>
            <button
              className={`px-4 py-2 flex-1 text-center ${activePanelTabs[activePanel] === 'effects' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
              onClick={() => changePanelTab(activePanel, 'effects')}
            >
              Effects
            </button>
          </div>
          
          {/* Panel content */}
          <div className="p-3">
            {activePanelTabs[activePanel] === 'details' && (
              selectedTrackId ? (
                <TrackControls trackId={selectedTrackId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Layers size={48} className="text-gray-600 mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Track Selected</h3>
                  <p className="text-gray-400 mb-6">
                    Select a track to view and edit its details
                  </p>
                  <Button
                    variant="primary"
                    size="small"
                    icon={<PlusCircle size={16} />}
                    onClick={() => {
                      if (tracks.length > 0) {
                        setSelectedTrackId(tracks[0].id);
                      } else {
                        changeActivePanel('generator');
                      }
                    }}
                  >
                    {tracks.length > 0 ? 'Select a Track' : 'Generate Tracks'}
                  </Button>
                </div>
              )
            )}
            
            {activePanelTabs[activePanel] === 'effects' && (
              <EffectsPanel trackId={selectedTrackId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Composer;