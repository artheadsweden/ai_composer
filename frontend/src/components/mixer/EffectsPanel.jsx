import React, { useState } from 'react';
import { Sliders, PlusCircle, XCircle, ChevronDown, ChevronUp, RotateCcw, Save } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import Button from '../common/Button';
import Slider from '../common/Slider';
import Select from '../common/Select';
import Tooltip from '../common/Tooltip';

/**
 * Effect types and their parameters
 */
const EFFECT_TYPES = {
  eq: {
    name: 'Equalizer',
    params: [
      { id: 'low', name: 'Low', min: -12, max: 12, default: 0, unit: 'dB' },
      { id: 'mid', name: 'Mid', min: -12, max: 12, default: 0, unit: 'dB' },
      { id: 'high', name: 'High', min: -12, max: 12, default: 0, unit: 'dB' }
    ]
  },
  compressor: {
    name: 'Compressor',
    params: [
      { id: 'threshold', name: 'Threshold', min: -60, max: 0, default: -20, unit: 'dB' },
      { id: 'ratio', name: 'Ratio', min: 1, max: 20, default: 4, unit: ':1' },
      { id: 'attack', name: 'Attack', min: 0, max: 100, default: 20, unit: 'ms' },
      { id: 'release', name: 'Release', min: 50, max: 500, default: 200, unit: 'ms' }
    ]
  },
  reverb: {
    name: 'Reverb',
    params: [
      { id: 'size', name: 'Size', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'damping', name: 'Damping', min: 0, max: 100, default: 40, unit: '%' },
      { id: 'wet', name: 'Wet', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'dry', name: 'Dry', min: 0, max: 100, default: 70, unit: '%' }
    ]
  },
  delay: {
    name: 'Delay',
    params: [
      { id: 'time', name: 'Time', min: 10, max: 1000, default: 250, unit: 'ms' },
      { id: 'feedback', name: 'Feedback', min: 0, max: 100, default: 40, unit: '%' },
      { id: 'mix', name: 'Mix', min: 0, max: 100, default: 30, unit: '%' }
    ]
  },
  distortion: {
    name: 'Distortion',
    params: [
      { id: 'drive', name: 'Drive', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'tone', name: 'Tone', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'mix', name: 'Mix', min: 0, max: 100, default: 50, unit: '%' }
    ]
  }
};

/**
 * Individual effect component with parameters
 */
const Effect = ({ effect, onUpdate, onRemove, index }) => {
  const [expanded, setExpanded] = useState(true);
  const effectType = EFFECT_TYPES[effect.type];
  
  // Toggle expand/collapse
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Update effect parameter
  const updateParam = (paramId, value) => {
    const updatedParams = { ...effect.params, [paramId]: value };
    onUpdate(index, { ...effect, params: updatedParams });
  };
  
  // Reset all parameters to default
  const resetParams = () => {
    const defaultParams = {};
    effectType.params.forEach(param => {
      defaultParams[param.id] = param.default;
    });
    
    onUpdate(index, { ...effect, params: defaultParams });
  };
  
  return (
    <div className="effect-item bg-gray-750 border border-gray-700 rounded mb-2 overflow-hidden">
      {/* Effect header */}
      <div 
        className="py-2 px-3 bg-gray-700 flex items-center justify-between cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-center">
          <Sliders size={16} className="mr-2 text-blue-400" />
          <span className="font-medium">{effectType.name}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Tooltip content="Remove Effect">
            <button
              className="p-1 text-gray-400 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); onRemove(index); }}
              aria-label="Remove effect"
            >
              <XCircle size={14} />
            </button>
          </Tooltip>
          
          <button className="p-1 text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      
      {/* Effect parameters */}
      {expanded && (
        <div className="p-3 space-y-3">
          {effectType.params.map((param) => (
            <div key={param.id}>
              <div className="flex justify-between text-sm mb-1">
                <label className="text-gray-300">{param.name}</label>
                <span className="text-gray-400">
                  {effect.params[param.id] || param.default}{param.unit}
                </span>
              </div>
              
              <Slider
                min={param.min}
                max={param.max}
                value={effect.params[param.id] || param.default}
                onChange={(value) => updateParam(param.id, value)}
              />
            </div>
          ))}
          
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="small"
              icon={<RotateCcw size={14} />}
              onClick={resetParams}
              className="text-xs"
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * EffectsPanel component provides interface for managing audio effects
 * for a selected track, with support for multiple effect chains
 */
const EffectsPanel = ({ trackId }) => {
  const { tracks, updateTrack } = useProjectContext();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [effects, setEffects] = useState([]);
  const [presetName, setPresetName] = useState('');
  
  // Effect options for the dropdown
  const effectOptions = Object.keys(EFFECT_TYPES).map(type => ({
    value: type,
    label: EFFECT_TYPES[type].name
  }));
  
  // Load track data when trackId changes
  React.useEffect(() => {
    if (trackId) {
      const track = tracks.find(t => t.id === trackId);
      setSelectedTrack(track);
      
      // Initialize effects from track or empty array
      setEffects(track?.effects || []);
    } else {
      setSelectedTrack(null);
      setEffects([]);
    }
  }, [trackId, tracks]);
  
  // Add a new effect
  const addEffect = (effectType) => {
    // Create default params for the effect
    const params = {};
    EFFECT_TYPES[effectType].params.forEach(param => {
      params[param.id] = param.default;
    });
    
    const newEffect = {
      id: `effect-${Date.now()}`,
      type: effectType,
      params,
      bypass: false
    };
    
    const updatedEffects = [...effects, newEffect];
    setEffects(updatedEffects);
    
    // Update track with new effects
    if (selectedTrack) {
      updateTrack(selectedTrack.id, { effects: updatedEffects });
    }
  };
  
  // Update an effect
  const updateEffect = (index, updatedEffect) => {
    const updatedEffects = [...effects];
    updatedEffects[index] = updatedEffect;
    
    setEffects(updatedEffects);
    
    // Update track with modified effects
    if (selectedTrack) {
      updateTrack(selectedTrack.id, { effects: updatedEffects });
    }
  };
  
  // Remove an effect
  const removeEffect = (index) => {
    const updatedEffects = effects.filter((_, i) => i !== index);
    setEffects(updatedEffects);
    
    // Update track with remaining effects
    if (selectedTrack) {
      updateTrack(selectedTrack.id, { effects: updatedEffects });
    }
  };
  
  // Save effects as a preset
  const savePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    
    // In a real implementation, this would save to a preset database
    console.log('Saving preset:', presetName, effects);
    
    // Reset preset name
    setPresetName('');
  };
  
  // Handle effect type selection
  const handleEffectTypeSelect = (effectType) => {
    addEffect(effectType);
  };
  
  // If no track is selected
  if (!selectedTrack) {
    return (
      <div className="effects-panel bg-gray-800 rounded-lg p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <Sliders size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-gray-400">Select a track to view effects</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="effects-panel bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Panel header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-750">
        <div className="flex items-center">
          <Sliders size={18} className="mr-2 text-blue-400" />
          <h3 className="font-medium">Effects: {selectedTrack.name}</h3>
        </div>
      </div>
      
      {/* Effects list */}
      <div className="flex-1 overflow-y-auto p-3">
        {effects.length > 0 ? (
          <div className="effects-list">
            {effects.map((effect, index) => (
              <Effect
                key={effect.id || index}
                effect={effect}
                index={index}
                onUpdate={updateEffect}
                onRemove={removeEffect}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">No effects added yet</p>
            <p className="text-sm text-gray-500">
              Add an effect using the selector below
            </p>
          </div>
        )}
      </div>
      
      {/* Add effect and presets */}
      <div className="p-3 border-t border-gray-700 bg-gray-750">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Add Effect
          </label>
          <div className="flex">
            <Select
              options={effectOptions}
              placeholder="Select an effect"
              className="flex-1 mr-2"
              onChange={handleEffectTypeSelect}
            />
            
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                // This would open the effect selection dropdown
                // but we're handling it in the Select onChange
              }}
              icon={<PlusCircle size={16} />}
              aria-label="Add effect"
            />
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Save as Preset
          </label>
          <div className="flex">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="flex-1 bg-gray-700 border border-gray-600 rounded mr-2 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <Button
              variant="secondary"
              size="small"
              onClick={savePreset}
              disabled={!presetName.trim() || effects.length === 0}
              icon={<Save size={16} />}
              aria-label="Save preset"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel;