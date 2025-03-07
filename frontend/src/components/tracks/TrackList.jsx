import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { useAudioContext } from '../../context/AudioContext';
import TrackItem from './TrackItem';
import Button from '../common/Button';

/**
 * TrackList component renders a list of tracks in the project
 * and manages track selection and interaction
 */
const TrackList = () => {
  const { project, tracks, addTrack } = useProjectContext();
  const { isPlaying } = useAudioContext();
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedTrackId: null,
    dragOverTrackId: null
  });
  
  // Select the first track when tracks change
  useEffect(() => {
    if (tracks.length > 0 && !selectedTrackId) {
      setSelectedTrackId(tracks[0].id);
    } else if (tracks.length === 0) {
      setSelectedTrackId(null);
    } else if (selectedTrackId && !tracks.find(track => track.id === selectedTrackId)) {
      // If the selected track was removed, select the first track
      setSelectedTrackId(tracks[0].id);
    }
  }, [tracks, selectedTrackId]);
  
  // Handle track selection
  const handleTrackSelect = (trackId) => {
    setSelectedTrackId(trackId);
  };
  
  // Add a new track
  const handleAddTrack = () => {
    // Open a dialog to select track type or prompt for name
    const trackName = prompt('Enter a name for the new track:');
    
    if (trackName && trackName.trim()) {
      const newTrack = {
        id: `new-${Date.now()}`,
        project_id: project.id,
        name: trackName.trim(),
        color: getRandomColor(),
        muted: false,
        solo: false,
        volume: 70,
        created_at: Date.now()
      };
      
      addTrack(newTrack);
      setSelectedTrackId(newTrack.id);
    }
  };
  
  // Get a random color for new tracks
  const getRandomColor = () => {
    const colors = [
      '#FF5A5F', '#3D5A80', '#8AC926', 
      '#FFCA3A', '#6A4C93', '#4D908E', 
      '#F9844A', '#277DA1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Drag and drop handlers for track reordering
  const handleDragStart = (e, trackId) => {
    e.dataTransfer.setData('text/plain', trackId);
    setDragState({
      ...dragState,
      isDragging: true,
      draggedTrackId: trackId
    });
  };
  
  const handleDragOver = (e, trackId) => {
    e.preventDefault();
    if (dragState.draggedTrackId !== trackId) {
      setDragState({
        ...dragState,
        dragOverTrackId: trackId
      });
    }
  };
  
  const handleDrop = (e, targetTrackId) => {
    e.preventDefault();
    const sourceTrackId = e.dataTransfer.getData('text/plain');
    
    if (sourceTrackId !== targetTrackId) {
      // In a real implementation, this would update the track order
      // in the project context
      console.log(`Reorder: ${sourceTrackId} to position of ${targetTrackId}`);
    }
    
    setDragState({
      isDragging: false,
      draggedTrackId: null,
      dragOverTrackId: null
    });
  };
  
  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedTrackId: null,
      dragOverTrackId: null
    });
  };
  
  return (
    <div className="track-list h-full flex flex-col bg-gray-850 rounded-lg overflow-hidden">
      {/* Track list header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Tracks</h3>
        <Button 
          variant="ghost" 
          size="small" 
          icon={<PlusCircle size={16} />} 
          onClick={handleAddTrack}
          aria-label="Add Track"
        >
          Add Track
        </Button>
      </div>
      
      {/* Tracks container */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length > 0 ? (
          <div className="tracks-container">
            {tracks.map((track) => (
              <div 
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, track.id)}
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDrop={(e) => handleDrop(e, track.id)}
                onDragEnd={handleDragEnd}
                className={`
                  track-wrapper
                  ${dragState.dragOverTrackId === track.id ? 'border-2 border-blue-500 border-dashed' : ''}
                `}
              >
                <TrackItem 
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  onSelect={handleTrackSelect}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <p className="text-gray-400 mb-4">No tracks yet</p>
              <Button 
                variant="primary" 
                size="medium" 
                icon={<PlusCircle size={18} />} 
                onClick={handleAddTrack}
              >
                Add Your First Track
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Track controls */}
      {tracks.length > 0 && (
        <div className="p-3 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </div>
          
          <div className="flex space-x-2">
            {/* Additional track list actions could go here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackList;