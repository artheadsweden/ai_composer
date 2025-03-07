import React from 'react';
import { Sliders, Clock, BarChart3, Music } from 'lucide-react';
import Slider from '../common/Slider';
import Select from '../common/Select';
import Tooltip from '../common/Tooltip';

/**
 * ParameterControls component provides controls for adjusting 
 * AI music generation parameters like tempo, complexity, mood, etc.
 */
const ParameterControls = ({
  parameters,
  onParameterChange,
  className = ''
}) => {
  // Default parameters if none provided
  const params = parameters || {
    tempo: 120,
    complexity: 50,
    mood: 'energetic',
    structure: 'verse_chorus',
    key: 'C',
    scale: 'major'
  };
  
  // Musical key options
  const keyOptions = [
    { value: 'C', label: 'C' },
    { value: 'C#', label: 'C#' },
    { value: 'D', label: 'D' },
    { value: 'D#', label: 'D#' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'F#', label: 'F#' },
    { value: 'G', label: 'G' },
    { value: 'G#', label: 'G#' },
    { value: 'A', label: 'A' },
    { value: 'A#', label: 'A#' },
    { value: 'B', label: 'B' }
  ];
  
  // Scale options
  const scaleOptions = [
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: 'dorian', label: 'Dorian' },
    { value: 'phrygian', label: 'Phrygian' },
    { value: 'lydian', label: 'Lydian' },
    { value: 'mixolydian', label: 'Mixolydian' },
    { value: 'locrian', label: 'Locrian' },
    { value: 'blues', label: 'Blues' },
    { value: 'pentatonic', label: 'Pentatonic' }
  ];
  
  // Mood options
  const moodOptions = [
    { value: 'energetic', label: 'Energetic', icon: '⚡' },
    { value: 'relaxed', label: 'Relaxed', icon: '😌' },
    { value: 'melancholic', label: 'Melancholic', icon: '😔' },
    { value: 'happy', label: 'Happy', icon: '😊' },
    { value: 'dark', label: 'Dark', icon: '🖤' },
    { value: 'romantic', label: 'Romantic', icon: '❤️' },
    { value: 'dreamy', label: 'Dreamy', icon: '💭' },
    { value: 'intense', label: 'Intense', icon: '🔥' }
  ];
  
  // Structure options
  const structureOptions = [
    { value: 'verse_chorus', label: 'Verse-Chorus' },
    { value: 'verse_chorus_bridge', label: 'Verse-Chorus-Bridge' },
    { value: 'aaba', label: 'AABA Form' },
    { value: 'abac', label: 'ABAC Form' },
    { value: 'through_composed', label: 'Through-composed' },
    { value: 'loop_based', label: 'Loop-based' },
    { value: 'ambient', label: 'Ambient (no sections)' }
  ];
  
  // Handle parameter changes
  const handleChange = (parameter, value) => {
    if (onParameterChange) {
      onParameterChange(parameter, value);
    }
  };
  
  // Convert BPM to tempo description
  const getTempoDescription = (bpm) => {
    if (bpm < 60) return 'Very Slow';
    if (bpm < 80) return 'Slow';
    if (bpm < 100) return 'Moderate';
    if (bpm < 120) return 'Medium';
    if (bpm < 140) return 'Moderately Fast';
    if (bpm < 160) return 'Fast';
    return 'Very Fast';
  };
  
  // Convert complexity percentage to description
  const getComplexityDescription = (complexity) => {
    if (complexity < 20) return 'Very Simple';
    if (complexity < 40) return 'Simple';
    if (complexity < 60) return 'Moderate';
    if (complexity < 80) return 'Complex';
    return 'Very Complex';
  };
  
  return (
    <div className={`parameter-controls ${className}`}>
      <div className="mb-2 font-medium flex items-center">
        <Sliders size={18} className="mr-2 text-blue-400" />
        <span>Generation Parameters</span>
      </div>
      
      <div className="space-y-5">
        {/* Tempo control */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium flex items-center">
              <Clock size={14} className="mr-1" />
              Tempo: {params.tempo} BPM
            </label>
            <span className="text-xs text-gray-400">
              {getTempoDescription(params.tempo)}
            </span>
          </div>
          
          <Slider
            min={40}
            max={200}
            value={params.tempo}
            onChange={(value) => handleChange('tempo', value)}
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Slow</span>
            <span>Medium</span>
            <span>Fast</span>
          </div>
        </div>
        
        {/* Complexity control */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium flex items-center">
              <BarChart3 size={14} className="mr-1" />
              Complexity: {params.complexity}%
            </label>
            <span className="text-xs text-gray-400">
              {getComplexityDescription(params.complexity)}
            </span>
          </div>
          
          <Slider
            min={0}
            max={100}
            value={params.complexity}
            onChange={(value) => handleChange('complexity', value)}
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Simple</span>
            <span>Moderate</span>
            <span>Complex</span>
          </div>
        </div>
        
        {/* Mood selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Mood</label>
          <div className="grid grid-cols-4 gap-2">
            {moodOptions.map((moodOption) => (
              <Tooltip key={moodOption.value} content={moodOption.label}>
                <button
                  className={`
                    p-2 rounded-md text-center
                    ${params.mood === moodOption.value 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-650'}
                  `}
                  onClick={() => handleChange('mood', moodOption.value)}
                  aria-label={`Set mood to ${moodOption.label}`}
                >
                  <span className="text-xl block mb-1" aria-hidden="true">
                    {moodOption.icon}
                  </span>
                  <span className="text-xs">{moodOption.label}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
        
        {/* Structure selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Structure</label>
          <Select
            options={structureOptions}
            value={params.structure}
            onChange={(value) => handleChange('structure', value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            {params.structure === 'verse_chorus' && 'Traditional song structure with alternating verse and chorus sections'}
            {params.structure === 'verse_chorus_bridge' && 'Extended song form with a contrasting bridge section'}
            {params.structure === 'aaba' && 'Classic 32-bar form used in jazz and pop standards'}
            {params.structure === 'abac' && 'Variation of the AABA form with a different ending'}
            {params.structure === 'through_composed' && 'Progressive structure with minimal repetition'}
            {params.structure === 'loop_based' && 'Repetitive structure based on loops and patterns'}
            {params.structure === 'ambient' && 'Flowing structure without distinct sections'}
          </p>
        </div>
        
        {/* Key and Scale */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Key</label>
            <Select
              options={keyOptions}
              value={params.key}
              onChange={(value) => handleChange('key', value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Scale</label>
            <Select
              options={scaleOptions}
              value={params.scale}
              onChange={(value) => handleChange('scale', value)}
            />
          </div>
        </div>
        
        {/* Advanced button */}
        <div className="pt-2 border-t border-gray-700">
          <button
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
            onClick={() => handleChange('showAdvanced', !params.showAdvanced)}
          >
            <Music size={14} className="mr-1" />
            {params.showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
        </div>
        
        {/* Advanced parameters (conditionally rendered) */}
        {params.showAdvanced && (
          <div className="p-3 bg-gray-750 rounded-md border border-gray-700 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Rhythm Variation</label>
              <Slider
                min={0}
                max={100}
                value={params.rhythmVariation || 50}
                onChange={(value) => handleChange('rhythmVariation', value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Harmonic Richness</label>
              <Slider
                min={0}
                max={100}
                value={params.harmonicRichness || 50}
                onChange={(value) => handleChange('harmonicRichness', value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Dynamic Range</label>
              <Slider
                min={0}
                max={100}
                value={params.dynamicRange || 50}
                onChange={(value) => handleChange('dynamicRange', value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParameterControls;