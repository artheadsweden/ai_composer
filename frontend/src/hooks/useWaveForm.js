import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for generating and managing audio waveform visualizations
 * 
 * @param {Object} options - Configuration options
 * @param {HTMLCanvasElement|null} options.canvas - Canvas element reference
 * @param {AudioBuffer|null} options.audioBuffer - Audio buffer to visualize
 * @param {string} options.color - Waveform color (CSS color string)
 * @param {number} options.resolution - Number of data points to use (higher = more detailed)
 * @param {boolean} options.normalize - Whether to normalize the waveform amplitude
 * @returns {Object} Waveform functions and state
 */
const useWaveform = ({
  canvas = null,
  audioBuffer = null,
  color = '#3B82F6',
  resolution = 700,
  normalize = true
} = {}) => {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for waveform data
  const waveformDataRef = useRef(null);
  const peakDataRef = useRef(null);
  const canvasRef = useRef(null);
  const colorRef = useRef(color);
  
  // Update canvas reference if provided externally
  useEffect(() => {
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, [canvas]);
  
  // Update color when it changes
  useEffect(() => {
    colorRef.current = color;
    
    // Redraw if data exists
    if (isReady && waveformDataRef.current && canvasRef.current) {
      drawWaveform();
    }
  }, [color]);
  
  /**
   * Generate waveform data from an audio buffer
   * 
   * @param {AudioBuffer} buffer - Audio buffer to process
   * @returns {Promise<Float32Array>} Processed waveform data
   */
  const generateWaveformData = useCallback(async (buffer) => {
    if (!buffer) {
      throw new Error('No audio buffer provided');
    }
    
    // Use highest resolution available (all channels combined)
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    
    // Calculate points per pixel for desired resolution
    const pointsPerPixel = Math.max(1, Math.floor(length / resolution));
    
    return new Promise((resolve) => {
      // Use requestAnimationFrame to avoid blocking the main thread
      requestAnimationFrame(() => {
        // Create output arrays
        const waveformData = new Float32Array(resolution);
        const peakData = new Float32Array(resolution);
        
        // Process audio data
        for (let pixel = 0; pixel < resolution; pixel++) {
          const startSample = pixel * pointsPerPixel;
          const endSample = startSample + pointsPerPixel;
          
          let min = 0;
          let max = 0;
          let rms = 0;
          
          // Analyze samples across all channels
          for (let channelNum = 0; channelNum < numberOfChannels; channelNum++) {
            const channelData = buffer.getChannelData(channelNum);
            
            for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex++) {
              if (sampleIndex < length) {
                const sample = channelData[sampleIndex];
                
                // Track min/max for this segment
                min = Math.min(min, sample);
                max = Math.max(max, sample);
                
                // Calculate RMS power
                rms += sample * sample;
              }
            }
          }
          
          // Average RMS across channels and samples
          rms = Math.sqrt(rms / (pointsPerPixel * numberOfChannels));
          
          // Store data
          waveformData[pixel] = (max + Math.abs(min)) / 2; // Average amplitude
          peakData[pixel] = Math.max(Math.abs(min), Math.abs(max)); // Peak amplitude
        }
        
        // Normalize if requested
        if (normalize) {
          const peakMax = Math.max(...peakData);
          const scaleFactor = peakMax > 0 ? 1 / peakMax : 1;
          
          for (let i = 0; i < resolution; i++) {
            waveformData[i] *= scaleFactor;
            peakData[i] *= scaleFactor;
          }
        }
        
        resolve({ waveformData, peakData });
      });
    });
  }, [resolution, normalize]);
  
  /**
   * Process audio buffer and generate waveform data
   * 
   * @param {AudioBuffer} buffer - Audio buffer to process
   * @returns {Promise<boolean>} Success status
   */
  const processAudioBuffer = useCallback(async (buffer) => {
    if (!buffer) {
      setError('No audio buffer provided');
      return false;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { waveformData, peakData } = await generateWaveformData(buffer);
      
      waveformDataRef.current = waveformData;
      peakDataRef.current = peakData;
      
      setIsReady(true);
      setIsProcessing(false);
      
      // Draw if canvas is available
      if (canvasRef.current) {
        drawWaveform();
      }
      
      return true;
    } catch (err) {
      setError(err.message || 'Failed to process audio buffer');
      setIsProcessing(false);
      return false;
    }
  }, [generateWaveformData]);
  
  /**
   * Draw waveform on the canvas
   * 
   * @param {Object} options - Draw options
   * @param {number} options.start - Start position for playhead (0-1)
   * @param {number} options.end - End position for playhead (0-1)
   * @param {string} options.playedColor - Color for the played portion
   * @returns {boolean} Success status
   */
  const drawWaveform = useCallback(({
    start = 0,
    end = 0,
    playedColor = '#60A5FA'
  } = {}) => {
    if (!canvasRef.current || !waveformDataRef.current) {
      return false;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const waveformData = waveformDataRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate center line
    const centerY = height / 2;
    
    // Calculate playhead positions
    const startX = Math.floor(start * width);
    const endX = Math.floor(end * width);
    
    // Draw waveform
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      // Get data point (linear interpolation if needed)
      const dataIndex = Math.min(
        waveformData.length - 1, 
        Math.floor((x / width) * waveformData.length)
      );
      
      const amplitude = waveformData[dataIndex];
      const scaledAmplitude = amplitude * (height * 0.45); // 90% of half height
      
      if (x === 0) {
        ctx.moveTo(x, centerY - scaledAmplitude);
      } else {
        ctx.lineTo(x, centerY - scaledAmplitude);
      }
    }
    
    // Draw from right to left (bottom half)
    for (let x = width - 1; x >= 0; x--) {
      const dataIndex = Math.min(
        waveformData.length - 1, 
        Math.floor((x / width) * waveformData.length)
      );
      
      const amplitude = waveformData[dataIndex];
      const scaledAmplitude = amplitude * (height * 0.45);
      
      ctx.lineTo(x, centerY + scaledAmplitude);
    }
    
    ctx.closePath();
    
    // Fill with gradient based on played portion
    if (start > 0 || end > 0) {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, colorRef.current);
      
      if (start > 0) {
        gradient.addColorStop(start, colorRef.current);
        gradient.addColorStop(start, playedColor);
      }
      
      if (end > 0) {
        gradient.addColorStop(end, playedColor);
        gradient.addColorStop(end, colorRef.current);
      }
      
      gradient.addColorStop(1, colorRef.current);
      
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colorRef.current;
    }
    
    ctx.fill();
    
    return true;
  }, []);
  
  /**
   * Set canvas element
   * 
   * @param {HTMLCanvasElement} canvasElement - Canvas element to use
   */
  const setCanvas = useCallback((canvasElement) => {
    if (!canvasElement) return;
    
    canvasRef.current = canvasElement;
    
    // Draw if data is ready
    if (isReady && waveformDataRef.current) {
      drawWaveform();
    }
  }, [isReady, drawWaveform]);
  
  /**
   * Clear the waveform
   */
  const clear = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    waveformDataRef.current = null;
    peakDataRef.current = null;
    setIsReady(false);
  }, []);
  
  /**
   * Generate a placeholder waveform for visualization
   * 
   * @returns {boolean} Success status
   */
  const generatePlaceholderWaveform = useCallback(() => {
    if (!canvasRef.current) {
      return false;
    }
    
    const width = canvasRef.current.width;
    const placeholderData = new Float32Array(resolution);
    
    // Generate a realistic-looking waveform
    let lastVal = 0.5;
    
    for (let i = 0; i < resolution; i++) {
      // Random walk with some smoothing
      const change = (Math.random() - 0.5) * 0.1;
      lastVal = Math.max(0.05, Math.min(0.95, lastVal + change));
      
      // Add some "sections" to look more like music
      const position = i / resolution;
      
      // Boosted sections
      if (position > 0.3 && position < 0.7) {
        lastVal *= 1.2;
      }
      
      // Add some "beats"
      if (i % 15 === 0) {
        lastVal *= 1.3;
      }
      
      // Ensure we don't exceed range
      placeholderData[i] = Math.min(0.95, lastVal);
    }
    
    // Store data
    waveformDataRef.current = placeholderData;
    peakDataRef.current = new Float32Array(placeholderData);
    
    setIsReady(true);
    
    // Draw waveform
    drawWaveform();
    
    return true;
  }, [resolution, drawWaveform]);
  
  // Process audio buffer when it changes
  useEffect(() => {
    if (audioBuffer) {
      processAudioBuffer(audioBuffer);
    }
  }, [audioBuffer, processAudioBuffer]);
  
  return {
    // State
    isReady,
    isProcessing,
    error,
    
    // Functions
    setCanvas,
    processAudioBuffer,
    drawWaveform,
    clear,
    generatePlaceholderWaveform,
    
    // Data access
    getWaveformData: () => waveformDataRef.current,
    getPeakData: () => peakDataRef.current
  };
};

export default useWaveform;