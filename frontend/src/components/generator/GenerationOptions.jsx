import React, { useState } from 'react';
import { ListMusic, PlusCircle, Trash, Clock, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

/**
 * GenerationOptions component provides controls for selecting which
 * instruments to include in the generation and other generation options
 */
const GenerationOptions = ({
  selectedInstruments = [],
  onInstrumentsChange,
  generationLength,
  onLengthChange,
  lyrics,
  onLyricsChange,
  allowControlledGeneration = true,
  className = ''
}) => {
  const [lyricsInput, setLyricsInput] = useState(lyrics || '');
  const [showLyricsHelp, setShowLyricsHelp] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  // Available instruments with icons and descriptions
  const availableInstruments = [
    { 
      id: 'drums', 
      name: 'Drums', 
      icon: '🥁', 
      description: 'Percussion and rhythm section'
    },
    { 
      id: 'bass', 
      name: 'Bass', 
      icon: '🎸', 
      description: 'Bass guitar or synthesized bass'
    },
    { 
      id: 'piano', 
      name: 'Piano', 
      icon: '🎹', 
      description: 'Piano or keyboard instruments'
    },
    { 
      id: 'guitar', 
      name: 'Guitar', 
      icon: '🎸', 
      description: 'Electric or acoustic guitar'
    },
    { 
      id: 'strings', 
      name: 'Strings', 
      icon: '🎻', 
      description: 'String instruments like violin, cello'
    },
    { 
      id: 'brass', 
      name: 'Brass', 
      icon: '🎺', 
      description: 'Brass instruments like trumpet, saxophone'
    },
    { 
      id: 'synth', 
      name: 'Synthesizer', 
      icon: '🎛️', 
      description: 'Electronic synthesizer sounds'
    },
    { 
      id: 'vocals', 
      name: 'Vocals', 
      icon: '🎤', 
      description: 'AI generated vocal melody and lyrics'
    }
  ];
  
  // Available track length options
  const lengthOptions = [
    { id: 'short', name: 'Short (1 min)', seconds: 60 },
    { id: 'medium', name: 'Medium (2-3 min)', seconds: 150 },
    { id: 'long', name: 'Long (4-5 min)', seconds: 270 }
  ];
  
  // Toggle instrument selection
  const toggleInstrument = (instrumentId) => {
    if (!onInstrumentsChange) return;
    
    const isSelected = selectedInstruments.includes(instrumentId);
    
    if (isSelected) {
      // Check if we're removing the last instrument
      if (selectedInstruments.length === 1) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        return;
      }
      
      // Remove instrument
      onInstrumentsChange(selectedInstruments.filter(id => id !== instrumentId));
    } else {
      // Add instrument
      onInstrumentsChange([...selectedInstruments, instrumentId]);
    }
  };
  
  // Handle lyrics input
  const handleLyricsChange = (e) => {
    setLyricsInput(e.target.value);
    
    if (onLyricsChange) {
      onLyricsChange(e.target.value);
    }
    
    // Auto-select vocals instrument when lyrics are entered
    if (e.target.value.trim() && !selectedInstruments.includes('vocals')) {
      if (onInstrumentsChange) {
        onInstrumentsChange([...selectedInstruments, 'vocals']);
      }
    }
  };
  
  // Handle generation length change
  const handleLengthChange = (lengthId) => {
    if (onLengthChange) {
      onLengthChange(lengthId);
    }
  };
  
  return (
    <div className={`generation-options ${className}`}>
      <div className="mb-2 font-medium flex items-center">
        <ListMusic size={18} className="mr-2 text-blue-400" />
        <span>Instrument Selection</span>
      </div>
      
      {/* Warning message for minimum instruments */}
      {showWarning && (
        <div className="mb-3 p-2 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded-md flex items-start">
          <AlertCircle size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-200">
            At least one instrument must be selected
          </p>
        </div>
      )}
      
      {/* Instrument selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {availableInstruments.map((instrument) => (
          <Tooltip key={instrument.id} content={instrument.description}>
            <button
              className={`
                p-2 rounded-md text-left flex items-center transition-all
                ${selectedInstruments.includes(instrument.id)
                  ? 'bg-blue-700 bg-opacity-40 border border-blue-500 text-white'
                  : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-650'}
              `}
              onClick={() => toggleInstrument(instrument.id)}
              aria-pressed={selectedInstruments.includes(instrument.id)}
            >
              <span className="mr-2 text-xl" aria-hidden="true">{instrument.icon}</span>
              <span>{instrument.name}</span>
            </button>
          </Tooltip>
        ))}
      </div>
      
      {/* Track length selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 flex items-center">
          <Clock size={14} className="mr-1" />
          Track Length
        </label>
        
        <div className="flex space-x-2">
          {lengthOptions.map((option) => (
            <button
              key={option.id}
              className={`
                flex-1 py-2 px-3 rounded-md text-center text-sm
                ${generationLength === option.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-650'}
              `}
              onClick={() => handleLengthChange(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lyrics input (shown if vocals selected or lyrics already present) */}
      {(selectedInstruments.includes('vocals') || lyricsInput) && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium flex items-center">
              <span className="mr-1">🎤</span>
              Lyrics (optional)
            </label>
            
            <button
              className="text-xs text-blue-400 hover:text-blue-300"
              onClick={() => setShowLyricsHelp(!showLyricsHelp)}
              aria-label={showLyricsHelp ? "Hide lyrics help" : "Show lyrics help"}
            >
              {showLyricsHelp ? "Hide Tips" : "Show Tips"}
            </button>
          </div>
          
          {showLyricsHelp && (
            <div className="mb-2 p-2 bg-gray-750 rounded-md border border-gray-700 text-sm">
              <p className="mb-1 text-gray-300">Tips for better lyrics generation:</p>
              <ul className="list-disc pl-5 text-xs text-gray-400 space-y-1">
                <li>Separate verses and choruses with blank lines</li>
                <li>For a chorus, add [Chorus] at the beginning</li>
                <li>Keep lines short and singable</li>
                <li>The AI will adapt lyrics to fit the melody</li>
              </ul>
            </div>
          )}
          
          <textarea
            className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter lyrics for the AI to sing..."
            value={lyricsInput}
            onChange={handleLyricsChange}
          ></textarea>
          
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{lyricsInput.length} characters</span>
            {lyricsInput && (
              <button
                className="text-red-400 hover:text-red-300 flex items-center"
                onClick={() => {
                  setLyricsInput('');
                  if (onLyricsChange) {
                    onLyricsChange('');
                  }
                }}
              >
                <Trash size={12} className="mr-1" />
                Clear lyrics
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Advanced generation options */}
      {allowControlledGeneration && (
        <div className="pt-3 border-t border-gray-700">
          <h4 className="text-sm font-medium mb-2">Controlled Generation</h4>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2 rounded"
                checked={false}
                onChange={() => {}}
              />
              <span className="text-sm">Generate one section at a time</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2 rounded"
                checked={false}
                onChange={() => {}}
              />
              <span className="text-sm">Keep previous sections when regenerating</span>
            </label>
            
            <div className="p-3 bg-gray-750 rounded-md border border-gray-700 text-center">
              <p className="text-sm text-gray-400 mb-2">
                Controlled generation features are coming soon!
              </p>
              <p className="text-xs text-gray-500">
                These options will allow you to have more control over the generation process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationOptions;