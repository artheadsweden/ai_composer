"""
Generation service for AI Ensemble Composer

This module handles the orchestration of music generation using the conductor
and instrument models. It coordinates the generation process and ensures that
all instruments work together harmoniously.
"""

import os
import time
import logging
import tempfile
import json
from typing import Dict, List, Any, Optional, Tuple

# Import models
from models.conductor import ConductorModel
from models.instrument_models import InstrumentModelFactory
from models.vocals import create_vocal_model

# Setup logging
logger = logging.getLogger(__name__)

class GenerationService:
    """
    Service for orchestrating AI music generation across multiple instruments
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the generation service
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.conductor = ConductorModel(self.config.get('conductor', {}))
        self.instrument_factory = InstrumentModelFactory()
        self.vocal_model = create_vocal_model(
            self.config.get('vocal_model_path'),
            self.config.get('vocal_config')
        )
        
        # Keep track of active generations
        self.active_generations = {}
        
        # Output directory for generated audio
        self.output_dir = self.config.get('output_dir', tempfile.gettempdir())
        os.makedirs(self.output_dir, exist_ok=True)
        
        logger.info(f"Generation service initialized with output directory: {self.output_dir}")
    
    def generate_music(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a complete musical piece with multiple instruments
        
        Args:
            params: Generation parameters including:
                - style: Musical style
                - tempo: BPM
                - key: Musical key
                - instruments: List of instruments to generate
                - duration: Desired duration in seconds
                - complexity: Complexity level (0-100)
                - lyrics: Optional lyrics for vocal generation
        
        Returns:
            Dictionary with generation results including:
                - tracks: List of generated track info
                - structure: Musical structure used for generation
                - generation_id: Unique ID for this generation
        """
        generation_id = f"gen_{int(time.time())}_{hash(str(params)) % 10000}"
        
        # Store generation parameters and status
        self.active_generations[generation_id] = {
            "params": params,
            "status": "starting",
            "progress": 0,
            "tracks": [],
            "started_at": time.time(),
            "completed_at": None,
            "error": None
        }
        
        try:
            # Extract parameters
            style = params.get('style', 'pop_rock')
            mood = params.get('mood', 'energetic')
            tempo = params.get('tempo', 120)
            key = params.get('key', 'C')
            scale = params.get('scale', 'major')
            instruments = params.get('instruments', ['drums', 'bass', 'piano'])
            duration = params.get('duration', 180)  # 3 minutes default
            complexity = params.get('complexity', 50)
            lyrics = params.get('lyrics', '')
            
            # Generate musical structure with conductor
            logger.info(f"Generating structure for {generation_id} with style {style}")
            
            structure_params = {
                'style': style,
                'tempo': tempo,
                'key': key,
                'scale': scale,
                'complexity': complexity,
                'duration': duration,
                'mood': mood
            }
            
            # Update generation status
            self._update_generation_status(generation_id, "generating_structure", 10)
            
            # Generate overall musical structure
            structure = self.conductor.generate_structure(structure_params)
            
            # Update generation status
            self._update_generation_status(generation_id, "structure_complete", 20)
            
            # Get instrument-specific guidelines from conductor
            instrument_guidelines = self.conductor.generate_instrument_guidelines(structure, instruments)
            
            # Initialize results to store generated tracks
            tracks_info = []
            track_progress_increment = 60 / len(instruments)  # Distribute remaining 60% progress among instruments
            current_progress = 20  # Start from 20%
            
            # Generate each instrument track
            for instrument_type in instruments:
                # Update status for this instrument
                self._update_generation_status(
                    generation_id,
                    f"generating_{instrument_type}",
                    current_progress
                )
                
                # Process vocals separately if needed
                if instrument_type == 'vocals' and lyrics:
                    track_info = self._generate_vocal_track(
                        generation_id, structure, instrument_guidelines.get('vocals', {}), lyrics
                    )
                else:
                    # Generate regular instrument track
                    track_info = self._generate_instrument_track(
                        generation_id, instrument_type, structure, instrument_guidelines.get(instrument_type, {})
                    )
                
                # Add to results
                if track_info:
                    tracks_info.append(track_info)
                
                # Update progress
                current_progress += track_progress_increment
                self._update_generation_status(
                    generation_id,
                    f"completed_{instrument_type}",
                    min(80, current_progress)  # Cap at 80%
                )
            
            # Final processing and cleanup
            self._update_generation_status(generation_id, "finalizing", 90)
            
            # Create final result dictionary
            result = {
                "generation_id": generation_id,
                "tracks": tracks_info,
                "structure": structure,
                "params": {
                    "style": style,
                    "tempo": tempo,
                    "key": key,
                    "scale": scale,
                    "duration": duration
                }
            }
            
            # Update status to complete
            self._update_generation_status(generation_id, "completed", 100)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in generation process: {str(e)}", exc_info=True)
            self._update_generation_status(generation_id, "failed", 0, str(e))
            raise
    
    def _generate_instrument_track(
        self, 
        generation_id: str, 
        instrument_type: str, 
        structure: Dict[str, Any],
        guidelines: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a single instrument track
        
        Args:
            generation_id: Unique generation ID
            instrument_type: Type of instrument to generate
            structure: Musical structure from conductor
            guidelines: Instrument-specific guidelines from conductor
            
        Returns:
            Dictionary with track information
        """
        try:
            # Create appropriate model for this instrument
            instrument_model = self.instrument_factory.create_model(instrument_type)
            
            # Generate audio using the model
            generation_params = {
                "style": structure.get("style", "pop_rock"),
                "mood": structure.get("mood", "energetic"),
                "complexity": structure.get("complexity", 50),
                "description": guidelines.get("description", "")
            }
            
            generation_result = instrument_model.generate(structure, generation_params)
            
            if not generation_result.get('success', False):
                logger.error(f"Failed to generate {instrument_type}: {generation_result.get('message')}")
                return None
            
            # Save audio to file
            track_id = f"{generation_id}_{instrument_type}"
            output_path = os.path.join(self.output_dir, f"{track_id}.wav")
            
            instrument_model.save_audio(generation_result['audio'], output_path)
            
            # Create track info
            track_info = {
                "id": track_id,
                "name": instrument_type.title(),
                "type": instrument_type,
                "file_path": output_path,
                "sample_rate": generation_result.get('sample_rate', 44100),
                "duration": structure.get('total_duration', 0),
                "is_vocal": False,
                "color": self._get_track_color(instrument_type),
                "fallback": generation_result.get('fallback', False)
            }
            
            return track_info
            
        except Exception as e:
            logger.error(f"Error generating {instrument_type} track: {str(e)}", exc_info=True)
            return None
    
    def _generate_vocal_track(
        self,
        generation_id: str,
        structure: Dict[str, Any],
        guidelines: Dict[str, Any],
        lyrics: str
    ) -> Dict[str, Any]:
        """
        Generate a vocal track with lyrics
        
        Args:
            generation_id: Unique generation ID
            structure: Musical structure from conductor
            guidelines: Vocal-specific guidelines from conductor
            lyrics: Lyrics text for vocal generation
            
        Returns:
            Dictionary with track information
        """
        try:
            # Generate vocals using the vocal model
            vocal_params = {
                "style": structure.get("style", "pop_rock"),
                "mood": structure.get("mood", "energetic"),
                "vocal_params": {
                    "gender": guidelines.get("gender", "female"),
                    "style": structure.get("style", "pop"),
                    "emotion": structure.get("mood", "neutral")
                }
            }
            
            # Call the vocal generation model
            result = self.vocal_model.generate_vocals(
                structure=structure,
                params=vocal_params,
                lyrics=lyrics
            )
            
            if not result.get('success', False):
                logger.error(f"Failed to generate vocals: {result.get('error')}")
                return None
            
            # Save audio to file
            track_id = f"{generation_id}_vocals"
            output_path = os.path.join(self.output_dir, f"{track_id}.wav")
            
            # Save the audio data to the output path
            import soundfile as sf
            sf.write(output_path, result['audio_data'], result['sample_rate'])
            
            # Create track info
            track_info = {
                "id": track_id,
                "name": "Vocals",
                "type": "vocals",
                "file_path": output_path,
                "sample_rate": result.get('sample_rate', 44100),
                "duration": result.get('duration', structure.get('total_duration', 0)),
                "is_vocal": True,
                "color": self._get_track_color("vocals"),
                "lyrics": lyrics,
                "lyrics_timing": result.get('lyrics_timing', [])
            }
            
            return track_info
            
        except Exception as e:
            logger.error(f"Error generating vocal track: {str(e)}", exc_info=True)
            return None
    
    def get_generation_status(self, generation_id: str) -> Dict[str, Any]:
        """
        Get the status of an ongoing generation
        
        Args:
            generation_id: ID of the generation to check
            
        Returns:
            Dictionary with generation status information
        """
        if generation_id not in self.active_generations:
            return {
                "generation_id": generation_id,
                "status": "not_found",
                "error": "Generation ID not found"
            }
        
        return {
            "generation_id": generation_id,
            **self.active_generations[generation_id]
        }
    
    def _update_generation_status(
        self,
        generation_id: str,
        status: str,
        progress: int,
        error: Optional[str] = None
    ) -> None:
        """
        Update the status of an ongoing generation
        
        Args:
            generation_id: ID of the generation to update
            status: Current status
            progress: Progress percentage (0-100)
            error: Error message if any
        """
        if generation_id in self.active_generations:
            self.active_generations[generation_id].update({
                "status": status,
                "progress": progress,
                "updated_at": time.time()
            })
            
            if status == "completed":
                self.active_generations[generation_id]["completed_at"] = time.time()
            
            if error:
                self.active_generations[generation_id]["error"] = error
                self.active_generations[generation_id]["status"] = "failed"
            
            logger.info(f"Generation {generation_id}: {status} ({progress}%)")
    
    def _get_track_color(self, instrument_type: str) -> str:
        """
        Get a color for a track based on instrument type
        
        Args:
            instrument_type: Type of instrument
            
        Returns:
            Color hex code
        """
        colors = {
            'drums': '#FF5A5F',
            'bass': '#3D5A80',
            'piano': '#8AC926',
            'guitar': '#FFCA3A',
            'vocals': '#6A4C93',
            'strings': '#4D908E',
            'brass': '#F9844A',
            'synth': '#277DA1'
        }
        
        return colors.get(instrument_type.lower(), '#3B82F6')
    
    def cleanup_old_generations(self, max_age_hours: int = 24) -> int:
        """
        Clean up old generation data
        
        Args:
            max_age_hours: Maximum age in hours to keep
            
        Returns:
            Number of generations cleaned up
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        generations_to_remove = []
        
        # Find old generations
        for gen_id, gen_data in self.active_generations.items():
            if gen_data.get("completed_at") and (current_time - gen_data["completed_at"]) > max_age_seconds:
                generations_to_remove.append(gen_id)
        
        # Clean up files
        for gen_id in generations_to_remove:
            try:
                # Get track file paths
                tracks = self.active_generations[gen_id].get("tracks", [])
                
                # Remove audio files
                for track in tracks:
                    file_path = track.get("file_path")
                    if file_path and os.path.exists(file_path):
                        os.remove(file_path)
                
                # Remove from active generations
                del self.active_generations[gen_id]
                
            except Exception as e:
                logger.error(f"Error cleaning up generation {gen_id}: {str(e)}")
        
        logger.info(f"Cleaned up {len(generations_to_remove)} old generations")
        return len(generations_to_remove)


# Create a singleton instance
_instance = None

def get_generation_service(config: Optional[Dict[str, Any]] = None) -> GenerationService:
    """
    Get or create the singleton instance of the GenerationService
    
    Args:
        config: Configuration dictionary (only used when creating a new instance)
        
    Returns:
        GenerationService instance
    """
    global _instance
    if _instance is None:
        _instance = GenerationService(config)
    return _instance