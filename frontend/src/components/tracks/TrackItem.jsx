import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Headphones, Settings, MoreHorizontal } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { useAudioContext } from '../../context/AudioContext';
import WaveformDisplay from './WaveformDisplay';
import Tooltip from '../common/Tooltip';

/**
 * TrackItem component represents a single audio track in the arrangement view
 * Includes waveform visualization and track controls
 */
const TrackItem = ({ 
  track, 
  index, 
  isSelected = false,
  onSelect
}) => {
  const { updateTrack, duplicateTrack, removeTrack } = useProjectContext();
  const { isPlaying } = useAudioContext();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const trackRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Handle track selection
  const handleClick = (e) => {
    if (!isSelected) {
      onSelect(track.id);
    }
  };

  // Toggle mute state
  const handleMuteToggle = (e) => {
    e.stopPropagation();
    updateTrack(track.id, { muted: !track.muted });
  };

  // Toggle solo state
  const handleSoloToggle = (e) => {
    e.stopPropagation();
    updateTrack(track.id, { solo: !track.solo });
  };

  // Update volume level
  const handleVolumeChange = (e) => {
    updateTrack(track.id, { volume: parseInt(e.target.value) });
  };

  // Handle right-click for context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = trackRef.current.getBoundingClientRect();
    setContextMenuPosition({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    });
    setShowContextMenu(true);
  };

  // Handle context menu actions
  const handleDuplicate = () => {
    duplicateTrack(track.id);
    setShowContextMenu(false);
  };

  const handleRemove = () => {
    removeTrack(track.id);
    setShowContextMenu(false);
  };

  const handleRename = () => {
    const newName = prompt('Enter a new name for the track:', track.name);
    if (newName && newName.trim() !== '') {
      updateTrack(track.id, { name: newName.trim() });
    }
    setShowContextMenu(false);
  };

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContextMenu]);

  // Keyboard shortcuts for track actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSelected) return;
      
      // M key for mute toggle
      if (e.key === 'm') {
        updateTrack(track.id, { muted: !track.muted });
      }
      
      // S key for solo toggle
      if (e.key === 's') {
        updateTrack(track.id, { solo: !track.solo });
      }
      
      // Delete key for track removal
      if (e.key === 'Delete') {
        removeTrack(track.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelected, track.id, track.muted, track.solo, updateTrack, removeTrack]);

  return (
    <div 
      className={`track-item flex h-24 border-b border-gray-700 ${isSelected ? 'bg-gray-750' : 'bg-gray-800 hover:bg-gray-750'}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      ref={trackRef}
      data-track-id={track.id}
      data-testid={`track-item-${track.id}`}
    >
      {/* Track header */}
      <div className="track-header w-48 p-2 border-r border-gray-700 flex flex-col justify-between bg-gray-850">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: track.color }}
              aria-hidden="true"
            ></div>
            <span className="font-medium text-sm truncate" title={track.name}>
              {track.name}
            </span>
          </div>
          
          <button 
            className="text-gray-400 hover:text-white p-1"
            onClick={() => {/* Open track settings */}}
            aria-label="Track settings"
          >
            <Tooltip content="Track Settings">
              <Settings size={16} />
            </Tooltip>
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <Tooltip content={track.muted ? "Unmute" : "Mute"}>
              <button 
                className={`p-1 rounded ${track.muted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={handleMuteToggle}
                aria-label={track.muted ? "Unmute track" : "Mute track"}
                aria-pressed={track.muted}
              >
                {track.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </Tooltip>
            
            <Tooltip content={track.solo ? "Unsolo" : "Solo"}>
              <button 
                className={`p-1 rounded ${track.solo ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={handleSoloToggle}
                aria-label={track.solo ? "Unsolo track" : "Solo track"}
                aria-pressed={track.solo}
              >
                <Headphones size={16} />
              </button>
            </Tooltip>
          </div>
          
          <div className="flex items-center">
            <input 
              type="range"
              min="0"
              max="100"
              value={track.volume}
              onChange={handleVolumeChange}
              className="w-16 h-2"
              aria-label={`Track volume: ${track.volume}%`}
            />
            <span className="text-xs text-gray-400 ml-1 w-6">{track.volume}</span>
          </div>
        </div>
      </div>
      
      {/* Track content area with waveform */}
      <div className="flex-1 relative">
        <WaveformDisplay 
          audioBuffer={track.audioBuffer}
          color={track.color}
          isPlaying={isPlaying && !track.muted}
          gain={track.volume / 100}
        />
        
        {/* Drag areas for track timing adjustment */}
        <div className="absolute left-0 top-0 w-4 h-full cursor-ew-resize opacity-0 hover:opacity-50 bg-white" 
             title="Adjust track start"
        />
        <div className="absolute right-0 top-0 w-4 h-full cursor-ew-resize opacity-0 hover:opacity-50 bg-white" 
             title="Adjust track end"
        />
      </div>
      
      {/* Context menu */}
      {showContextMenu && (
        <div 
          ref={contextMenuRef}
          className="absolute bg-gray-900 border border-gray-700 rounded shadow-lg z-50 w-48"
          style={{ 
            left: `${contextMenuPosition.x}px`, 
            top: `${contextMenuPosition.y}px` 
          }}
        >
          <ul className="py-1">
            <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer" onClick={handleRename}>
              Rename Track
            </li>
            <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer" onClick={handleDuplicate}>
              Duplicate Track
            </li>
            <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer">
              Add Effect
            </li>
            <li className="px-4 py-2 hover:bg-gray-800 cursor-pointer">
              Export Track
            </li>
            <li className="border-t border-gray-700 mt-1 px-4 py-2 hover:bg-red-900 text-red-400 cursor-pointer" onClick={handleRemove}>
              Delete Track
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrackItem;