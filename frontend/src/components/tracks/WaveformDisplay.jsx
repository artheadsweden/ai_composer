import React, { useRef, useEffect, useState } from 'react';
import { useAudioContext } from '../../context/AudioContext';

/**
 * WaveformDisplay component renders an audio waveform visualization
 * for a given audio buffer with interactive features
 */
const WaveformDisplay = ({ 
  audioBuffer, 
  color = '#3B82F6', 
  height = 80,
  isPlaying = false,
  gain = 1.0,
  onPositionChange = null
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { currentTime, duration } = useAudioContext();
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Generate and render waveform when audioBuffer changes
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const containerWidth = containerRef.current.clientWidth;
    
    // Set canvas dimensions
    canvas.width = containerWidth;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, height);
    
    // Prepare for drawing
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    
    // For demo purposes, generate a pseudo-waveform
    // In a real implementation, this would process the actual audioBuffer
    drawPseudoWaveform(ctx, containerWidth, height, audioBuffer);
    
  }, [audioBuffer, color, height]);
  
  // Update playhead position when time changes
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw the playhead
    const playheadPosition = (currentTime / duration) * canvas.width;
    
    // Clear previous playhead
    ctx.clearRect(0, 0, canvas.width, height);
    
    // Redraw waveform
    drawPseudoWaveform(ctx, canvas.width, height, audioBuffer);
    
    // Draw the playhead
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 1;
    ctx.fillRect(playheadPosition - 1, 0, 2, height);
    
  }, [currentTime, isPlaying, duration, audioBuffer, height]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!audioBuffer || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const containerWidth = containerRef.current.clientWidth;
      
      // Resize canvas
      canvas.width = containerWidth;
      
      // Redraw waveform
      ctx.clearRect(0, 0, containerWidth, height);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      drawPseudoWaveform(ctx, containerWidth, height, audioBuffer);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [audioBuffer, color, height]);
  
  // Mouse interactions for position seeking
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;
    
    setHoverPosition(position);
    
    if (isDragging && onPositionChange) {
      onPositionChange(position);
    }
  };
  
  const handleMouseDown = () => {
    if (onPositionChange) {
      setIsDragging(true);
      onPositionChange(hoverPosition);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Draw a pseudo-waveform for visualization purposes
  // In a real implementation, this would process the actual audioBuffer data
  const drawPseudoWaveform = (ctx, width, height, buffer) => {
    // This is a placeholder that generates a realistic-looking waveform
    // In a real implementation, you would analyze the actual audio data
    
    const centerY = height / 2;
    const barWidth = 2;
    const barSpacing = 1;
    const numBars = Math.floor(width / (barWidth + barSpacing));
    
    // Generate random amplitudes with some smoothing to look natural
    const amplitudes = [];
    let lastAmp = Math.random() * 0.5 + 0.2;
    
    for (let i = 0; i < numBars; i++) {
      // Create somewhat smooth transitions between amplitudes
      const change = (Math.random() - 0.5) * 0.2;
      lastAmp = Math.max(0.1, Math.min(0.9, lastAmp + change));
      amplitudes.push(lastAmp);
    }
    
    // Mimic typical audio patterns - higher amplitude in middle sections
    // This makes it look more like real music with verses/chorus
    for (let i = 0; i < numBars; i++) {
      // Create "sections" in the waveform for a more realistic look
      const position = i / numBars;
      
      // Boost middle sections (like a chorus would be louder)
      if (position > 0.3 && position < 0.7) {
        amplitudes[i] *= 1.2;
      }
      
      // Add some "beats" at regular intervals
      if (i % 8 === 0) {
        amplitudes[i] *= 1.3;
      }
      
      // Ensure we don't exceed the height
      amplitudes[i] = Math.min(0.95, amplitudes[i]);
    }
    
    // Apply the gain factor to the amplitudes
    const scaledAmplitudes = amplitudes.map(amp => amp * gain);
    
    // Draw the waveform
    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barSpacing);
      const amplitude = scaledAmplitudes[i] * (height - 10);
      
      // Draw bar from center
      ctx.fillRect(
        x, 
        centerY - amplitude / 2, 
        barWidth, 
        amplitude
      );
    }
  };
  
  // Render hover position indicator
  const renderPositionIndicator = () => {
    if (!isHovering && !isDragging) return null;
    
    const style = {
      left: `${hoverPosition * 100}%`,
      height: '100%',
      width: '1px',
      background: 'rgba(255, 255, 255, 0.7)',
      position: 'absolute',
      top: 0,
      pointerEvents: 'none'
    };
    
    return <div style={style} aria-hidden="true" />;
  };
  
  return (
    <div
      ref={containerRef}
      className="waveform-container relative w-full h-full p-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setIsDragging(false); }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ cursor: onPositionChange ? 'pointer' : 'default' }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        aria-label="Audio waveform visualization"
      />
      {renderPositionIndicator()}
    </div>
  );
};

export default WaveformDisplay;