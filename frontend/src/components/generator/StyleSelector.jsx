import React, { useState } from 'react';
import { Music } from 'lucide-react';

/**
 * StyleSelector component provides a visual interface for selecting musical styles
 * with additional information about each style
 */
const StyleSelector = ({ 
  selectedStyle, 
  onStyleSelect,
  className = '' 
}) => {
  const [showInfo, setShowInfo] = useState(null);
  
  // Musical styles with descriptions and example artists
  const styles = [
    {
      id: 'pop_rock',
      name: 'Pop Rock',
      description: 'Catchy melodies with guitar-driven arrangements',
      examples: 'Coldplay, Maroon 5, Imagine Dragons',
      color: 'bg-pink-700',
      icon: '🎸'
    },
    {
      id: 'electronic',
      name: 'Electronic',
      description: 'Synthesizer-based music with programmed beats',
      examples: 'Daft Punk, Calvin Harris, Deadmau5',
      color: 'bg-blue-700',
      icon: '🎛️'
    },
    {
      id: 'hip_hop',
      name: 'Hip Hop',
      description: 'Rhythm-focused with emphasis on beats and bass',
      examples: 'Kendrick Lamar, J. Cole, Drake',
      color: 'bg-purple-700',
      icon: '🎤'
    },
    {
      id: 'jazz',
      name: 'Jazz',
      description: 'Complex harmonies with improvisation elements',
      examples: 'Miles Davis, John Coltrane, Herbie Hancock',
      color: 'bg-yellow-700',
      icon: '🎷'
    },
    {
      id: 'classical',
      name: 'Classical',
      description: 'Orchestral compositions with traditional structure',
      examples: 'Mozart, Beethoven, Bach (AI adaptation)',
      color: 'bg-red-700',
      icon: '🎻'
    },
    {
      id: 'ambient',
      name: 'Ambient',
      description: 'Atmospheric textures focusing on tone and mood',
      examples: 'Brian Eno, Tycho, Boards of Canada',
      color: 'bg-teal-700',
      icon: '🌊'
    },
    {
      id: 'folk',
      name: 'Folk',
      description: 'Acoustic instruments with storytelling emphasis',
      examples: 'Mumford & Sons, Fleet Foxes, Bon Iver',
      color: 'bg-green-700',
      icon: '🪕'
    },
    {
      id: 'r_and_b',
      name: 'R&B',
      description: 'Smooth, soulful vocals with modern production',
      examples: 'The Weeknd, Frank Ocean, SZA',
      color: 'bg-indigo-700',
      icon: '🎵'
    }
  ];
  
  // Handle style selection
  const handleSelect = (styleId) => {
    if (onStyleSelect) {
      onStyleSelect(styleId);
    }
  };
  
  // Show style information
  const handleInfoToggle = (styleId) => {
    setShowInfo(showInfo === styleId ? null : styleId);
  };
  
  return (
    <div className={`style-selector ${className}`}>
      <div className="mb-2 font-medium flex items-center">
        <Music size={18} className="mr-2 text-blue-400" />
        <span>Choose a musical style</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {styles.map((style) => (
          <div key={style.id} className="relative">
            <button
              className={`
                w-full p-3 rounded-lg text-left transition-all flex flex-col
                ${selectedStyle === style.id 
                  ? 'ring-2 ring-blue-500 ' + style.color
                  : 'bg-gray-700 hover:bg-gray-650'}
              `}
              onClick={() => handleSelect(style.id)}
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl mb-2" aria-hidden="true">{style.icon}</span>
                <button 
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-900 bg-opacity-30 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoToggle(style.id);
                  }}
                  aria-label={`Information about ${style.name}`}
                >
                  i
                </button>
              </div>
              <span className="font-medium">{style.name}</span>
            </button>
            
            {/* Information popover */}
            {showInfo === style.id && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 p-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                <h4 className="font-medium mb-1">{style.name}</h4>
                <p className="text-sm text-gray-300 mb-1">{style.description}</p>
                <p className="text-xs text-gray-400">
                  <span className="font-medium">Examples:</span> {style.examples}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Style information for selected style */}
      {selectedStyle && (
        <div className="mt-4 p-3 bg-gray-750 rounded-md border border-gray-700">
          <h4 className="font-medium">
            {styles.find(s => s.id === selectedStyle)?.name} Style
          </h4>
          <p className="text-sm text-gray-300 mt-1">
            {styles.find(s => s.id === selectedStyle)?.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default StyleSelector;