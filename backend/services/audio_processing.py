"""
Audio processing service for AI Ensemble Composer

This module handles audio processing tasks including:
- Format conversion
- Mixing and normalizing tracks
- Analyzing audio data
- Resampling
"""

import os
import numpy as np
import tempfile
import logging
import soundfile as sf
from typing import Dict, List, Any, Optional, Tuple, Union

# Setup logging
logger = logging.getLogger(__name__)

class AudioProcessingService:
    """
    Service for audio processing tasks
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the audio processing service
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.temp_dir = self.config.get('temp_dir', tempfile.gettempdir())
        
        # Create temp directory if it doesn't exist
        os.makedirs(self.temp_dir, exist_ok=True)
        
        logger.info(f"Audio processing service initialized with temp directory: {self.temp_dir}")
    
    def read_audio_file(self, file_path: str) -> Tuple[np.ndarray, int]:
        """
        Read audio data from a file
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Tuple of (audio_data, sample_rate)
        """
        try:
            data, sample_rate = sf.read(file_path)
            return data, sample_rate
        except Exception as e:
            logger.error(f"Error reading audio file {file_path}: {str(e)}")
            raise
    
    def write_audio_file(
        self, 
        audio_data: np.ndarray, 
        file_path: str, 
        sample_rate: int = 44100,
        format: str = 'wav'
    ) -> str:
        """
        Write audio data to a file
        
        Args:
            audio_data: Audio data as numpy array
            file_path: Output file path
            sample_rate: Sample rate
            format: Output format ('wav', 'ogg', 'flac', etc.)
            
        Returns:
            Path to the written file
        """
        try:
            sf.write(file_path, audio_data, sample_rate, format=format)
            return file_path
        except Exception as e:
            logger.error(f"Error writing audio file {file_path}: {str(e)}")
            raise
    
    def resample_audio(
        self, 
        audio_data: np.ndarray, 
        original_sample_rate: int,
        target_sample_rate: int
    ) -> np.ndarray:
        """
        Resample audio data to a different sample rate
        
        Args:
            audio_data: Audio data as numpy array
            original_sample_rate: Original sample rate
            target_sample_rate: Target sample rate
            
        Returns:
            Resampled audio data
        """
        if original_sample_rate == target_sample_rate:
            return audio_data
        
        try:
            # For simple resampling, we'll use a basic approach
            # For production, consider using librosa or other specialized libraries
            
            # Calculate the resampling ratio
            ratio = target_sample_rate / original_sample_rate
            
            # Calculate new length
            new_length = int(len(audio_data) * ratio)
            
            # Prepare output array
            if len(audio_data.shape) > 1:
                # Multi-channel audio
                num_channels = audio_data.shape[1]
                resampled = np.zeros((new_length, num_channels), dtype=audio_data.dtype)
                
                # Resample each channel
                for channel in range(num_channels):
                    channel_data = audio_data[:, channel]
                    x_original = np.arange(len(channel_data))
                    x_resampled = np.linspace(0, len(channel_data) - 1, new_length)
                    resampled[:, channel] = np.interp(x_resampled, x_original, channel_data)
            else:
                # Mono audio
                x_original = np.arange(len(audio_data))
                x_resampled = np.linspace(0, len(audio_data) - 1, new_length)
                resampled = np.interp(x_resampled, x_original, audio_data)
            
            return resampled
        except Exception as e:
            logger.error(f"Error resampling audio: {str(e)}")
            raise
    
    def normalize_audio(
        self,
        audio_data: np.ndarray,
        target_db: float = -3.0
    ) -> np.ndarray:
        """
        Normalize audio data to a target dB level
        
        Args:
            audio_data: Audio data as numpy array
            target_db: Target peak level in dB
            
        Returns:
            Normalized audio data
        """
        try:
            # Find the peak amplitude
            peak = np.max(np.abs(audio_data))
            
            if peak == 0:
                logger.warning("Cannot normalize: audio data is silent")
                return audio_data
            
            # Calculate the desired gain
            target_linear = 10 ** (target_db / 20)  # Convert dB to linear scale
            gain = target_linear / peak
            
            # Apply gain
            normalized = audio_data * gain
            
            return normalized
        except Exception as e:
            logger.error(f"Error normalizing audio: {str(e)}")
            raise
    
    def mix_tracks(
        self,
        tracks: List[Dict[str, Any]],
        output_path: Optional[str] = None
    ) -> Tuple[np.ndarray, int]:
        """
        Mix multiple audio tracks together
        
        Args:
            tracks: List of track objects with file_path, volume, and pan
            output_path: Optional path to write the mixed audio
            
        Returns:
            Tuple of (mixed_audio, sample_rate)
        """
        try:
            if not tracks:
                raise ValueError("No tracks provided for mixing")
            
            # Initialize variables
            mixed_audio = None
            max_sample_rate = 0
            max_length = 0
            
            # First pass: determine output parameters and read audio
            track_audio_data = []
            for track in tracks:
                # Skip muted tracks
                if track.get('muted', False):
                    continue
                
                # Read audio data
                file_path = track.get('file_path')
                if not file_path or not os.path.exists(file_path):
                    logger.warning(f"Track file not found: {file_path}")
                    continue
                
                audio, sample_rate = self.read_audio_file(file_path)
                
                # Track the maximum sample rate and length
                max_sample_rate = max(max_sample_rate, sample_rate)
                max_length = max(max_length, len(audio) / sample_rate)
                
                # Store audio data
                track_audio_data.append({
                    'audio': audio,
                    'sample_rate': sample_rate,
                    'volume': track.get('volume', 100) / 100,  # Convert percentage to factor
                    'pan': track.get('pan', 0),  # -100 to 100, maps to -1.0 to 1.0
                    'solo': track.get('solo', False)
                })
            
            if not track_audio_data:
                raise ValueError("No valid tracks to mix")
            
            # Check if any track is soloed
            solo_active = any(track['solo'] for track in track_audio_data)
            
            # Calculate output length in samples
            output_length = int(max_length * max_sample_rate)
            
            # Initialize output array (stereo)
            mixed_audio = np.zeros((output_length, 2), dtype=np.float32)
            
            # Second pass: resample, apply volume/pan, and mix
            for track_data in track_audio_data:
                # Skip tracks that aren't soloed if any track is soloed
                if solo_active and not track_data['solo']:
                    continue
                
                audio = track_data['audio']
                sample_rate = track_data['sample_rate']
                volume = track_data['volume']
                
                # Convert pan from -100,100 to -1,1
                pan = track_data['pan'] / 100 if 'pan' in track_data else 0
                
                # Resample if needed
                if sample_rate != max_sample_rate:
                    audio = self.resample_audio(audio, sample_rate, max_sample_rate)
                
                # Convert mono to stereo if needed
                if len(audio.shape) == 1:
                    audio = np.column_stack((audio, audio))
                
                # Apply panning (equal power panning)
                if pan != 0:
                    # Calculate pan gains using equal power panning
                    pan_left = np.cos((pan + 1) * np.pi / 4)
                    pan_right = np.sin((pan + 1) * np.pi / 4)
                    
                    # Apply panning
                    audio[:, 0] *= pan_left
                    audio[:, 1] *= pan_right
                
                # Apply volume
                audio *= volume
                
                # Handle shorter tracks
                track_length = audio.shape[0]
                if track_length < output_length:
                    # Pad with zeros
                    padding = np.zeros((output_length - track_length, 2), dtype=audio.dtype)
                    audio = np.vstack((audio, padding))
                elif track_length > output_length:
                    # Trim to match output length
                    audio = audio[:output_length, :]
                
                # Mix into output
                mixed_audio += audio
            
            # Normalize the final mix
            mixed_audio = self.normalize_audio(mixed_audio)
            
            # Write to file if requested
            if output_path:
                self.write_audio_file(mixed_audio, output_path, max_sample_rate)
            
            return mixed_audio, max_sample_rate
            
        except Exception as e:
            logger.error(f"Error mixing tracks: {str(e)}")
            raise
    
    def trim_silence(
        self,
        audio_data: np.ndarray,
        threshold: float = 0.01,
        min_silence_duration: float = 0.5,
        sample_rate: int = 44100
    ) -> np.ndarray:
        """
        Trim silence from the beginning and end of audio
        
        Args:
            audio_data: Audio data as numpy array
            threshold: Silence threshold (0.0 to 1.0)
            min_silence_duration: Minimum silence duration in seconds
            sample_rate: Sample rate
            
        Returns:
            Trimmed audio data
        """
        try:
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                mono_audio = np.mean(audio_data, axis=1)
            else:
                mono_audio = audio_data
            
            # Get absolute values
            abs_audio = np.abs(mono_audio)
            
            # Calculate silence threshold in samples
            min_silence_samples = int(min_silence_duration * sample_rate)
            
            # Find start index (first non-silent sample)
            start_idx = 0
            for i in range(len(abs_audio)):
                if abs_audio[i] > threshold:
                    start_idx = max(0, i - min_silence_samples)
                    break
            
            # Find end index (last non-silent sample)
            end_idx = len(abs_audio)
            for i in range(len(abs_audio) - 1, -1, -1):
                if abs_audio[i] > threshold:
                    end_idx = min(len(abs_audio), i + min_silence_samples)
                    break
            
            # Trim the audio
            if len(audio_data.shape) > 1:
                return audio_data[start_idx:end_idx, :]
            else:
                return audio_data[start_idx:end_idx]
            
        except Exception as e:
            logger.error(f"Error trimming silence: {str(e)}")
            raise
    
    def apply_fade(
        self,
        audio_data: np.ndarray,
        fade_in_duration: float = 0.0,
        fade_out_duration: float = 0.0,
        sample_rate: int = 44100
    ) -> np.ndarray:
        """
        Apply fade in/out to audio
        
        Args:
            audio_data: Audio data as numpy array
            fade_in_duration: Fade in duration in seconds
            fade_out_duration: Fade out duration in seconds
            sample_rate: Sample rate
            
        Returns:
            Audio data with fades applied
        """
        try:
            # Calculate fade samples
            fade_in_samples = int(fade_in_duration * sample_rate)
            fade_out_samples = int(fade_out_duration * sample_rate)
            
            # Make a copy of the audio
            result = audio_data.copy()
            
            # Apply fade in
            if fade_in_samples > 0:
                fade_in_curve = np.linspace(0, 1, fade_in_samples)
                
                if len(audio_data.shape) > 1:
                    # Stereo
                    for ch in range(audio_data.shape[1]):
                        result[:fade_in_samples, ch] *= fade_in_curve
                else:
                    # Mono
                    result[:fade_in_samples] *= fade_in_curve
            
            # Apply fade out
            if fade_out_samples > 0:
                fade_out_curve = np.linspace(1, 0, fade_out_samples)
                
                if len(audio_data.shape) > 1:
                    # Stereo
                    for ch in range(audio_data.shape[1]):
                        result[-fade_out_samples:, ch] *= fade_out_curve
                else:
                    # Mono
                    result[-fade_out_samples:] *= fade_out_curve
            
            return result
            
        except Exception as e:
            logger.error(f"Error applying fade: {str(e)}")
            raise
    
    def analyze_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 44100
    ) -> Dict[str, Any]:
        """
        Analyze audio data to extract metrics
        
        Args:
            audio_data: Audio data as numpy array
            sample_rate: Sample rate
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                mono_audio = np.mean(audio_data, axis=1)
            else:
                mono_audio = audio_data
            
            # Calculate basic metrics
            duration = len(mono_audio) / sample_rate
            peak = np.max(np.abs(mono_audio))
            rms = np.sqrt(np.mean(np.square(mono_audio)))
            
            # Calculate peak in dB
            peak_db = 20 * np.log10(peak) if peak > 0 else -100
            
            # Calculate RMS in dB
            rms_db = 20 * np.log10(rms) if rms > 0 else -100
            
            # Calculate crest factor (peak to RMS ratio)
            crest_factor = peak / rms if rms > 0 else 0
            crest_factor_db = 20 * np.log10(crest_factor) if crest_factor > 0 else 0
            
            # Check for clipping (samples at or very near +/-1.0)
            clip_threshold = 0.999
            clipped_samples = np.sum(np.abs(mono_audio) >= clip_threshold)
            clipping_percentage = (clipped_samples / len(mono_audio)) * 100
            
            # Calculate DC offset
            dc_offset = np.mean(mono_audio)
            
            # Create a simple frequency analysis using FFT
            # For detailed spectral analysis, consider using librosa or other specialized libraries
            if len(mono_audio) > 1024:
                # Perform FFT on a segment
                n_fft = 2048
                if len(mono_audio) < n_fft:
                    n_fft = len(mono_audio)
                    
                fft_data = np.abs(np.fft.rfft(mono_audio[:n_fft]))
                freqs = np.fft.rfftfreq(n_fft, 1/sample_rate)
                
                # Find dominant frequency
                max_freq_idx = np.argmax(fft_data)
                dominant_freq = freqs[max_freq_idx] if max_freq_idx < len(freqs) else 0
            else:
                fft_data = []
                freqs = []
                dominant_freq = 0
            
            return {
                "duration": duration,
                "peak": float(peak),
                "peak_db": float(peak_db),
                "rms": float(rms),
                "rms_db": float(rms_db),
                "crest_factor": float(crest_factor),
                "crest_factor_db": float(crest_factor_db),
                "clipped_samples": int(clipped_samples),
                "clipping_percentage": float(clipping_percentage),
                "dc_offset": float(dc_offset),
                "dominant_frequency": float(dominant_freq),
                "sample_rate": sample_rate,
                "num_channels": audio_data.shape[1] if len(audio_data.shape) > 1 else 1,
                "num_samples": len(mono_audio)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing audio: {str(e)}")
            raise
    
    def apply_simple_effects(
        self,
        audio_data: np.ndarray,
        effects: Dict[str, Any]
    ) -> np.ndarray:
        """
        Apply simple audio effects
        
        Args:
            audio_data: Audio data as numpy array
            effects: Dictionary of effects to apply
            
        Returns:
            Audio data with effects applied
        """
        try:
            # Make a copy of the input data
            result = audio_data.copy()
            
            # Apply simple EQ (3-band)
            if 'eq' in effects:
                eq = effects['eq']
                
                # Split frequencies (simple approach)
                if len(audio_data.shape) > 1:
                    # Stereo
                    for ch in range(audio_data.shape[1]):
                        # Apply low shelf
                        if 'low' in eq:
                            gain = 10 ** (eq['low'] / 20)  # Convert dB to gain
                            result[:, ch] = self._apply_low_shelf(result[:, ch], gain)
                        
                        # Apply mid band
                        if 'mid' in eq:
                            gain = 10 ** (eq['mid'] / 20)  # Convert dB to gain
                            result[:, ch] = self._apply_mid_band(result[:, ch], gain)
                        
                        # Apply high shelf
                        if 'high' in eq:
                            gain = 10 ** (eq['high'] / 20)  # Convert dB to gain
                            result[:, ch] = self._apply_high_shelf(result[:, ch], gain)
                else:
                    # Mono
                    # Apply low shelf
                    if 'low' in eq:
                        gain = 10 ** (eq['low'] / 20)  # Convert dB to gain
                        result = self._apply_low_shelf(result, gain)
                    
                    # Apply mid band
                    if 'mid' in eq:
                        gain = 10 ** (eq['mid'] / 20)  # Convert dB to gain
                        result = self._apply_mid_band(result, gain)
                    
                    # Apply high shelf
                    if 'high' in eq:
                        gain = 10 ** (eq['high'] / 20)  # Convert dB to gain
                        result = self._apply_high_shelf(result, gain)
            
            # Simple reverb simulation
            if 'reverb' in effects:
                reverb = effects['reverb']
                decay = reverb.get('decay', 0.5)  # 0.0 to 1.0
                wet = reverb.get('wet', 0.3)  # 0.0 to 1.0
                
                if decay > 0 and wet > 0:
                    result = self._apply_simple_reverb(result, decay, wet)
            
            # Simple delay effect
            if 'delay' in effects:
                delay = effects['delay']
                time_ms = delay.get('time', 250)  # in ms
                feedback = delay.get('feedback', 0.3)  # 0.0 to 1.0
                wet = delay.get('wet', 0.3)  # 0.0 to 1.0
                
                if time_ms > 0 and wet > 0:
                    result = self._apply_simple_delay(result, time_ms, feedback, wet)
            
            # Normalize if requested
            if effects.get('normalize', False):
                result = self.normalize_audio(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error applying effects: {str(e)}")
            raise
    
    def _apply_low_shelf(self, audio: np.ndarray, gain: float) -> np.ndarray:
        """Very simple low shelf implementation"""
        # This is a simplified implementation - for production, use a proper DSP library
        # Split the audio into low frequencies (simple moving average as lowpass)
        window_size = 10
        low = np.convolve(audio, np.ones(window_size)/window_size, mode='same')
        
        # Apply gain to low frequencies
        return audio + (low * (gain - 1))
    
    def _apply_mid_band(self, audio: np.ndarray, gain: float) -> np.ndarray:
        """Very simple mid band implementation"""
        # This is a simplified implementation - for production, use a proper DSP library
        # Extract mid band with simple bandpass approximation
        window_size = 5
        low = np.convolve(audio, np.ones(window_size)/window_size, mode='same')
        high = audio - np.convolve(audio, np.ones(window_size*2)/window_size*2, mode='same')
        mid = audio - low - high
        
        # Apply gain to mid frequencies
        return audio + (mid * (gain - 1))
    
    def _apply_high_shelf(self, audio: np.ndarray, gain: float) -> np.ndarray:
        """Very simple high shelf implementation"""
        # This is a simplified implementation - for production, use a proper DSP library
        # Extract high frequencies (audio - lowpass = highpass approximation)
        window_size = 10
        low = np.convolve(audio, np.ones(window_size)/window_size, mode='same')
        high = audio - low
        
        # Apply gain to high frequencies
        return audio + (high * (gain - 1))
    
    def _apply_simple_reverb(self, audio: np.ndarray, decay: float, wet: float) -> np.ndarray:
        """Very simple reverb simulation"""
        # This is a simplified implementation - for production, use a proper DSP library
        # Create impulse response
        impulse_length = int(decay * 48000)  # Decay controls IR length
        impulse = np.random.random(impulse_length) * np.exp(-np.linspace(0, 10, impulse_length))
        impulse = impulse / np.sum(impulse)  # Normalize
        
        # Apply convolution
        if len(audio.shape) > 1:
            # Stereo
            result = audio.copy()
            for ch in range(audio.shape[1]):
                reverb_data = np.convolve(audio[:, ch], impulse, mode='full')[:len(audio)]
                result[:, ch] = (1 - wet) * audio[:, ch] + wet * reverb_data
            return result
        else:
            # Mono
            reverb_data = np.convolve(audio, impulse, mode='full')[:len(audio)]
            return (1 - wet) * audio + wet * reverb_data
    
    def _apply_simple_delay(self, audio: np.ndarray, time_ms: float, feedback: float, wet: float) -> np.ndarray:
        """Very simple delay effect"""
        # This is a simplified implementation - for production, use a proper DSP library
        # Convert delay time to samples
        sample_rate = 44100  # Assume 44.1 kHz
        delay_samples = int(time_ms * sample_rate / 1000)
        
        if delay_samples <= 0:
            return audio
        
        # Create delayed signal
        if len(audio.shape) > 1:
            # Stereo
            result = audio.copy()
            for ch in range(audio.shape[1]):
                delayed = np.zeros_like(audio[:, ch])
                delayed[delay_samples:] = audio[:-delay_samples, ch]
                
                # Apply feedback
                temp = delayed.copy()
                for i in range(5):  # Limit feedback iterations for performance
                    feedback_amount = feedback ** (i + 1)
                    if feedback_amount < 0.01:
                        break
                    
                    delay_idx = delay_samples * (i + 2)
                    if delay_idx < len(delayed):
                        delayed[delay_idx:] += feedback_amount * audio[:-delay_idx, ch]
                
                result[:, ch] = (1 - wet) * audio[:, ch] + wet * delayed
            return result
        else:
            # Mono
            delayed = np.zeros_like(audio)
            delayed[delay_samples:] = audio[:-delay_samples]
            
            # Apply feedback
            temp = delayed.copy()
            for i in range(5):  # Limit feedback iterations for performance
                feedback_amount = feedback ** (i + 1)
                if feedback_amount < 0.01:
                    break
                
                delay_idx = delay_samples * (i + 2)
                if delay_idx < len(delayed):
                    delayed[delay_idx:] += feedback_amount * audio[:-delay_idx]
            
            return (1 - wet) * audio + wet * delayed


# Create a singleton instance
_instance = None

def get_audio_processing_service(config: Optional[Dict[str, Any]] = None) -> AudioProcessingService:
    """
    Get or create the singleton instance of the AudioProcessingService
    
    Args:
        config: Configuration dictionary (only used when creating a new instance)
        
    Returns:
        AudioProcessingService instance
    """
    global _instance
    if _instance is None:
        _instance = AudioProcessingService(config)
    return _instance