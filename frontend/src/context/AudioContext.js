import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useProjectContext } from './ProjectContext';

// Create the context
const AudioContext = createContext();

// Provider component
export const AudioProvider = ({ children }) => {
  const { project, tracks } = useProjectContext();
  
  // Audio Web API context
  const audioContextRef = useRef(null);
  const audioNodesRef = useRef({});
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const [endPosition, setEndPosition] = useState(null);
  
  // Timing and scheduling
  const startTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  
  // Initialize Web Audio API
  useEffect(() => {
    // Create audio context on first interaction (to comply with browser autoplay policies)
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
    };
    
    // Initialize on user interaction
    const handleInteraction = () => {
      initAudioContext();
      // Clean up event listeners after initialization
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    
    // Add event listeners for user interaction
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    // Clean up function
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      
      // Dispose audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Load and decode audio for tracks
  useEffect(() => {
    const loadTrackAudio = async () => {
      if (!audioContextRef.current || !tracks.length) return;
      
      // Create a master gain node if it doesn't exist
      if (!audioNodesRef.current.masterGain) {
        const masterGain = audioContextRef.current.createGain();
        masterGain.connect(audioContextRef.current.destination);
        audioNodesRef.current.masterGain = masterGain;
      }
      
      // Process each track
      for (const track of tracks) {
        // Skip tracks that already have audio loaded
        if (audioNodesRef.current[track.id]) continue;
        
        try {
          // Fetch audio data for the track
          const response = await fetch(`/api/tracks/${track.id}/audio`);
          
          if (!response.ok) {
            console.error(`Failed to load audio for track ${track.id}`);
            continue;
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Decode the audio data
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          
          // Create audio buffer source and gain node for the track
          audioNodesRef.current[track.id] = {
            buffer: audioBuffer,
            source: null,
            gain: audioContextRef.current.createGain()
          };
          
          // Connect the track's gain node to the master gain
          audioNodesRef.current[track.id].gain.connect(audioNodesRef.current.masterGain);
          
          // Set initial gain based on track volume
          audioNodesRef.current[track.id].gain.gain.value = track.volume / 100;
          
          // Update duration if this is the longest track
          if (audioBuffer.duration > duration) {
            setDuration(audioBuffer.duration);
            if (endPosition === null) {
              setEndPosition(audioBuffer.duration);
            }
          }
        } catch (error) {
          console.error(`Error loading audio for track ${track.id}:`, error);
        }
      }
    };
    
    loadTrackAudio();
  }, [tracks, duration, endPosition]);
  
  // Update track gains when track settings change
  useEffect(() => {
    if (!audioContextRef.current || !tracks.length) return;
    
    tracks.forEach(track => {
      const trackNode = audioNodesRef.current[track.id];
      
      if (trackNode && trackNode.gain) {
        // Calculate effective gain (considering mute and solo)
        const soloActive = tracks.some(t => t.solo);
        const shouldPlay = !track.muted && (!soloActive || track.solo);
        
        // Set gain value based on track settings
        const targetGain = shouldPlay ? track.volume / 100 : 0;
        trackNode.gain.gain.setValueAtTime(
          targetGain, 
          audioContextRef.current.currentTime
        );
      }
    });
  }, [tracks]);
  
  // Clean up audio nodes when tracks are removed
  useEffect(() => {
    if (!audioContextRef.current) return;
    
    // Get current track IDs
    const currentTrackIds = new Set(tracks.map(track => track.id));
    
    // Find track nodes that are no longer needed
    Object.keys(audioNodesRef.current).forEach(nodeId => {
      if (nodeId === 'masterGain') return;
      
      if (!currentTrackIds.has(nodeId)) {
        // Stop the source if it's playing
        if (audioNodesRef.current[nodeId].source) {
          try {
            audioNodesRef.current[nodeId].source.stop();
          } catch (e) {
            // Ignore errors from already stopped sources
          }
        }
        
        // Disconnect the gain node
        if (audioNodesRef.current[nodeId].gain) {
          audioNodesRef.current[nodeId].gain.disconnect();
        }
        
        // Remove the node reference
        delete audioNodesRef.current[nodeId];
      }
    });
  }, [tracks]);
  
  // Update timing during playback
  const updatePlaybackTime = useCallback(() => {
    if (!isPlaying || !audioContextRef.current) return;
    
    // Calculate current playback time
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const newTime = startPosition + elapsed;
    
    // Update current time
    setCurrentTime(newTime);
    
    // Check if we've reached the end position
    if (endPosition !== null && newTime >= endPosition) {
      if (isLooping) {
        // Loop back to start position
        stopPlayback();
        startPlayback();
      } else {
        // Stop playback
        stopPlayback();
        setCurrentTime(startPosition);
      }
      return;
    }
    
    // Continue updating
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, startPosition, endPosition, isLooping]);
  
  // Start playback from current position
  const startPlayback = useCallback(() => {
    if (!audioContextRef.current || isPlaying) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Record start time
    startTimeRef.current = audioContextRef.current.currentTime;
    
    // Create and start source nodes for each track
    tracks.forEach(track => {
      const trackNode = audioNodesRef.current[track.id];
      
      if (trackNode && trackNode.buffer) {
        // Create a new source node
        const source = audioContextRef.current.createBufferSource();
        source.buffer = trackNode.buffer;
        
        // Connect source to gain node
        source.connect(trackNode.gain);
        
        // Calculate offset based on current time
        const offset = Math.max(0, currentTime);
        
        // Calculate duration (accounting for loop end)
        const duration = endPosition !== null 
          ? Math.max(0, endPosition - offset)
          : undefined;
        
        // Start playback
        source.start(0, offset, duration);
        
        // Store source reference
        trackNode.source = source;
      }
    });
    
    // Update state
    setIsPlaying(true);
    
    // Start timing updates
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, currentTime, endPosition, tracks, updatePlaybackTime]);
  
  // Stop playback
  const stopPlayback = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;
    
    // Stop all source nodes
    Object.values(audioNodesRef.current).forEach(node => {
      if (node.source) {
        try {
          node.source.stop();
          node.source = null;
        } catch (e) {
          // Ignore errors from already stopped sources
        }
      }
    });
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Update state
    setIsPlaying(false);
  }, [isPlaying]);
  
  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);
  
  // Seek to a specific time
  const seekTo = useCallback((time) => {
    const newTime = Math.max(0, Math.min(time, duration));
    
    // If playing, restart from new position
    if (isPlaying) {
      stopPlayback();
      setCurrentTime(newTime);
      setStartPosition(newTime);
      startPlayback();
    } else {
      // Just update the position
      setCurrentTime(newTime);
      setStartPosition(newTime);
    }
  }, [isPlaying, duration, stopPlayback, startPlayback]);
  
  // Set loop points
  const setLoopPoints = useCallback((start, end) => {
    const validStart = Math.max(0, Math.min(start, duration));
    const validEnd = end !== null ? Math.max(validStart, Math.min(end, duration)) : null;
    
    setStartPosition(validStart);
    setEndPosition(validEnd);
    
    // Adjust current time if it's outside the loop range
    if (currentTime < validStart || (validEnd !== null && currentTime > validEnd)) {
      setCurrentTime(validStart);
    }
  }, [duration, currentTime]);
  
  // Toggle looping
  const toggleLooping = useCallback(() => {
    setIsLooping(prev => !prev);
  }, []);
  
  // Set master volume
  const setMasterVolume = useCallback((volume) => {
    if (!audioContextRef.current || !audioNodesRef.current.masterGain) return;
    
    const normalizedVolume = Math.max(0, Math.min(volume, 100)) / 100;
    audioNodesRef.current.masterGain.gain.value = normalizedVolume;
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop playback
      if (isPlaying) {
        stopPlayback();
      }
      
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, stopPlayback]);
  
  // Context value
  const value = {
    isPlaying,
    currentTime,
    duration,
    isLooping,
    startPosition,
    endPosition,
    togglePlayPause,
    startPlayback,
    stopPlayback,
    seekTo,
    setLoopPoints,
    toggleLooping,
    setMasterVolume
  };
  
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

// Custom hook for using the context
export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};

export default AudioContext;