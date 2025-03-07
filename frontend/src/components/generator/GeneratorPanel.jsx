import React, { useState } from 'react';
import { Music, Loader, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../../context/ProjectContext';
import { toast } from 'react-hot-toast';
import Tooltip from '../common/Tooltip';

const STYLES = [
  { id: 'pop_rock', name: 'Pop Rock', description: 'Energetic, guitar-driven pop music' },
  { id: 'hip_hop', name: 'Hip Hop', description: 'Rhythmic beats with emphasis on bass and drums' },
  { id: 'electronic', name: 'Electronic', description: 'Synthesizer-based dance music' },
  { id: 'jazz', name: 'Jazz', description: 'Improvisation-focused with complex harmonies' },
  { id: 'ambient', name: 'Ambient', description: 'Atmospheric, textural soundscapes' },
  { id: 'folk', name: 'Folk', description: 'Acoustic-based traditional inspired music' },
  { id: 'classical', name: 'Classical', description: 'Orchestral compositions with traditional structure' },
  { id: 'r_and_b', name: 'R&B', description: 'Rhythm and blues with soulful vocals' }
];

const MOODS = [
  { id: 'energetic', name: 'Energetic', description: 'High energy and upbeat' },
  { id: 'relaxed', name: 'Relaxed', description: 'Calm and peaceful' },
  { id: 'melancholic', name: 'Melancholic', description: 'Sad and reflective' },
  { id: 'uplifting', name: 'Uplifting', description: 'Positive and inspirational' },
  { id: 'dark', name: 'Dark', description: 'Mysterious and intense' },
  { id: 'atmospheric', name: 'Atmospheric', description: 'Ambient and spacious' }
];

const STRUCTURES = [
  { id: 'verse_chorus', name: 'Verse - Chorus', description: 'Standard popular music structure' },
  { id: 'extended', name: 'Verse - Chorus - Bridge', description: 'Extended format with a bridge section' },
  { id: 'minimal', name: 'Minimal (A-B)', description: 'Simple two-part structure' },
  { id: 'ambient', name: 'Ambient (No sections)', description: 'Continuous flow without distinct sections' },
  { id: 'freestyle', name: 'Custom', description: 'Define your own arrangement' }
];

const INSTRUMENTS = [
  { id: 'drums', name: 'Drums', icon: '🥁', default: true },
  { id: 'bass', name: 'Bass', icon: '🎸', default: true },
  { id: 'piano', name: 'Piano', icon: '🎹', default: true },
  { id: 'guitar', name: 'Guitar', icon: '🎸', default: true },
  { id: 'vocals', name: 'Vocals', icon: '🎤', default: false },
  { id: 'strings', name: 'Strings', icon: '🎻', default: false },
  { id: 'brass', name: 'Brass', icon: '🎺', default: false },
  { id: 'synth', name: 'Synth', icon: '🎛️', default: false }
];

/**
 * GeneratorPanel component provides the interface for AI music generation
 */
const GeneratorPanel = ({ projectId, onComplete }) => {
  const navigate = useNavigate();
  const { addTracks } = useProjectContext();
  
  // Generation parameters
  const [style, setStyle] = useState(STYLES[0].id);
  const [mood, setMood] = useState(MOODS[0].id);
  const [structure, setStructure] = useState(STRUCTURES[0].id);
  const [tempo, setTempo] = useState(120);
  const [complexity, setComplexity] = useState(65);
  const [description, setDescription] = useState('');
  
  const [selectedInstruments, setSelectedInstruments] = useState(
    INSTRUMENTS.filter(inst => inst.default).map(inst => inst.id)
  );
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState(null);
  
  const toggleInstrument = (instrumentId) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrumentId)) {
        return prev.filter(id => id !== instrumentId);
      } else {
        return [...prev, instrumentId];
      }
    });
  };
  
  const handleGenerate = async () => {
    if (selectedInstruments.length === 0) {
      setGenerationError('Please select at least one instrument');
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    
    try {
      // Mock progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);
      
      // Call the API
      const response = await fetch('/api/generation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          style,
          mood,
          structure,
          tempo,
          complexity,
          description,
          instruments: selectedInstruments
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate music');
      }
      
      const data = await response.json();
      
      // Clear the progress interval
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // Add the generated tracks to the project
      addTracks(data.tracks);
      
      // Show success message
      toast.success('Music generated successfully!');
      
      // Wait a moment to show the completion state
      setTimeout(() => {
        setIsGenerating(false);
        if (onComplete) {
          onComplete(data.tracks);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError(error.message || 'Failed to generate music');
      setIsGenerating(false);
    }
  };
  
  const renderGenerationState = () => {
    if (!isGenerating) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-2">Generating Your Music</h3>
            <p className="text-gray-400">
              Our AI models are creating your tracks. This may take a few minutes...
            </p>
          </div>
          
          <div className="mb-4">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-900 text-blue-200">
                    Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-200">
                    {Math.round(generationProgress)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                <div 
                  style={{ width: `${generationProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                ></div>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            <div className="mb-2">
              <span className={generationProgress > 20 ? "text-green-400" : "text-gray-500"}>
                {generationProgress > 20 ? <Check size={16} className="inline mr-2" /> : "•"} 
                Analyzing parameters
              </span>
            </div>
            <div className="mb-2">
              <span className={generationProgress > 40 ? "text-green-400" : "text-gray-500"}>
                {generationProgress > 40 ? <Check size={16} className="inline mr-2" /> : "•"}
                Generating musical structure
              </span>
            </div>
            <div className="mb-2">
              <span className={generationProgress > 60 ? "text-green-400" : "text-gray-500"}>
                {generationProgress > 60 ? <Check size={16} className="inline mr-2" /> : "•"}
                Creating instrument tracks
              </span>
            </div>
            <div className="mb-2">
              <span className={generationProgress > 80 ? "text-green-400" : "text-gray-500"}>
                {generationProgress > 80 ? <Check size={16} className="inline mr-2" /> : "•"}
                Finalizing arrangement
              </span>
            </div>
          </div>
          
          {generationError && (
            <div className="mt-4 p-3 bg-red-900 bg-opacity-50 rounded text-red-200 flex items-start">
              <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{generationError}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="generator-panel bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-750 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <Music className="mr-2 text-blue-400" size={20} />
          <h2 className="text-lg font-semibold">AI Music Generator</h2>
        </div>
        <div>
          <button 
            className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Cancel
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - main settings */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Musical Style
              </label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {STYLES.map(styleOption => (
                  <option key={styleOption.id} value={styleOption.id}>
                    {styleOption.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-400">
                {STYLES.find(s => s.id === style)?.description}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mood / Energy
              </label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {MOODS.map(moodOption => (
                  <option key={moodOption.id} value={moodOption.id}>
                    {moodOption.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-400">
                {MOODS.find(m => m.id === mood)?.description}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Structure
              </label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
              >
                {STRUCTURES.map(structureOption => (
                  <option key={structureOption.id} value={structureOption.id}>
                    {structureOption.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-400">
                {STRUCTURES.find(s => s.id === structure)?.description}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Text Description (Optional)
              </label>
              <textarea 
                className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what you want (e.g., 'Upbeat rock track with catchy chorus and guitar solo')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
              <p className="mt-1 text-sm text-gray-400">
                Use natural language to guide the AI's composition
              </p>
            </div>
          </div>
          
          {/* Right column - advanced settings */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tempo: {tempo} BPM
              </label>
              <input 
                type="range" 
                min="60" 
                max="180" 
                value={tempo} 
                onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Slow</span>
                <span>Medium</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Complexity: {complexity}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={complexity} 
                onChange={(e) => setComplexity(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Simple</span>
                <span>Moderate</span>
                <span>Complex</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instruments to Include
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INSTRUMENTS.map(instrument => (
                  <div 
                    key={instrument.id}
                    className={`p-2 rounded-md border cursor-pointer transition-colors
                      ${selectedInstruments.includes(instrument.id) 
                        ? 'bg-blue-900 bg-opacity-40 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-650'}`}
                    onClick={() => toggleInstrument(instrument.id)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{instrument.icon}</span>
                      <span>{instrument.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedInstruments.length === 0 && (
                <p className="mt-2 text-sm text-red-400">
                  Please select at least one instrument
                </p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button 
                className={`w-full py-3 rounded font-medium text-lg flex items-center justify-center
                  ${isGenerating 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={handleGenerate}
                disabled={isGenerating || selectedInstruments.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader size={20} className="animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Music'
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                This will create individual tracks based on your settings.
                You can edit them afterward.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {renderGenerationState()}
    </div>
  );
};

export default GeneratorPanel;