"""
Instrument models for AI Ensemble Composer
This module contains classes for generating instrument-specific tracks
using various AI models like AudioCraft and custom models.
"""

import os
import numpy as np
import time
import logging
from abc import ABC, abstractmethod
import tempfile
import soundfile as sf
from typing import Dict, List, Optional, Tuple, Union, Any

# Configure logging
logger = logging.getLogger(__name__)

class InstrumentModel(ABC):
    """
    Base abstract class for all instrument models.
    Each specific instrument type should inherit from this and implement
    the required methods.
    """
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        """
        Initialize the instrument model.
        
        Args:
            model_path: Path to model weights or configuration
            device: Device to run inference on ('cpu', 'cuda', etc.)
        """
        self.model_path = model_path
        self.device = device
        self.model = None
        self.is_loaded = False
        self.sample_rate = 44100  # Default sample rate
    
    @abstractmethod
    def load_model(self) -> bool:
        """
        Load the model from the specified path.
        
        Returns:
            bool: True if loading was successful, False otherwise
        """
        pass
    
    @abstractmethod
    def generate(self, 
                 structure: Dict[str, Any], 
                 params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate audio for the instrument based on the structure and parameters.
        
        Args:
            structure: Musical structure from the conductor model
            params: Generation parameters
            
        Returns:
            Dict containing:
                'audio': The generated audio as numpy array
                'sample_rate': Sample rate of the audio
                'success': Whether generation was successful
                'message': Status message or error
        """
        pass
    
    def save_audio(self, audio: np.ndarray, output_path: str) -> str:
        """
        Save the generated audio to a file.
        
        Args:
            audio: Audio data as numpy array
            output_path: Path to save the audio file
            
        Returns:
            str: Path to the saved file
        """
        if audio is None:
            raise ValueError("No audio data to save")
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Save the audio
        sf.write(output_path, audio, self.sample_rate)
        
        return output_path
    
    def __str__(self) -> str:
        return f"{self.__class__.__name__} (loaded: {self.is_loaded})"


class MusicGenInstrumentModel(InstrumentModel):
    """
    Base class for instruments using Facebook's AudioCraft/MusicGen model
    """
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu', 
                 model_size: str = 'medium'):
        """
        Initialize the MusicGen-based instrument model.
        
        Args:
            model_path: Path to model weights or None to use default
            device: Device to run inference on ('cpu', 'cuda', etc.)
            model_size: Size of the MusicGen model ('small', 'medium', 'large')
        """
        super().__init__(model_path, device)
        self.model_size = model_size
        self.audiocraft_available = self._check_audiocraft_available()
    
    def _check_audiocraft_available(self) -> bool:
        """Check if AudioCraft is available"""
        try:
            # Try to import AudioCraft
            import audiocraft
            return True
        except ImportError:
            logger.warning("AudioCraft library not found. Using fallback generation.")
            return False
    
    def load_model(self) -> bool:
        """
        Load the MusicGen model.
        
        Returns:
            bool: True if loading was successful, False otherwise
        """
        if not self.audiocraft_available:
            logger.warning("AudioCraft not available. Using fallback generation.")
            self.is_loaded = True  # Pretend we loaded for fallback
            return True
        
        try:
            # Import here to avoid dependency if not used
            from audiocraft.models import MusicGen
            
            # Load the model
            self.model = MusicGen.get_pretrained(self.model_size, device=self.device)
            self.is_loaded = True
            logger.info(f"Loaded MusicGen model ({self.model_size}) on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to load MusicGen model: {e}")
            self.is_loaded = False
            return False
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """
        Create a text prompt for MusicGen based on params.
        
        Args:
            instrument_type: Type of instrument (e.g., 'drums', 'bass')
            style: Musical style (e.g., 'rock', 'jazz')
            mood: Mood/energy level (e.g., 'energetic', 'relaxed')
            additional_desc: Additional descriptions
            
        Returns:
            str: Formatted prompt for MusicGen
        """
        # Base prompt template
        prompt = f"{instrument_type} {style} music, {mood}"
        
        # Add additional description if provided
        if additional_desc:
            prompt += f", {additional_desc}"
            
        # Make prompt more specific to instrument
        if instrument_type == "drums":
            prompt += ", isolated drum track, no other instruments"
        elif instrument_type == "bass":
            prompt += ", isolated bass track, deep and rhythmic, no other instruments"
        elif instrument_type == "guitar":
            prompt += ", isolated guitar track, no other instruments"
        elif instrument_type == "piano":
            prompt += ", isolated piano track, no other instruments"
        elif instrument_type == "strings":
            prompt += ", isolated string section, orchestral, no other instruments"
        
        return prompt
    
    def generate(self, 
                 structure: Dict[str, Any], 
                 params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate audio using MusicGen based on structure and parameters.
        
        Args:
            structure: Musical structure from the conductor model
            params: Generation parameters
            
        Returns:
            Dict containing generated audio and metadata
        """
        if not self.is_loaded:
            success = self.load_model()
            if not success:
                return {
                    'audio': None,
                    'sample_rate': self.sample_rate,
                    'success': False,
                    'message': "Failed to load model"
                }
        
        # Extract parameters
        style = params.get('style', 'pop_rock')
        mood = params.get('mood', 'energetic')
        duration = structure.get('duration', 30)  # in seconds
        
        # Get the instrument type from the class name
        instrument_type = self._get_instrument_type()
        
        # Create prompt
        prompt = self._create_prompt(
            instrument_type=instrument_type,
            style=style,
            mood=mood,
            additional_desc=params.get('description', '')
        )
        
        logger.info(f"Generating {instrument_type} with prompt: '{prompt}'")
        
        if not self.audiocraft_available or self.model is None:
            # Fallback to generate dummy audio
            return self._generate_fallback(duration)
        
        try:
            # Set parameters
            self.model.set_generation_params(
                duration=duration,
                temperature=params.get('complexity', 50) / 100 * 0.8 + 0.2,  # Map 0-100 to 0.2-1.0
                cfg_coef=params.get('guidance_scale', 3.0),
                use_sampling=True,
                top_k=250,
                top_p=0.0,
            )
            
            # Generate the audio
            output = self.model.generate([prompt], progress=True)
            
            # Extract waveform (shape: [batch(1), channels(1 or 2), samples])
            # Convert to [samples, channels] format and to float32
            waveform = output[0].cpu().numpy().T.astype(np.float32)
            
            # Get the model's sample rate
            model_sample_rate = self.model.sample_rate
            
            return {
                'audio': waveform,
                'sample_rate': model_sample_rate,
                'success': True,
                'message': "Generation successful",
                'prompt': prompt
            }
            
        except Exception as e:
            logger.error(f"Error generating audio with MusicGen: {e}")
            # Fallback to generate dummy audio
            return self._generate_fallback(duration)
    
    def _generate_fallback(self, duration: float) -> Dict[str, Any]:
        """
        Generate fallback audio when MusicGen is not available or fails.
        
        Args:
            duration: Duration in seconds
            
        Returns:
            Dict containing generated audio and metadata
        """
        logger.info(f"Using fallback audio generation for {self._get_instrument_type()}")
        
        # Create a sine wave as fallback
        samples = int(duration * self.sample_rate)
        t = np.linspace(0, duration, samples, False)
        
        # Generate different tones based on instrument type
        instrument_type = self._get_instrument_type()
        
        if instrument_type == "drums":
            # Simulate drums with noise bursts
            audio = np.zeros(samples)
            # Add kicks every second
            for i in range(0, samples, self.sample_rate):
                if i + 1000 < samples:
                    audio[i:i+1000] = np.random.randn(1000) * np.exp(-np.linspace(0, 10, 1000))
            # Add hi-hats every half second
            for i in range(0, samples, self.sample_rate // 2):
                if i + 500 < samples:
                    audio[i:i+500] += np.random.randn(500) * np.exp(-np.linspace(0, 20, 500)) * 0.5
        
        elif instrument_type == "bass":
            # Low frequency sine wave
            freq = 55  # A1 note
            audio = 0.5 * np.sin(2 * np.pi * freq * t)
            # Add some harmonics
            audio += 0.1 * np.sin(2 * np.pi * freq * 2 * t)
        
        elif instrument_type == "guitar":
            # Mid-frequency with some harmonics
            freq = 196  # G3 note
            audio = 0.3 * np.sin(2 * np.pi * freq * t)
            audio += 0.15 * np.sin(2 * np.pi * freq * 2 * t)
            audio += 0.05 * np.sin(2 * np.pi * freq * 3 * t)
        
        elif instrument_type == "piano":
            # Multiple harmonics
            freq = 261.63  # C4 note
            audio = 0.2 * np.sin(2 * np.pi * freq * t)
            audio += 0.1 * np.sin(2 * np.pi * freq * 2 * t)
            audio += 0.05 * np.sin(2 * np.pi * freq * 3 * t)
            audio += 0.025 * np.sin(2 * np.pi * freq * 4 * t)
        
        elif instrument_type == "strings":
            # Rich harmonics with vibrato
            freq = 440  # A4 note
            vibrato = 5  # Hz
            depth = 0.01
            vibrato_signal = depth * np.sin(2 * np.pi * vibrato * t)
            audio = 0.2 * np.sin(2 * np.pi * freq * (t + vibrato_signal))
            audio += 0.1 * np.sin(2 * np.pi * freq * 2 * (t + vibrato_signal))
            audio += 0.05 * np.sin(2 * np.pi * freq * 3 * t)
        
        else:
            # Default to a simple tone
            freq = 440  # A4 note
            audio = 0.5 * np.sin(2 * np.pi * freq * t)
        
        # Normalize
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio)) * 0.8
        
        # Reshape to [samples, 1] for mono
        audio = audio.reshape(-1, 1)
        
        return {
            'audio': audio,
            'sample_rate': self.sample_rate,
            'success': True,
            'message': "Generated fallback audio",
            'fallback': True
        }
    
    def _get_instrument_type(self) -> str:
        """Extract instrument type from class name"""
        class_name = self.__class__.__name__.lower()
        if "drum" in class_name:
            return "drums"
        elif "bass" in class_name:
            return "bass"
        elif "guitar" in class_name:
            return "guitar"
        elif "piano" in class_name:
            return "piano"
        elif "string" in class_name:
            return "strings"
        elif "synth" in class_name:
            return "synthesizer"
        elif "vocal" in class_name:
            return "vocals"
        else:
            return "instrument"


# Specific instrument implementations
class DrumsModel(MusicGenInstrumentModel):
    """Drums generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create drum-specific prompts"""
        base_prompt = super()._create_prompt(instrument_type, style, mood, additional_desc)
        
        # Add drum-specific elements
        drum_desc = "isolated drum track, clear kicks and snares, "
        
        if 'rock' in style:
            drum_desc += "powerful drum kit, dynamic fills, solid rhythm"
        elif 'jazz' in style:
            drum_desc += "brushes and cymbals, swinging rhythm, subtle dynamics"
        elif 'hip_hop' in style:
            drum_desc += "tight kick, snappy snare, trap hi-hats, booming 808s"
        elif 'electronic' in style:
            drum_desc += "electronic drum samples, precise rhythm, programmed beats"
        
        return f"{base_prompt}, {drum_desc}"


class BassModel(MusicGenInstrumentModel):
    """Bass generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create bass-specific prompts"""
        base_prompt = super()._create_prompt(instrument_type, style, mood, additional_desc)
        
        # Add bass-specific elements
        bass_desc = "isolated bass track, deep and rich tone, "
        
        if 'rock' in style:
            bass_desc += "driving bass guitar, punchy and rhythmic"
        elif 'jazz' in style:
            bass_desc += "walking bass line, upright bass, warm tone"
        elif 'hip_hop' in style:
            bass_desc += "deep sub bass, 808 bass, powerful and resonant"
        elif 'electronic' in style:
            bass_desc += "synthesizer bass, filtered and resonant"
        
        return f"{base_prompt}, {bass_desc}"


class GuitarModel(MusicGenInstrumentModel):
    """Guitar generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create guitar-specific prompts"""
        base_prompt = super()._create_prompt(instrument_type, style, mood, additional_desc)
        
        # Add guitar-specific elements
        guitar_desc = "isolated guitar track, clear and detailed, "
        
        if 'rock' in style:
            guitar_desc += "electric guitar, distorted chords, powerful riffs"
        elif 'jazz' in style:
            guitar_desc += "jazz guitar, clean tone, complex chords, melodic lines"
        elif 'folk' in style:
            guitar_desc += "acoustic guitar, finger picking, warm sound"
        elif 'metal' in style:
            guitar_desc += "heavily distorted electric guitar, palm-muted power chords, aggressive playing"
        
        return f"{base_prompt}, {guitar_desc}"


class PianoModel(MusicGenInstrumentModel):
    """Piano generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create piano-specific prompts"""
        base_prompt = super()._create_prompt(instrument_type, style, mood, additional_desc)
        
        # Add piano-specific elements
        piano_desc = "isolated piano track, rich harmonics, "
        
        if 'classical' in style:
            piano_desc += "concert grand piano, expressive dynamics, legato phrasing"
        elif 'jazz' in style:
            piano_desc += "jazz piano voicings, complex chord progressions, bluesy runs"
        elif 'pop' in style:
            piano_desc += "pop piano, clear chord progressions, melodic right hand"
        elif 'ambient' in style:
            piano_desc += "atmospheric piano, sustain pedal, spacious and reverberant"
        
        return f"{base_prompt}, {piano_desc}"


class StringsModel(MusicGenInstrumentModel):
    """Strings generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create strings-specific prompts"""
        base_prompt = super()._create_prompt(instrument_type, style, mood, additional_desc)
        
        # Add strings-specific elements
        strings_desc = "isolated string section, orchestral strings, "
        
        if 'classical' in style:
            strings_desc += "full orchestra string section, vibrato, dynamic expression"
        elif 'cinematic' in style:
            strings_desc += "epic film score strings, dramatic swells, emotional phrases"
        elif 'pop' in style:
            strings_desc += "pop string arrangement, lush pads, supporting harmonies"
        elif 'ambient' in style:
            strings_desc += "atmospheric strings, textural playing, long sustain"
        
        return f"{base_prompt}, {strings_desc}"


class SynthModel(MusicGenInstrumentModel):
    """Synthesizer generation model using MusicGen"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        super().__init__(model_path, device)
    
    def _create_prompt(self, 
                       instrument_type: str, 
                       style: str, 
                       mood: str,
                       additional_desc: str = "") -> str:
        """Override to create synth-specific prompts"""
        base_prompt = super()._create_prompt("synthesizer", style, mood, additional_desc)
        
        # Add synth-specific elements
        synth_desc = "isolated synthesizer track, electronic timbres, "
        
        if 'electronic' in style:
            synth_desc += "dance music synthesizer, arpeggiators, filter sweeps"
        elif 'ambient' in style:
            synth_desc += "ambient pads, evolving textures, atmospheric synthesizers"
        elif 'pop' in style:
            synth_desc += "pop synth leads, catchy melodies, bright timbres"
        elif 'retro' in style:
            synth_desc += "vintage analog synthesizer, 80s style, warm oscillators"
        
        return f"{base_prompt}, {synth_desc}"


class VocalModel(InstrumentModel):
    """
    Vocal generation model using YuE or other TTS/singing models
    """
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        """
        Initialize the vocal model.
        
        Args:
            model_path: Path to model weights or configuration
            device: Device to run inference on ('cpu', 'cuda', etc.)
        """
        super().__init__(model_path, device)
        self.yue_available = self._check_yue_available()
    
    def _check_yue_available(self) -> bool:
        """Check if YuE is available"""
        try:
            # Try to import YuE (this would be the actual import in production)
            # import yue
            # For now, we'll just return False to use the fallback
            return False
        except ImportError:
            logger.warning("YuE library not found. Using fallback vocal generation.")
            return False
    
    def load_model(self) -> bool:
        """
        Load the vocal model.
        
        Returns:
            bool: True if loading was successful, False otherwise
        """
        if not self.yue_available:
            logger.warning("YuE not available. Using fallback generation.")
            self.is_loaded = True  # Pretend we loaded for fallback
            return True
        
        try:
            # This would be the actual loading code for YuE
            # self.model = yue.load_model(self.model_path)
            # self.is_loaded = True
            
            # For now, just pretend we loaded
            self.is_loaded = True
            logger.info(f"Loaded YuE model on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to load YuE model: {e}")
            self.is_loaded = False
            return False
    
    def generate(self, 
                 structure: Dict[str, Any], 
                 params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate vocal audio based on structure and parameters.
        
        Args:
            structure: Musical structure from the conductor model
            params: Generation parameters
            
        Returns:
            Dict containing:
                'audio': The generated audio as numpy array
                'sample_rate': Sample rate of the audio
                'success': Whether generation was successful
                'message': Status message or error
        """
        if not self.is_loaded:
            success = self.load_model()
            if not success:
                return {
                    'audio': None,
                    'sample_rate': self.sample_rate,
                    'success': False,
                    'message': "Failed to load model"
                }
        
        # Extract parameters
        style = params.get('style', 'pop_rock')
        mood = params.get('mood', 'energetic')
        duration = structure.get('duration', 30)  # in seconds
        lyrics = params.get('lyrics', '')
        
        logger.info(f"Generating vocals with style: {style}, mood: {mood}")
        
        if not self.yue_available or not lyrics:
            # Fallback to generate dummy audio
            return self._generate_fallback(duration)
        
        try:
            # This would be the actual generation code for YuE
            # output = self.model.generate_singing(
            #     lyrics=lyrics,
            #     melody=structure.get('melody', None),
            #     tempo=structure.get('tempo', 120),
            #     key=structure.get('key', 'C'),
            #     style=style,
            #     duration=duration
            # )
            # waveform = output.waveform
            
            # For now, just generate fallback
            return self._generate_fallback(duration)
            
        except Exception as e:
            logger.error(f"Error generating vocals: {e}")
            return self._generate_fallback(duration)
    
    def _generate_fallback(self, duration: float) -> Dict[str, Any]:
        """
        Generate fallback audio when vocal model is not available or fails.
        
        Args:
            duration: Duration in seconds
            
        Returns:
            Dict containing generated audio and metadata
        """
        logger.info("Using fallback audio generation for vocals")
        
        # Create a vocal-like sound using harmonics
        samples = int(duration * self.sample_rate)
        t = np.linspace(0, duration, samples, False)
        
        # Generate a vowel-like sound (formant synthesis)
        # Fundamental frequency (pitch) - A4 = 440 Hz
        f0 = 440
        
        # Formant frequencies for a typical "ah" vowel
        formants = [800, 1200, 2800, 3500]
        formant_gains = [1.0, 0.5, 0.2, 0.1]
        formant_bandwidths = [80, 90, 120, 130]
        
        # Create vibrato
        vibrato_rate = 5  # Hz
        vibrato_depth = 0.01
        vibrato = vibrato_depth * np.sin(2 * np.pi * vibrato_rate * t)
        
        # Create pitch contour (slight variation)
        pitch_contour = f0 * (1 + vibrato)
        
        # Create vowel sound with formants
        audio = np.zeros(samples)
        for i, (formant, gain, bandwidth) in enumerate(zip(formants, formant_gains, formant_bandwidths)):
            # Each formant is a resonance around the fundamental
            formant_signal = gain * np.sin(2 * np.pi * formant * t)
            
            # Apply envelope to simulate bandwidth
            envelope = np.exp(-2 * np.pi * bandwidth * t)
            envelope = envelope / np.max(envelope)
            
            audio += formant_signal * envelope
        
        # Amplitude envelope to simulate words
        word_length = self.sample_rate  # 1 second per "word"
        num_words = int(samples / word_length)
        
        for i in range(num_words):
            start = i * word_length
            end = min((i + 1) * word_length, samples)
            
            # Create word envelope (attack-sustain-release)
            attack = int(0.1 * word_length)
            release = int(0.3 * word_length)
            
            envelope = np.ones(end - start)
            if attack > 0:
                envelope[:attack] = np.linspace(0, 1, attack)
            if release > 0 and end - start > release:
                envelope[-release:] = np.linspace(1, 0, release)
            
            # Apply envelope to this word segment
            audio[start:end] *= envelope
            
            # Add small pause between words
            pause_start = end - int(0.2 * word_length)
            if pause_start < samples:
                pause_end = min(end, samples)
                pause_length = pause_end - pause_start
                if pause_length > 0:
                    audio[pause_start:pause_end] *= np.linspace(1, 0, pause_length)
        
        # Normalize
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio)) * 0.8
        
        # Reshape to [samples, 1] for mono
        audio = audio.reshape(-1, 1)
        
        return {
            'audio': audio,
            'sample_rate': self.sample_rate,
            'success': True,
            'message': "Generated fallback vocal audio",
            'fallback': True
        }


# Factory class to create the appropriate instrument model
class InstrumentModelFactory:
    """Factory class to create instrument models based on type"""
    
    @staticmethod
    def create_model(instrument_type: str, model_path: Optional[str] = None, 
                     device: str = 'cpu') -> InstrumentModel:
        """
        Create and return an instrument model based on type.
        
        Args:
            instrument_type: Type of instrument to create model for
            model_path: Path to model weights or None to use default
            device: Device to run inference on ('cpu', 'cuda', etc.)
            
        Returns:
            InstrumentModel: The created instrument model
            
        Raises:
            ValueError: If the instrument type is not supported
        """
        instrument_type = instrument_type.lower()
        
        if instrument_type == 'drums':
            return DrumsModel(model_path, device)
        elif instrument_type == 'bass':
            return BassModel(model_path, device)
        elif instrument_type == 'guitar':
            return GuitarModel(model_path, device)
        elif instrument_type == 'piano':
            return PianoModel(model_path, device)
        elif instrument_type == 'strings':
            return StringsModel(model_path, device)
        elif instrument_type == 'synth' or instrument_type == 'synthesizer':
            return SynthModel(model_path, device)
        elif instrument_type == 'vocals' or instrument_type == 'voice':
            return VocalModel(model_path, device)
        else:
            raise ValueError(f"Unsupported instrument type: {instrument_type}")