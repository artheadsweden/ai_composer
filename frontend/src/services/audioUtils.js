/**
 * Audio utility functions for processing and analyzing audio data
 */

// AudioContext singleton for reuse
let audioContextInstance = null;

/**
 * Get or create an AudioContext instance
 * 
 * @returns {AudioContext} The audio context instance
 */
export const getAudioContext = () => {
  if (!audioContextInstance) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextInstance = new AudioContext();
  }
  
  return audioContextInstance;
};

/**
 * Decode an audio file to an AudioBuffer
 * 
 * @param {File|Blob|ArrayBuffer} file - Audio file to decode
 * @returns {Promise<AudioBuffer>} Promise resolving to decoded audio buffer
 */
export const decodeAudioFile = async (file) => {
  const audioContext = getAudioContext();
  
  // Convert File/Blob to ArrayBuffer if needed
  let arrayBuffer;
  
  if (file instanceof File || file instanceof Blob) {
    arrayBuffer = await file.arrayBuffer();
  } else if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else {
    throw new Error('Invalid file format. Expected File, Blob, or ArrayBuffer');
  }
  
  // Decode the audio data
  return await audioContext.decodeAudioData(arrayBuffer);
};

/**
 * Convert audio buffer to WAV format
 * 
 * @param {AudioBuffer} audioBuffer - Audio buffer to convert
 * @param {Object} options - Conversion options
 * @param {number} options.sampleRate - Output sample rate
 * @param {boolean} options.float32 - Whether to use 32-bit float format
 * @returns {Blob} Audio data as WAV blob
 */
export const audioBufferToWav = (audioBuffer, { sampleRate, float32 = false } = {}) => {
  // Use original sample rate if not specified
  const targetSampleRate = sampleRate || audioBuffer.sampleRate;
  
  // Extract parameters
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const outputSampleRate = targetSampleRate || audioBuffer.sampleRate;
  
  // Create buffer with adjusted length if sample rates differ
  const sampleRateRatio = outputSampleRate / audioBuffer.sampleRate;
  const newLength = Math.round(length * sampleRateRatio);
  
  // Create output buffer
  const outputBuffer = new AudioBuffer({
    length: newLength,
    numberOfChannels: numOfChannels,
    sampleRate: outputSampleRate
  });
  
  // Process each channel
  for (let channel = 0; channel < numOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = outputBuffer.getChannelData(channel);
    
    // If sample rates match, copy directly
    if (sampleRateRatio === 1) {
      outputData.set(inputData);
    } else {
      // Otherwise, perform resampling
      for (let i = 0; i < outputData.length; i++) {
        const sourceIdx = Math.floor(i / sampleRateRatio);
        outputData[i] = inputData[sourceIdx];
      }
    }
  }
  
  // Create WAV file
  const wavData = createWavFile(outputBuffer, { isFloat32: float32 });
  
  // Return as Blob
  return new Blob([wavData], { type: 'audio/wav' });
};

/**
 * Create a WAV file from an audio buffer
 * 
 * @param {AudioBuffer} audioBuffer - Audio buffer to convert
 * @param {Object} options - Conversion options
 * @param {boolean} options.isFloat32 - Whether to use 32-bit float format
 * @returns {ArrayBuffer} WAV file data
 */
function createWavFile(audioBuffer, { isFloat32 = false } = {}) {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = isFloat32 ? 32 : 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  
  // WAV header size
  const headerSize = 44;
  
  // Create buffer for the entire WAV file
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, isFloat32 ? 3 : 1, true); // Audio format (1 = PCM, 3 = Float)
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data
  const dataView = new DataView(buffer, headerSize);
  let offset = 0;
  
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      
      if (isFloat32) {
        dataView.setFloat32(offset, sample, true);
      } else {
        // Convert float to 16-bit PCM
        const value = Math.max(-1, Math.min(1, sample));
        const pcmValue = value < 0 ? value * 0x8000 : value * 0x7FFF;
        dataView.setInt16(offset, pcmValue, true);
      }
      
      offset += bytesPerSample;
    }
  }
  
  return buffer;
}

/**
 * Write a string to a DataView
 * 
 * @param {DataView} view - DataView to write to
 * @param {number} offset - Offset to write at
 * @param {string} string - String to write
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Analyze audio to get peak levels, RMS, and other metrics
 * 
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @returns {Object} Analysis results
 */
export const analyzeAudio = (audioBuffer) => {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
  let peak = 0;
  let rms = 0;
  let dcOffset = 0;
  let crest = 0;
  
  // Process each channel
  for (let channel = 0; channel < numOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    
    let channelPeak = 0;
    let channelRmsSquared = 0;
    let channelDcSum = 0;
    
    // Analyze samples
    for (let i = 0; i < length; i++) {
      const sample = channelData[i];
      const sampleAbs = Math.abs(sample);
      
      // Track peak
      channelPeak = Math.max(channelPeak, sampleAbs);
      
      // Sum for RMS calculation
      channelRmsSquared += sample * sample;
      
      // Sum for DC offset calculation
      channelDcSum += sample;
    }
    
    // Calculate channel metrics
    const channelRms = Math.sqrt(channelRmsSquared / length);
    const channelDc = channelDcSum / length;
    
    // Update global metrics (use max of channels)
    peak = Math.max(peak, channelPeak);
    rms += channelRms * channelRms; // Sum squared for multi-channel RMS
    dcOffset += Math.abs(channelDc); // Sum absolute DC offset
  }
  
  // Calculate final metrics
  rms = Math.sqrt(rms / numOfChannels);
  dcOffset = dcOffset / numOfChannels;
  
  // Calculate crest factor (peak to RMS ratio) in dB
  crest = rms > 0 ? 20 * Math.log10(peak / rms) : 0;
  
  // Calculate loudness in dB
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
  
  return {
    peak,
    rms,
    dcOffset,
    crest,
    peakDb,
    rmsDb,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: numOfChannels,
    numberOfSamples: length
  };
};

/**
 * Split an audio buffer into segments based on silence detection
 * 
 * @param {AudioBuffer} audioBuffer - Audio buffer to split
 * @param {Object} options - Split options
 * @param {number} options.threshold - Silence threshold (0-1)
 * @param {number} options.minSilenceDuration - Minimum silence duration in seconds
 * @param {number} options.minSegmentDuration - Minimum segment duration in seconds
 * @returns {Array} Array of segment objects with start and end times
 */
export const splitAudioByDetection = (audioBuffer, {
  threshold = 0.02,
  minSilenceDuration = 0.5,
  minSegmentDuration = 0.5
} = {}) => {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  
  // Convert durations to samples
  const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);
  const minSegmentSamples = Math.floor(minSegmentDuration * sampleRate);
  
  // Combine all channels to detect silence
  const amplitudes = new Float32Array(length);
  
  // Calculate amplitude at each sample point
  for (let i = 0; i < length; i++) {
    let sumSquared = 0;
    
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      sumSquared += sample * sample;
    }
    
    // Root mean square of all channels
    amplitudes[i] = Math.sqrt(sumSquared / numOfChannels);
  }
  
  // Find silence regions
  const segments = [];
  let inSilence = amplitudes[0] < threshold;
  let silenceStart = inSilence ? 0 : -1;
  let segmentStart = inSilence ? -1 : 0;
  
  for (let i = 1; i < length; i++) {
    const isSilent = amplitudes[i] < threshold;
    
    // Transition from sound to silence
    if (!inSilence && isSilent) {
      silenceStart = i;
      inSilence = true;
    } 
    // Transition from silence to sound
    else if (inSilence && !isSilent) {
      const silenceDuration = i - silenceStart;
      
      // If silence is long enough, mark it as a segment boundary
      if (silenceDuration >= minSilenceSamples && segmentStart >= 0) {
        // Calculate segment duration
        const segmentDuration = silenceStart - segmentStart;
        
        // Only add if segment is long enough
        if (segmentDuration >= minSegmentSamples) {
          segments.push({
            start: segmentStart / sampleRate,
            end: silenceStart / sampleRate,
            length: segmentDuration / sampleRate
          });
        }
        
        segmentStart = i;
      } else if (segmentStart < 0) {
        // First segment starts here
        segmentStart = i;
      }
      
      inSilence = false;
    }
  }
  
  // Handle the last segment
  if (segmentStart >= 0 && !inSilence) {
    const segmentDuration = length - segmentStart;
    
    if (segmentDuration >= minSegmentSamples) {
      segments.push({
        start: segmentStart / sampleRate,
        end: length / sampleRate,
        length: segmentDuration / sampleRate
      });
    }
  }
  
  return segments;
};

/**
 * Generate a simplified waveform representation of an audio buffer
 * 
 * @param {AudioBuffer} audioBuffer - Audio buffer to visualize
 * @param {number} numPoints - Number of points in the waveform
 * @returns {Object} Waveform data (min, max, rms arrays)
 */
export const generateWaveformData = (audioBuffer, numPoints = 1000) => {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
  // Initialize arrays
  const waveform = {
    min: new Float32Array(numPoints),
    max: new Float32Array(numPoints),
    rms: new Float32Array(numPoints)
  };
  
  // Calculate number of samples per point
  const samplesPerPoint = Math.floor(length / numPoints);
  
  // Process each point
  for (let point = 0; point < numPoints; point++) {
    const startSample = point * samplesPerPoint;
    const endSample = Math.min(startSample + samplesPerPoint, length);
    
    let min = 0;
    let max = 0;
    let rmsSum = 0;
    
    // Analyze samples for this point
    for (let channel = 0; channel < numOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      
      for (let i = startSample; i < endSample; i++) {
        const sample = channelData[i];
        
        min = Math.min(min, sample);
        max = Math.max(max, sample);
        rmsSum += sample * sample;
      }
    }
    
    // Calculate average across all channels
    const numSamples = (endSample - startSample) * numOfChannels;
    const rms = Math.sqrt(rmsSum / numSamples);
    
    // Store data
    waveform.min[point] = min;
    waveform.max[point] = max;
    waveform.rms[point] = rms;
  }
  
  return waveform;
};

/**
 * Convert seconds to formatted time string (MM:SS.ms)
 * 
 * @param {number} seconds - Time in seconds
 * @param {boolean} showMilliseconds - Whether to include milliseconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds, showMilliseconds = false) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (showMilliseconds) {
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

/**
 * Mix multiple audio buffers together
 * 
 * @param {Array<Object>} buffers - Array of {buffer, gain, pan} objects
 * @param {number} outputDuration - Output duration in seconds (uses longest input if not specified)
 * @param {number} outputSampleRate - Output sample rate (uses highest input if not specified)
 * @returns {Promise<AudioBuffer>} Mixed audio buffer
 */
export const mixAudioBuffers = async (buffers, outputDuration, outputSampleRate) => {
  if (!buffers || buffers.length === 0) {
    throw new Error('No audio buffers provided for mixing');
  }
  
  // Determine output parameters
  let maxDuration = 0;
  let maxSampleRate = 0;
  
  buffers.forEach(({ buffer }) => {
    maxDuration = Math.max(maxDuration, buffer.duration);
    maxSampleRate = Math.max(maxSampleRate, buffer.sampleRate);
  });
  
  // Use provided values or defaults from inputs
  const targetDuration = outputDuration || maxDuration;
  const targetSampleRate = outputSampleRate || maxSampleRate;
  
  // Create output buffer
  const audioContext = getAudioContext();
  const outputLength = Math.ceil(targetDuration * targetSampleRate);
  const outputBuffer = audioContext.createBuffer(2, outputLength, targetSampleRate);
  
  // Get output channels
  const outputL = outputBuffer.getChannelData(0);
  const outputR = outputBuffer.getChannelData(1);
  
  // Mix each input buffer
  buffers.forEach(({ buffer, gain = 1.0, pan = 0.0 }) => {
    // Calculate pan gains (equal power panning)
    const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);
    
    // Calculate resampling ratio if needed
    const resampleRatio = buffer.sampleRate / targetSampleRate;
    
    // Mix each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      
      // Distribute mono input to both stereo channels
      const isMonoToStereo = buffer.numberOfChannels === 1;
      
      for (let i = 0; i < outputLength; i++) {
        // Calculate source sample index with resampling
        const srcIdx = Math.min(Math.floor(i * resampleRatio), buffer.length - 1);
        
        if (srcIdx < inputData.length) {
          const sample = inputData[srcIdx];
          
          // Add to left and right with panning
          if (isMonoToStereo) {
            outputL[i] += sample * leftGain;
            outputR[i] += sample * rightGain;
          } else if (channel === 0) {
            outputL[i] += sample * leftGain;
          } else if (channel === 1) {
            outputR[i] += sample * rightGain;
          }
        }
      }
    }
  });
  
  return outputBuffer;
};

// Export all functions as an object
export default {
  getAudioContext,
  decodeAudioFile,
  audioBufferToWav,
  analyzeAudio,
  splitAudioByDetection,
  generateWaveformData,
  formatTime,
  mixAudioBuffers
};