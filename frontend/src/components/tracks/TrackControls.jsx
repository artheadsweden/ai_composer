import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Edit3, 
  Sliders,
  PanTool,
  Music,
  Layers
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { useAudioContext } from '../../context/AudioContext';
import Slider from '../common/Slider';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

/**
 * TrackControls component provides advanced controls for a selected track
 * including volume, pan, effects, and track-level actions
 */
const TrackControls = ({ trackId }) => {
  const { tracks, updateTrack, removeTrack, duplicateTrack } = useProjectContext();
  
  const [track, setTrack] = useState(null);
  const [activeTab, setActiveTab] = useState('main'); // main, effects, automation
  
  // Find the track data
  useEffect(() => {
    if (trackId) {
      const currentTrack = tracks.find(t => t.id === trackId);
      setTrack(currentTrack || null);
    } else {
      setTrack(null);
    }
  }, [trackId, tracks]);
  
  // Handle track not found
  if (!track) {
    return (
      <div className="track-controls bg-gray-800 p-4 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Select a track to view controls</p>
      </div>
    );
  }
  
  // Handle volume change
  const handleVolumeChange = (value) => {
    updateTrack(track.id, { volume: value });
  };
  
  // Handle pan change
  const handlePanChange = (value) => {
    // Pan is not yet implemented in the track data structure
    // This would be added to the backend model
    console.log(`Pan changed to ${value}`);
  };
  
  // Toggle mute state
  const handleMuteToggle = () => {
    updateTrack(track.id, { muted: !track.muted });
  };
  
  // Toggle solo state
  const handleSoloToggle = () => {
    updateTrack(track.id, { solo: !track.solo });
  };
  
  // Handle track renaming
  const handleRename = () => {
    const newName = prompt('Enter a new name for the track:', track.name);
    if (newName && newName.trim() !== '') {
      updateTrack(track.id, { name: newName.trim() });
    }
  };
  
  // Handle track removal (with confirmation)
  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to delete the track "${track.name}"?`)) {
      removeTrack(track.id);
    }
  };
  
  // Handle track duplication
  const handleDuplicate = () => {
    duplicateTrack(track.id);
  };
  
  // Handle color change
  const handleColorChange = (color) => {
    updateTrack(track.id, { color });
  };
  
  // Available colors for color picker
  const availableColors = [
    '#FF5A5F', '#3D5A80', '#8AC926', 
    '#FFCA3A', '#6A4C93', '#4D908E', 
    '#F9844A', '#277DA1'
  ];
  
  // Render main controls tab
  const renderMainControls = () => (
    <div className="space-y-4">
      {/* Track info */}
      <div className="flex items-center mb-4">
        <div 
          className="w-4 h-4 rounded-full mr-2"
          style={{ backgroundColor: track.color }}
        ></div>
        <h3 className="font-medium text-lg">{track.name}</h3>
        <Button 
          variant="ghost" 
          size="small"
          className="p-1 ml-2" 
          icon={<Edit3 size={14} />}
          onClick={handleRename}
          aria-label="Rename track"
        />
      </div>
      
      {/* Volume control */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Volume</label>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="small"
            className="p-1 mr-2" 
            onClick={handleMuteToggle}
            aria-label={track.muted ? "Unmute" : "Mute"}
          >
            {track.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          
          <Slider
            min={0}
            max={100}
            value={track.volume}
            onChange={handleVolumeChange}
            className="flex-grow"
            progressColor={track.muted ? "bg-gray-600" : "bg-blue-500"}
            valueSuffix="%"
          />
        </div>
      </div>
      
      {/* Pan control */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Pan</label>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="small"
            className="p-1 mr-2" 
            onClick={() => handlePanChange(0)}
            aria-label="Center pan"
          >
            <PanTool size={18} />
          </Button>
          
          <Slider
            min={-100}
            max={100}
            value={0} // Default pan (would come from track data)
            onChange={handlePanChange}
            className="flex-grow"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>L</span>
          <span>Center</span>
          <span>R</span>
        </div>
      </div>
      
      {/* Color selection */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Track Color</label>
        <div className="flex flex-wrap gap-2">
          {availableColors.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded-full border-2 ${track.color === color ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>
      
      {/* Advanced options */}
      <div className="pt-4 mt-4 border-t border-gray-700">
        <div className="flex justify-between">
          <Tooltip content="Duplicate Track">
            <Button
              variant="ghost"
              size="small"
              icon={<Copy size={16} />}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
          </Tooltip>
          
          <Tooltip content="Delete Track">
            <Button
              variant="ghost"
              size="small"
              className="text-red-400 hover:text-red-300"
              icon={<Trash2 size={16} />}
              onClick={handleRemove}
            >
              Delete
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
  
  // Render effects tab
  const renderEffectsControls = () => (
    <div className="space-y-4">
      <div className="text-center text-gray-400 py-8">
        <Sliders size={24} className="mx-auto mb-2" />
        <p>Effects are not yet implemented</p>
        <p className="text-sm">This feature will be available soon</p>
      </div>
      
      {/* Placeholder effect slots */}
      <div className="border border-dashed border-gray-700 rounded-lg p-4 text-center">
        <button className="text-blue-500 hover:text-blue-400">
          + Add Effect
        </button>
      </div>
    </div>
  );
  
  // Render automation tab
  const renderAutomationControls = () => (
    <div className="space-y-4">
      <div className="text-center text-gray-400 py-8">
        <Layers size={24} className="mx-auto mb-2" />
        <p>Automation is not yet implemented</p>
        <p className="text-sm">This feature will be available soon</p>
      </div>
    </div>
  );
  
  return (
    <div className="track-controls bg-gray-800 rounded-lg overflow-hidden">
      {/* Tabs navigation */}
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 flex-1 text-center text-sm font-medium ${activeTab === 'main' ? 'bg-gray-750 text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('main')}
        >
          Main
        </button>
        <button
          className={`px-4 py-2 flex-1 text-center text-sm font-medium ${activeTab === 'effects' ? 'bg-gray-750 text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('effects')}
        >
          Effects
        </button>
        <button
          className={`px-4 py-2 flex-1 text-center text-sm font-medium ${activeTab === 'automation' ? 'bg-gray-750 text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('automation')}
        >
          Automation
        </button>
      </div>
      
      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'main' && renderMainControls()}
        {activeTab === 'effects' && renderEffectsControls()}
        {activeTab === 'automation' && renderAutomationControls()}
      </div>
    </div>
  );
};

export default TrackControls;