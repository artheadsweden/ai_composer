import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for audio playback functionality with time tracking,
 * loop support, and track management.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.masterVolume - Master volume (0-1)
 * @param {boolean} options.autoInitialize - Whether to initialize the Web Audio API on hook mount
 * @returns {Object} Audio player functions and state
 */
const useAudioPlayer = ({
  masterVolume = 1,
  autoInitialize = false
} = {}) => {
  // Audio context and nodes
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const trackNodesRef = useRef({});
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const [endPosition, setEndPosition] = useState(null);
  const [tracks, setTracks] = useState([]);
  
  // Internal refs
  const startTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const hasInitialized = useRef(false);
  
  /**
   * Initialize the Web Audio API context
   */
  const initialize = useCallback(() => {
    if (hasInitialized.current) return;
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create master gain node
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(audioContextRef.current.destination);
      
      hasInitialized.current = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error);
      return false;
    }
  }, [masterVolume]);
  
  /**
   * Load audio buffer for a track
   * 
   * @param {string} trackId - Track identifier
   * @param {string} url - Audio file URL or object URL
   * @returns {Promise<boolean>} Success status
   */
  const loadTrack = useCallback(async (trackId, url) => {
    if (!initialize()) return false;
    
    try {
      // Fetch audio file
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create track node entry
      trackNodesRef.current[trackId] = {
        buffer: audioBuffer,
        source: null,
        gain: audioContextRef.current.createGain()
      };
      
      // Connect gain node to master
      trackNodesRef.current[trackId].gain.connect(masterGainRef.current);
      
      // Update duration if longer than current
      if (audioBuffer.duration > duration) {
        setDuration(audioBuffer.duration);
        
        // Set default end position if not set
        if (endPosition === null) {
          setEndPosition(audioBuffer.duration);
        }
      }
      
      // Update tracks list
      setTracks(prevTracks => {
        if (!prevTracks.includes(trackId)) {
          return [...prevTracks, trackId];
        }
        return prevTracks;
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to load track ${trackId}:`, error);
      return false;
    }
  }, [duration, endPosition, initialize]);
  
  /**
   * Load multiple tracks at once
   * 
   * @param {Object[]} tracksToLoad - Array of {id, url} objects
   * @returns {Promise<Object>} Results with success/failure for each track
   */
  const loadTracks = useCallback(async (tracksToLoad) => {
    if (!initialize()) return { success: false };
    
    const results = {};
    
    for (const track of tracksToLoad) {
      results[track.id] = await loadTrack(track.id, track.url);
    }
    
    return {
      success: Object.values(results).some(result => result),
      results
    };
  }, [initialize, loadTrack]);
  
  /**
   * Set the volume for a specific track
   * 
   * @param {string} trackId - Track identifier
   * @param {number} volume - Volume level (0-1)
   */
  const setTrackVolume = useCallback((trackId, volume) => {
    const trackNode = trackNodesRef.current[trackId];
    
    if (trackNode && trackNode.gain) {
      const clampedVolume = Math.max(0, Math.min(volume, 1));
      trackNode.gain.gain.value = clampedVolume;
    }
  }, []);
  
  /**
   * Mute or unmute a track
   * 
   * @param {string} trackId - Track identifier
   * @param {boolean} muted - Whether to mute the track
   */
  const setTrackMuted = useCallback((trackId, muted) => {
    const trackNode = trackNodesRef.current[trackId];
    
    if (trackNode && trackNode.gain) {
      // Store previous volume to restore later
      if (muted) {
        trackNode.previousVolume = trackNode.gain.gain.value;
        trackNode.gain.gain.value = 0;
      } else if (trackNode.previousVolume !== undefined) {
        trackNode.gain.gain.value = trackNode.previousVolume;
      }
    }
  }, []);
  
  /**
   * Solo a track (mute all others)
   * 
   * @param {string} trackId - Track identifier to solo
   * @param {boolean} solo - Whether to solo the track
   */
  const setTrackSolo = useCallback((trackId, solo) => {
    // Store original volume levels if not already saved
    if (!trackNodesRef.current.originalVolumes) {
      trackNodesRef.current.originalVolumes = {};
      
      Object.keys(trackNodesRef.current).forEach(id => {
        if (id !== 'originalVolumes') {
          trackNodesRef.current.originalVolumes[id] = 
            trackNodesRef.current[id].gain.gain.value;
        }
      });
    }
    
    // Handle solo
    if (solo) {
      // Mute all tracks except the soloed one
      Object.keys(trackNodesRef.current).forEach(id => {
        if (id !== 'originalVolumes' && id !== trackId) {
          trackNodesRef.current[id].gain.gain.value = 0;
        }
      });
      
      // Ensure the soloed track is audible
      if (trackNodesRef.current[trackId]) {
        trackNodesRef.current[trackId].gain.gain.value = 
          trackNodesRef.current.originalVolumes[trackId] || 1;
      }
    } else {
      // Restore original volumes
      Object.keys(trackNodesRef.current.originalVolumes).forEach(id => {
        if (trackNodesRef.current[id]) {
          trackNodesRef.current[id].gain.gain.value = 
            trackNodesRef.current.originalVolumes[id];
        }
      });
    }
  }, []);
  
  /**
   * Set master volume
   * 
   * @param {number} volume - Master volume level (0-1)
   */
  const setMasterVolume = useCallback((volume) => {
    if (!masterGainRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(volume, 1));
    masterGainRef.current.gain.value = clampedVolume;
  }, []);
  
  /**
   * Update playback time tracking
   */
  const updatePlaybackTime = useCallback(() => {
    if (!isPlaying || !audioContextRef.current) return;
    
    // Calculate elapsed time
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const newTime = startPosition + elapsed;
    
    // Update current time
    setCurrentTime(newTime);
    
    // Check if we reached the end position
    if (endPosition !== null && newTime >= endPosition) {
      if (isLooping) {
        // Loop back to start position
        stop();
        play();
      } else {
        // Stop playback
        stop();
        setCurrentTime(startPosition);
      }
      return;
    }
    
    // Continue updating
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, startPosition, endPosition, isLooping]);
  
  /**
   * Start playback
   */
  const play = useCallback(() => {
    if (!initialize() || isPlaying) return false;
    
    // Resume suspended context
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Record start time
    startTimeRef.current = audioContextRef.current.currentTime;
    
    // Create and start source nodes for each track
    Object.keys(trackNodesRef.current).forEach(trackId => {
      if (trackId === 'originalVolumes') return;
      
      const trackNode = trackNodesRef.current[trackId];
      
      if (trackNode && trackNode.buffer) {
        // Create a new source node
        const source = audioContextRef.current.createBufferSource();
        source.buffer = trackNode.buffer;
        
        // Connect to gain node
        source.connect(trackNode.gain);
        
        // Calculate playback offset and duration
        const offset = Math.max(0, currentTime);
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
    
    return true;
  }, [isPlaying, currentTime, endPosition, initialize, updatePlaybackTime]);
  
  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    if (!isPlaying) return;
    
    // Stop all sources
    Object.keys(trackNodesRef.current).forEach(trackId => {
      if (trackId === 'originalVolumes') return;
      
      const trackNode = trackNodesRef.current[trackId];
      
      if (trackNode && trackNode.source) {
        try {
          trackNode.source.stop();
          trackNode.source = null;
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
  
  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, play, stop]);
  
  /**
   * Seek to a specific time
   * 
   * @param {number} time - Time position to seek to (seconds)
   */
  const seek = useCallback((time) => {
    const newTime = Math.max(0, Math.min(time, duration));
    
    // If playing, restart from new position
    if (isPlaying) {
      stop();
      setCurrentTime(newTime);
      setStartPosition(newTime);
      play();
    } else {
      // Just update positions
      setCurrentTime(newTime);
      setStartPosition(newTime);
    }
  }, [duration, isPlaying, play, stop]);
  
  /**
   * Set loop points
   * 
   * @param {number} start - Loop start time (seconds)
   * @param {number|null} end - Loop end time (seconds) or null for end of track
   */
  const setLoopPoints = useCallback((start, end) => {
    const validStart = Math.max(0, Math.min(start, duration));
    const validEnd = end !== null ? Math.max(validStart, Math.min(end, duration)) : null;
    
    setStartPosition(validStart);
    setEndPosition(validEnd);
    
    // Adjust current time if outside loop range
    if (currentTime < validStart || (validEnd !== null && currentTime > validEnd)) {
      setCurrentTime(validStart);
      
      // Update playback if playing
      if (isPlaying) {
        stop();
        play();
      }
    }
  }, [currentTime, duration, isPlaying, play, stop]);
  
  /**
   * Toggle looping
   */
  const toggleLooping = useCallback(() => {
    setIsLooping(prevLooping => !prevLooping);
  }, []);
  
  /**
   * Remove a track
   * 
   * @param {string} trackId - Track identifier to remove
   */
  const removeTrack = useCallback((trackId) => {
    // Stop if playing
    if (isPlaying && trackNodesRef.current[trackId]?.source) {
      try {
        trackNodesRef.current[trackId].source.stop();
        trackNodesRef.current[trackId].source = null;
      } catch (e) {
        // Ignore errors from already stopped sources
      }
    }
    
    // Disconnect and clean up
    if (trackNodesRef.current[trackId]?.gain) {
      trackNodesRef.current[trackId].gain.disconnect();
    }
    
    // Remove track node
    delete trackNodesRef.current[trackId];
    
    // Update tracks list
    setTracks(prevTracks => prevTracks.filter(id => id !== trackId));
    
    // Recalculate duration
    let maxDuration = 0;
    
    Object.keys(trackNodesRef.current).forEach(id => {
      if (id !== 'originalVolumes' && trackNodesRef.current[id]?.buffer) {
        maxDuration = Math.max(maxDuration, trackNodesRef.current[id].buffer.duration);
      }
    });
    
    setDuration(maxDuration);
    
    // Update end position if necessary
    if (endPosition === null || endPosition > maxDuration) {
      setEndPosition(maxDuration > 0 ? maxDuration : null);
    }
  }, [isPlaying, endPosition]);
  
  /**
   * Clean up audio resources
   */
  const cleanup = useCallback(() => {
    // Stop playback
    if (isPlaying) {
      stop();
    }
    
    // Disconnect all nodes
    Object.keys(trackNodesRef.current).forEach(trackId => {
      if (trackId === 'originalVolumes') return;
      
      if (trackNodesRef.current[trackId]?.gain) {
        trackNodesRef.current[trackId].gain.disconnect();
      }
    });
    
    // Disconnect master gain
    if (masterGainRef.current) {
      masterGainRef.current.disconnect();
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    // Reset refs
    audioContextRef.current = null;
    masterGainRef.current = null;
    trackNodesRef.current = {};
    hasInitialized.current = false;
    
    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setStartPosition(0);
    setEndPosition(null);
    setTracks([]);
  }, [isPlaying, stop]);
  
  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
    
    // Clean up on unmount
    return () => {
      if (hasInitialized.current) {
        cleanup();
      }
    };
  }, [autoInitialize, initialize, cleanup]);
  
  // Update master volume when it changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);
  
  return {
    // State
    isPlaying,
    currentTime,
    duration,
    isLooping,
    startPosition,
    endPosition,
    tracks,
    
    // Main functions
    initialize,
    play,
    stop,
    togglePlayPause,
    seek,
    
    // Track management
    loadTrack,
    loadTracks,
    setTrackVolume,
    setTrackMuted,
    setTrackSolo,
    removeTrack,
    
    // Loop control
    setLoopPoints,
    toggleLooping,
    
    // Volume control
    setMasterVolume,
    
    // Cleanup
    cleanup
  };
};

export default useAudioPlayer;