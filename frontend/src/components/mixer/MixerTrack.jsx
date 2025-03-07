import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Headphones, Sliders, PanTool, CornerDownLeft } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import Slider from '../common/Slider';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

/**
 * MixerTrack component represents a single channel strip in the mixer
 * with volume fader, pan control, meters, and effect sends
 */
const MixerTrack = ({
  track,
  isSelected = false,
  onSelect,
  showMeter = true,
  isPlaying = false,
  className = '',
  view = 'standard'  // compact, standard, expanded
}) => {
  const { updateTrack } = useProjectContext();
  const [meterLevel, setMeterLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [showEffects, setShowEffects] = useState(false);
  const meterAnimationRef = useRef(null);
  
  // Simulate audio levels for the meter
  useEffect(() => {
    if (isPlaying && showMeter) {
      const simulateLevel = () => {
        // Base level on track volume
        const baseLevel = (track.volume / 100) * 0.7; 
        
        // Add some randomness to simulate actual audio
        const randomFactor = Math.random() * 0.3;
        
        // Calculate level (0-1)
        const newLevel = Math.min(baseLevel + randomFactor, 1);
        
        // Update meter level 
        setMeterLevel(newLevel);
        
        // Update peak level if current level is higher
        if (newLevel > peakLevel) {
          setPeakLevel(newLevel);
        }
        
        // Schedule next update
        meterAnimationRef.current = requestAnimationFrame(simulateLevel);
      };
      
      simulateLevel();
      
      return () => {
        if (meterAnimationRef.current) {
          cancelAnimationFrame(meterAnimationRef.current);
        }
      };
    } else {
      // When not playing, gradually reduce the meter level to zero
      setMeterLevel(0);
    }
  }, [isPlaying, showMeter, track.volume, peakLevel]);
  
  // Reset peak hold after 2 seconds of no new peaks
  useEffect(() => {
    if (peakLevel > 0) {
      const timeout = setTimeout(() => {
        setPeakLevel(0);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [peakLevel]);
  
  // Handle volume change
  const handleVolumeChange = (value) => {
    updateTrack(track.id, { volume: value });
  };
  
  // Handle mute toggle
  const handleMuteToggle = () => {
    updateTrack(track.id, { muted: !track.muted });
  };
  
  // Handle solo toggle
  const handleSoloToggle = () => {
    updateTrack(track.id, { solo: !track.solo });
  };
  
  // Handle track selection
  const handleClick = () => {
    if (onSelect) {
      onSelect(track.id);
    }
  };
  
  // Toggle effects panel
  const toggleEffects = () => {
    setShowEffects(!showEffects);
  };
  
  // Get background style for meter
  const getMeterBackgroundStyle = (level) => {
    // Color gradient based on level
    if (level > 0.95) return 'bg-red-500';  // Clipping
    if (level > 0.8) return 'bg-yellow-500';  // Near clipping
    return 'bg-green-500';  // Normal level
  };
  
  // Render compact view
  const renderCompactView = () => (
    <div className="flex flex-col h-full">
      <div className="text-center text-xs font-medium mb-1 truncate" title={track.name}>
        {track.name}
      </div>
      
      {/* Track color indicator */}
      <div 
        className="h-1 w-full rounded-sm mb-1"
        style={{ backgroundColor: track.color }}
      ></div>
      
      {/* Volume meter */}
      {showMeter && (
        <div className="flex-1 mx-auto w-4 bg-gray-700 rounded overflow-hidden mb-1 relative">
          {/* Level meter */}
          <div 
            className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${getMeterBackgroundStyle(meterLevel)}`}
            style={{ height: `${meterLevel * 100}%`, opacity: 0.8 }}
          ></div>
          
          {/* Peak indicator */}
          {peakLevel > 0 && (
            <div 
              className={`absolute h-px w-full ${peakLevel > 0.95 ? 'bg-red-500' : 'bg-white'}`}
              style={{ bottom: `${peakLevel * 100}%` }}
            ></div>
          )}
        </div>
      )}
      
      {/* Volume slider - vertical orientation */}
      <div className="flex-1 flex items-center justify-center min-h-24">
        <Slider
          vertical
          min={0}
          max={100}
          value={track.volume}
          onChange={handleVolumeChange}
          progressColor={track.muted ? "bg-gray-600" : "bg-blue-500"}
          className="h-full"
        />
      </div>
      
      {/* Mute/Solo buttons */}
      <div className="flex justify-center space-x-1 mt-1">
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.muted ? 'bg-red-900 text-red-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleMuteToggle}
          aria-label={track.muted ? "Unmute" : "Mute"}
        >
          <VolumeX size={12} />
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.solo ? 'bg-green-900 text-green-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleSoloToggle}
          aria-label={track.solo ? "Unsolo" : "Solo"}
        >
          <Headphones size={12} />
        </Button>
      </div>
    </div>
  );
  
  // Render standard view
  const renderStandardView = () => (
    <div className="flex flex-col h-full">
      <div className="text-center font-medium mb-1 truncate" title={track.name}>
        {track.name}
      </div>
      
      {/* Track color indicator */}
      <div 
        className="h-1 w-full rounded-sm mb-2"
        style={{ backgroundColor: track.color }}
      ></div>
      
      {/* Pan knob (simple version) */}
      <div className="flex justify-center mb-2">
        <div className="w-12 h-12 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-gray-300">0</div>
          </div>
          <div 
            className="w-1 h-6 bg-white rounded-full transform rotate-0 origin-center"
            style={{ transform: `rotate(${0}deg)` }}
          ></div>
        </div>
      </div>
      
      {/* Volume meter */}
      {showMeter && (
        <div className="flex-1 mx-auto w-6 bg-gray-700 rounded overflow-hidden mb-2 relative">
          {/* Level meter */}
          <div 
            className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${getMeterBackgroundStyle(meterLevel)}`}
            style={{ height: `${meterLevel * 100}%`, opacity: 0.8 }}
          ></div>
          
          {/* Peak indicator */}
          {peakLevel > 0 && (
            <div 
              className={`absolute h-px w-full ${peakLevel > 0.95 ? 'bg-red-500' : 'bg-white'}`}
              style={{ bottom: `${peakLevel * 100}%` }}
            ></div>
          )}
          
          {/* Level markings */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
            <div className="w-full h-px bg-red-500 opacity-30"></div>
            <div className="w-full h-px bg-yellow-500 opacity-30"></div>
            <div className="w-full h-px bg-gray-400 opacity-30"></div>
          </div>
        </div>
      )}
      
      {/* Volume slider - vertical orientation */}
      <div className="flex-1 flex items-center justify-center min-h-32">
        <Slider
          vertical
          min={0}
          max={100}
          value={track.volume}
          onChange={handleVolumeChange}
          progressColor={track.muted ? "bg-gray-600" : "bg-blue-500"}
          className="h-full"
        />
      </div>
      
      {/* Volume value */}
      <div className="text-xs text-center mt-1 text-gray-300">
        {track.volume}
      </div>
      
      {/* Mute/Solo buttons */}
      <div className="flex justify-center space-x-1 mt-1">
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.muted ? 'bg-red-900 text-red-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleMuteToggle}
          aria-label={track.muted ? "Unmute" : "Mute"}
        >
          <VolumeX size={14} />
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.solo ? 'bg-green-900 text-green-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleSoloToggle}
          aria-label={track.solo ? "Unsolo" : "Solo"}
        >
          <Headphones size={14} />
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className="p-1 text-gray-400 hover:text-white"
          onClick={toggleEffects}
          aria-label="Track effects"
        >
          <Sliders size={14} />
        </Button>
      </div>
    </div>
  );
  
  // Render expanded view
  const renderExpandedView = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center mb-2">
        <div 
          className="w-3 h-3 rounded-full mr-2"
          style={{ backgroundColor: track.color }}
        ></div>
        <div className="font-medium truncate flex-1" title={track.name}>
          {track.name}
        </div>
      </div>
      
      {/* Pan control */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Pan</span>
          <span>0</span>
        </div>
        <div className="flex items-center">
          <span className="text-xs mr-1">L</span>
          <Slider
            min={-100}
            max={100}
            value={0}
            onChange={() => {}}
            className="flex-1"
          />
          <span className="text-xs ml-1">R</span>
        </div>
      </div>
      
      {/* Volume and meter section */}
      <div className="flex flex-1">
        {/* Level meter */}
        {showMeter && (
          <div className="w-6 bg-gray-700 rounded overflow-hidden mr-2 relative">
            {/* Level meter */}
            <div 
              className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${getMeterBackgroundStyle(meterLevel)}`}
              style={{ height: `${meterLevel * 100}%`, opacity: 0.8 }}
            ></div>
            
            {/* Peak indicator */}
            {peakLevel > 0 && (
              <div 
                className={`absolute h-px w-full ${peakLevel > 0.95 ? 'bg-red-500' : 'bg-white'}`}
                style={{ bottom: `${peakLevel * 100}%` }}
              ></div>
            )}
            
            {/* Level markings */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
              <div className="w-full h-px bg-red-500 opacity-30"></div>
              <div className="w-full h-px bg-yellow-500 opacity-30"></div>
              <div className="w-full h-px bg-gray-400 opacity-30"></div>
            </div>
          </div>
        )}
        
        {/* Volume fader section */}
        <div className="flex-1 flex flex-col">
          {/* Effect sends (placeholders) */}
          <div className="mb-2">
            <div className="text-xs text-gray-400 mb-1">Send 1</div>
            <Slider
              min={0}
              max={100}
              value={0}
              onChange={() => {}}
              height="h-1"
              className="mb-2"
            />
            
            <div className="text-xs text-gray-400 mb-1">Send 2</div>
            <Slider
              min={0}
              max={100}
              value={0}
              onChange={() => {}}
              height="h-1"
            />
          </div>
          
          {/* Volume slider */}
          <div className="flex-1 flex flex-col min-h-32">
            <div className="flex-1">
              <Slider
                vertical
                min={0}
                max={100}
                value={track.volume}
                onChange={handleVolumeChange}
                progressColor={track.muted ? "bg-gray-600" : "bg-blue-500"}
                className="h-full"
              />
            </div>
            
            <div className="text-xs text-center mt-1 text-gray-300">
              {track.volume}
            </div>
          </div>
        </div>
      </div>
      
      {/* Control buttons */}
      <div className="grid grid-cols-3 gap-1 mt-2">
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.muted ? 'bg-red-900 text-red-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleMuteToggle}
        >
          <VolumeX size={14} className="mr-1" />
          <span className="text-xs">Mute</span>
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className={`p-1 ${track.solo ? 'bg-green-900 text-green-300' : 'text-gray-400 hover:text-white'}`}
          onClick={handleSoloToggle}
        >
          <Headphones size={14} className="mr-1" />
          <span className="text-xs">Solo</span>
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className="p-1 text-gray-400 hover:text-white"
          onClick={toggleEffects}
        >
          <Sliders size={14} className="mr-1" />
          <span className="text-xs">FX</span>
        </Button>
      </div>
    </div>
  );
  
  return (
    <div 
      className={`mixer-track bg-gray-750 border border-gray-700 rounded-md p-2 ${isSelected ? 'border-blue-500' : 'hover:border-gray-600'} ${className}`}
      onClick={handleClick}
    >
      {view === 'compact' && renderCompactView()}
      {view === 'standard' && renderStandardView()}
      {view === 'expanded' && renderExpandedView()}
      
      {/* Effects panel (conditionally rendered) */}
      {showEffects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Effects: {track.name}
              </h3>
              <Button
                variant="ghost"
                size="small"
                className="p-1"
                onClick={toggleEffects}
              >
                &times;
              </Button>
            </div>
            
            <div className="text-center py-8 text-gray-400">
              <Sliders size={24} className="mx-auto mb-2" />
              <p>Effects are not yet implemented</p>
              <p className="text-sm">This feature will be available soon</p>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={toggleEffects}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MixerTrack;