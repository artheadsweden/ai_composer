import React, { useState } from 'react';
import { Volume2, Sliders, BarChart3, Save, Reset } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { useAudioContext } from '../../context/AudioContext';
import MixerTrack from './MixerTrack';
import Button from '../common/Button';
import Slider from '../common/Slider';
import Tooltip from '../common/Tooltip';

/**
 * MixerPanel component provides a full mixing console interface
 * with channel strips for all tracks and master output controls
 */
const MixerPanel = () => {
  const { project, tracks } = useProjectContext();
  const { isPlaying, setMasterVolume } = useAudioContext();
  
  const [masterVolume, setMasterVolumeState] = useState(80);
  const [showMeters, setShowMeters] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [view, setView] = useState('standard'); // standard, compact, expanded
  
  // Handle master volume change
  const handleMasterVolumeChange = (value) => {
    setMasterVolumeState(value);
    if (setMasterVolume) {
      setMasterVolume(value);
    }
  };
  
  // Reset all mixer settings to default
  const handleResetMixer = () => {
    if (window.confirm('Reset all mixer settings to default?')) {
      // Reset track volumes, pans, and effects
      console.log('Mixer reset requested');
      // This would be implemented in the project context
    }
  };
  
  // Save mixer preset
  const handleSavePreset = () => {
    const presetName = prompt('Enter a name for this mixer preset:');
    if (presetName && presetName.trim()) {
      console.log(`Save mixer preset: ${presetName}`);
      // This would be implemented in the project context
    }
  };
  
  // Toggle meter visibility
  const toggleMeters = () => {
    setShowMeters(!showMeters);
  };
  
  // Change view mode
  const changeView = (newView) => {
    setView(newView);
  };
  
  // Calculate track width based on view mode
  const getTrackWidth = () => {
    switch (view) {
      case 'compact':
        return 'w-16';
      case 'expanded':
        return 'w-48';
      case 'standard':
      default:
        return 'w-24';
    }
  };
  
  return (
    <div className="mixer-panel h-full flex flex-col rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
      {/* Mixer header with controls */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-750">
        <div className="flex items-center">
          <Volume2 size={18} className="mr-2 text-blue-400" />
          <h3 className="font-medium">Mixer</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View mode selector */}
          <div className="hidden sm:flex border border-gray-600 rounded-md overflow-hidden">
            <button 
              className={`px-2 py-1 text-xs ${view === 'compact' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => changeView('compact')}
            >
              Compact
            </button>
            <button 
              className={`px-2 py-1 text-xs ${view === 'standard' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => changeView('standard')}
            >
              Standard
            </button>
            <button 
              className={`px-2 py-1 text-xs ${view === 'expanded' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => changeView('expanded')}
            >
              Expanded
            </button>
          </div>
          
          {/* Toggle meters */}
          <Tooltip content={showMeters ? "Hide Meters" : "Show Meters"}>
            <Button
              variant="ghost"
              size="small"
              className="p-1"
              onClick={toggleMeters}
              icon={<BarChart3 size={18} className={showMeters ? "text-blue-400" : "text-gray-400"} />}
              aria-label={showMeters ? "Hide meters" : "Show meters"}
            />
          </Tooltip>
          
          {/* Save preset */}
          <Tooltip content="Save Mixer Preset">
            <Button
              variant="ghost"
              size="small"
              className="p-1"
              onClick={handleSavePreset}
              icon={<Save size={18} />}
              aria-label="Save mixer preset"
            />
          </Tooltip>
          
          {/* Reset mixer */}
          <Tooltip content="Reset Mixer">
            <Button
              variant="ghost"
              size="small"
              className="p-1"
              onClick={handleResetMixer}
              icon={<Reset size={18} />}
              aria-label="Reset mixer"
            />
          </Tooltip>
        </div>
      </div>
      
      {/* Mixer tracks area */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full p-2">
          {/* Track channel strips */}
          {tracks.length > 0 ? (
            tracks.map(track => (
              <MixerTrack
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => setSelectedTrackId(track.id)}
                showMeter={showMeters}
                isPlaying={isPlaying}
                className={`mx-1 ${getTrackWidth()}`}
                view={view}
              />
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-gray-400">No tracks to mix</p>
            </div>
          )}
          
          {/* Master channel */}
          <div className={`mx-1 border-l border-gray-700 pl-2 ${view === 'compact' ? 'w-20' : 'w-32'}`}>
            <div className="flex flex-col h-full">
              <div className="text-center font-medium mb-2 truncate">
                Master
              </div>
              
              {/* Master fader */}
              <div className="flex-1 flex flex-col">
                {showMeters && (
                  <div className="flex-1 mx-auto w-6 bg-gray-700 rounded overflow-hidden mb-2 relative">
                    {/* Simulated master level meter */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-100"
                      style={{ 
                        height: `${isPlaying ? Math.min(80 + Math.random() * 20, 100) : 0}%`,
                        opacity: 0.8 
                      }}
                    ></div>
                    
                    {/* Level markings */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
                      <div className="w-full h-px bg-red-500 opacity-50"></div>
                      <div className="w-full h-px bg-yellow-500 opacity-50"></div>
                      <div className="w-full h-px bg-gray-400 opacity-50"></div>
                    </div>
                  </div>
                )}
                
                {/* Volume slider - vertical orientation */}
                <div className="flex-1 flex items-center justify-center min-h-32">
                  <Slider
                    vertical
                    min={0}
                    max={100}
                    value={masterVolume}
                    onChange={handleMasterVolumeChange}
                    progressColor="bg-blue-500"
                    className="h-full"
                  />
                </div>
                
                {/* Volume value */}
                <div className="text-xs text-center mt-2 text-gray-300">
                  {masterVolume}
                </div>
                
                {/* Master label */}
                <div className="p-1 text-xs truncate text-center">
                  Output
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixerPanel;