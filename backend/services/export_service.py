"""
Export service for AI Ensemble Composer

This module handles exporting projects in various formats:
- Individual WAV stems
- Mixed WAV/MP3 output
- ZIP archives
- Compatibility with DAWs
"""

import os
import json
import zipfile
import tempfile
import logging
import shutil
from typing import Dict, List, Any, Optional, Tuple, BinaryIO, Union

# Import audio processing service
from services.audio_processing import get_audio_processing_service

# Setup logging
logger = logging.getLogger(__name__)

class ExportService:
    """
    Service for exporting projects in various formats
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the export service
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.audio_processing = get_audio_processing_service()
        self.temp_dir = self.config.get('temp_dir', tempfile.gettempdir())
        self.export_dir = self.config.get('export_dir', os.path.join(self.temp_dir, 'exports'))
        
        # Create export directory if it doesn't exist
        os.makedirs(self.export_dir, exist_ok=True)
        
        logger.info(f"Export service initialized with export directory: {self.export_dir}")
    
    def export_project_as_stems(
        self,
        project_id: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]],
        format: str = 'wav'
    ) -> str:
        """
        Export project as individual stem files
        
        Args:
            project_id: Project ID
            project_data: Project metadata
            tracks: List of track data
            format: Audio format ('wav', 'mp3', 'flac', 'ogg')
            
        Returns:
            Path to the ZIP file containing stems
        """
        try:
            # Create a temporary directory for the export
            export_path = os.path.join(self.export_dir, f"project_{project_id}_stems")
            os.makedirs(export_path, exist_ok=True)
            
            # Create metadata file
            metadata = {
                "project": project_data,
                "tracks": [
                    {
                        "id": track["id"],
                        "name": track["name"],
                        "type": track["type"],
                        "color": track["color"],
                        "volume": track.get("volume", 100),
                        "pan": track.get("pan", 0),
                        "muted": track.get("muted", False),
                        "solo": track.get("solo", False)
                    }
                    for track in tracks
                ]
            }
            
            with open(os.path.join(export_path, "metadata.json"), "w") as f:
                json.dump(metadata, f, indent=2)
            
            # Export each track
            for track in tracks:
                # Skip tracks without a file path
                if "file_path" not in track or not os.path.exists(track["file_path"]):
                    logger.warning(f"Track {track.get('id', 'unknown')} has no file path or file doesn't exist")
                    continue
                
                # Create a filename with track name
                safe_name = self._sanitize_filename(track["name"])
                stem_filename = f"{safe_name}.{format}"
                
                # Read the audio data
                audio_data, sample_rate = self.audio_processing.read_audio_file(track["file_path"])
                
                # Apply volume and pan if they exist
                if "volume" in track or "pan" in track:
                    effects = {}
                    if "volume" in track:
                        volume_gain = track["volume"] / 100.0
                        audio_data = audio_data * volume_gain
                    
                    if "pan" in track and track["pan"] != 0:
                        # Convert pan from -100,100 to -1,1
                        pan = track["pan"] / 100
                        
                        # Apply panning (equal power panning)
                        if len(audio_data.shape) > 1:
                            # If stereo, apply pan
                            pan_left = max(0, (1 - pan)) ** 0.5
                            pan_right = max(0, (1 + pan)) ** 0.5
                            
                            audio_data[:, 0] *= pan_left
                            audio_data[:, 1] *= pan_right
                        else:
                            # If mono, convert to stereo with panning
                            pan_left = max(0, (1 - pan)) ** 0.5
                            pan_right = max(0, (1 + pan)) ** 0.5
                            
                            stereo_data = np.zeros((len(audio_data), 2), dtype=audio_data.dtype)
                            stereo_data[:, 0] = audio_data * pan_left
                            stereo_data[:, 1] = audio_data * pan_right
                            audio_data = stereo_data
                
                # Write the processed audio
                output_path = os.path.join(export_path, stem_filename)
                self.audio_processing.write_audio_file(audio_data, output_path, sample_rate, format)
                
                logger.info(f"Exported track {track['name']} to {output_path}")
            
            # Create a ZIP file
            zip_path = export_path + ".zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add files to ZIP
                for root, _, files in os.walk(export_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, export_path)
                        zipf.write(file_path, arcname)
            
            logger.info(f"Created stems ZIP archive at {zip_path}")
            
            # Clean up temporary directory
            shutil.rmtree(export_path, ignore_errors=True)
            
            return zip_path
            
        except Exception as e:
            logger.error(f"Error exporting project as stems: {str(e)}", exc_info=True)
            raise
    
    def export_project_as_mix(
        self,
        project_id: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]],
        format: str = 'wav',
        sample_rate: int = 44100,
        bit_depth: int = 24
    ) -> str:
        """
        Export project as a mixed audio file
        
        Args:
            project_id: Project ID
            project_data: Project metadata
            tracks: List of track data
            format: Audio format ('wav', 'mp3', 'flac', 'ogg')
            sample_rate: Output sample rate
            bit_depth: Bit depth for output file (16, 24, 32)
            
        Returns:
            Path to the mixed audio file
        """
        try:
            # Create a mixed audio file
            output_filename = f"project_{project_id}_mix.{format}"
            output_path = os.path.join(self.export_dir, output_filename)
            
            # Mix tracks
            mixed_audio, mix_sample_rate = self.audio_processing.mix_tracks(tracks, output_path)
            
            # Resample if necessary
            if mix_sample_rate != sample_rate:
                mixed_audio = self.audio_processing.resample_audio(
                    mixed_audio, mix_sample_rate, sample_rate
                )
            
            # Apply normalization
            mixed_audio = self.audio_processing.normalize_audio(mixed_audio)
            
            # Write the final mix
            self.audio_processing.write_audio_file(mixed_audio, output_path, sample_rate, format)
            
            logger.info(f"Exported mixed project to {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error exporting project as mix: {str(e)}", exc_info=True)
            raise
    
    def export_project_as_daw_format(
        self,
        project_id: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]],
        daw_format: str = 'generic'
    ) -> str:
        """
        Export project in a DAW-compatible format
        
        Args:
            project_id: Project ID
            project_data: Project metadata
            tracks: List of track data
            daw_format: Target DAW format ('generic', 'logic', 'protools', 'ableton', 'cubase')
            
        Returns:
            Path to the ZIP file containing DAW project
        """
        try:
            # Create a temporary directory for the export
            export_path = os.path.join(self.export_dir, f"project_{project_id}_{daw_format}")
            os.makedirs(export_path, exist_ok=True)
            
            # Create a subdirectory for audio files
            audio_dir = os.path.join(export_path, "Audio Files")
            os.makedirs(audio_dir, exist_ok=True)
            
            # Export each track as WAV
            for track in tracks:
                # Skip tracks without a file path
                if "file_path" not in track or not os.path.exists(track["file_path"]):
                    logger.warning(f"Track {track.get('id', 'unknown')} has no file path or file doesn't exist")
                    continue
                
                # Create a filename with track name
                safe_name = self._sanitize_filename(track["name"])
                stem_filename = f"{safe_name}.wav"
                
                # Copy the audio file
                audio_data, sample_rate = self.audio_processing.read_audio_file(track["file_path"])
                output_path = os.path.join(audio_dir, stem_filename)
                self.audio_processing.write_audio_file(audio_data, output_path, sample_rate, 'wav')
                
                logger.info(f"Exported track {track['name']} to {output_path}")
            
            # Create DAW-specific project file
            if daw_format == 'logic':
                self._create_logic_project_file(export_path, project_data, tracks)
            elif daw_format == 'protools':
                self._create_protools_project_file(export_path, project_data, tracks)
            elif daw_format == 'ableton':
                self._create_ableton_project_file(export_path, project_data, tracks)
            elif daw_format == 'cubase':
                self._create_cubase_project_file(export_path, project_data, tracks)
            else:
                # Generic format - just create a simple XML file
                self._create_generic_project_file(export_path, project_data, tracks)
            
            # Create a ZIP file
            zip_path = export_path + ".zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add files to ZIP
                for root, _, files in os.walk(export_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, export_path)
                        zipf.write(file_path, arcname)
            
            logger.info(f"Created DAW project ZIP archive at {zip_path}")
            
            # Clean up temporary directory
            shutil.rmtree(export_path, ignore_errors=True)
            
            return zip_path
            
        except Exception as e:
            logger.error(f"Error exporting project as DAW format: {str(e)}", exc_info=True)
            raise
    
    def _create_generic_project_file(
        self,
        export_path: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]]
    ) -> None:
        """Create a generic XML project file"""
        import xml.etree.ElementTree as ET
        from xml.dom import minidom
        
        # Create XML structure
        root = ET.Element("Project")
        ET.SubElement(root, "Name").text = project_data.get("name", "Untitled Project")
        ET.SubElement(root, "BPM").text = str(project_data.get("bpm", 120))
        ET.SubElement(root, "TimeSignature").text = project_data.get("time_signature", "4/4")
        
        tracks_elem = ET.SubElement(root, "Tracks")
        
        for track in tracks:
            track_elem = ET.SubElement(tracks_elem, "Track")
            ET.SubElement(track_elem, "ID").text = track.get("id", "")
            ET.SubElement(track_elem, "Name").text = track.get("name", "")
            ET.SubElement(track_elem, "Type").text = track.get("type", "")
            ET.SubElement(track_elem, "Color").text = track.get("color", "")
            ET.SubElement(track_elem, "Volume").text = str(track.get("volume", 100))
            ET.SubElement(track_elem, "Pan").text = str(track.get("pan", 0))
            ET.SubElement(track_elem, "Muted").text = str(track.get("muted", False)).lower()
            ET.SubElement(track_elem, "Solo").text = str(track.get("solo", False)).lower()
            ET.SubElement(track_elem, "AudioFile").text = f"Audio Files/{self._sanitize_filename(track['name'])}.wav"
        
        # Create a pretty-printed XML string
        xml_string = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
        
        # Write to file
        with open(os.path.join(export_path, "project.xml"), "w") as f:
            f.write(xml_string)
        
        # Create a readme file
        with open(os.path.join(export_path, "README.txt"), "w") as f:
            f.write(f"AI Ensemble Composer Project: {project_data.get('name', 'Untitled')}\n\n")
            f.write("This folder contains:\n")
            f.write("- Audio Files/: WAV files for each track\n")
            f.write("- project.xml: Simple project structure in XML format\n\n")
            f.write("To import into your DAW:\n")
            f.write("1. Create a new project\n")
            f.write("2. Import the WAV files as audio tracks\n")
            f.write("3. Arrange tracks according to your preference\n")
    
    def _create_logic_project_file(
        self,
        export_path: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]]
    ) -> None:
        """Create a Logic Pro project file (simplified)"""
        # In a real implementation, this would create a proper Logic project
        # For now, we'll just create a text file with instructions
        with open(os.path.join(export_path, "logic_import_instructions.txt"), "w") as f:
            f.write(f"Logic Pro Import Instructions for: {project_data.get('name', 'Untitled')}\n\n")
            f.write(f"Project Details:\n")
            f.write(f"- BPM: {project_data.get('bpm', 120)}\n")
            f.write(f"- Time Signature: {project_data.get('time_signature', '4/4')}\n\n")
            f.write("To import into Logic Pro:\n")
            f.write("1. Create a new Logic Pro project\n")
            f.write("2. Set the project BPM to match the value above\n")
            f.write("3. Go to File > Import > Audio Files\n")
            f.write("4. Select all WAV files in the 'Audio Files' folder\n")
            f.write("5. Choose 'Create New Tracks' when prompted\n")
            
            f.write("\nTrack Details:\n")
            for track in tracks:
                f.write(f"- {track.get('name', 'Untitled')}: ")
                f.write(f"Volume: {track.get('volume', 100)}%, ")
                f.write(f"Pan: {track.get('pan', 0)}, ")
                f.write(f"Type: {track.get('type', 'unknown')}\n")
    
    def _create_cubase_project_file(
        self,
        export_path: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]]
    ) -> None:
        """Create a Cubase project file (simplified)"""
        # In a real implementation, this would create a proper Cubase project
        # For now, we'll just create a text file with instructions
        with open(os.path.join(export_path, "cubase_import_instructions.txt"), "w") as f:
            f.write(f"Cubase Import Instructions for: {project_data.get('name', 'Untitled')}\n\n")
            f.write(f"Project Details:\n")
            f.write(f"- BPM: {project_data.get('bpm', 120)}\n")
            f.write(f"- Time Signature: {project_data.get('time_signature', '4/4')}\n\n")
            f.write("To import into Cubase:\n")
            f.write("1. Create a new Cubase project\n")
            f.write("2. Set the project BPM to match the value above\n")
            f.write("3. Go to File > Import > Audio Files\n")
            f.write("4. Select all WAV files in the 'Audio Files' folder\n")
            f.write("5. Choose 'Create New Tracks' when prompted\n")
            
            f.write("\nTrack Details:\n")
            for track in tracks:
                f.write(f"- {track.get('name', 'Untitled')}: ")
                f.write(f"Volume: {track.get('volume', 100)}%, ")
                f.write(f"Pan: {track.get('pan', 0)}, ")
                f.write(f"Type: {track.get('type', 'unknown')}\n")
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize a filename to ensure it's valid across operating systems
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Replace invalid characters
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        
        # Limit length
        if len(filename) > 64:
            filename = filename[:60] + '...'
        
        # Ensure not empty
        if not filename.strip():
            filename = "untitled"
        
        return filename


# Create a singleton instance
_instance = None

def get_export_service(config: Optional[Dict[str, Any]] = None) -> ExportService:
    """
    Get or create the singleton instance of the ExportService
    
    Args:
        config: Configuration dictionary (only used when creating a new instance)
        
    Returns:
        ExportService instance
    """
    global _instance
    if _instance is None:
        _instance = ExportService(config)
    return _instance
    
    def _create_protools_project_file(
        self,
        export_path: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]]
    ) -> None:
        """Create a Pro Tools project file (simplified)"""
        # In a real implementation, this would create a proper Pro Tools session
        # For now, we'll just create a text file with instructions
        with open(os.path.join(export_path, "protools_import_instructions.txt"), "w") as f:
            f.write(f"Pro Tools Import Instructions for: {project_data.get('name', 'Untitled')}\n\n")
            f.write(f"Project Details:\n")
            f.write(f"- BPM: {project_data.get('bpm', 120)}\n")
            f.write(f"- Time Signature: {project_data.get('time_signature', '4/4')}\n\n")
            f.write("To import into Pro Tools:\n")
            f.write("1. Create a new Pro Tools session\n")
            f.write("2. Set the session BPM to match the value above\n")
            f.write("3. Go to File > Import > Audio\n")
            f.write("4. Select all WAV files in the 'Audio Files' folder\n")
            f.write("5. Choose 'New Track' when prompted\n")
            
            f.write("\nTrack Details:\n")
            for track in tracks:
                f.write(f"- {track.get('name', 'Untitled')}: ")
                f.write(f"Volume: {track.get('volume', 100)}%, ")
                f.write(f"Pan: {track.get('pan', 0)}, ")
                f.write(f"Type: {track.get('type', 'unknown')}\n")
    
    def _create_ableton_project_file(
        self,
        export_path: str,
        project_data: Dict[str, Any],
        tracks: List[Dict[str, Any]]
    ) -> None:
        """Create an Ableton Live project file (simplified)"""
        # In a real implementation, this would create a proper Ableton project
        # For now, we'll just create a text file with instructions
        with open(os.path.join(export_path, "ableton_import_instructions.txt"), "w") as f:
            f.write(f"Ableton Live Import Instructions for: {project_data.get('name', 'Untitled')}\n\n")
            f.write(f"Project Details:\n")
            f.write(f"- BPM: {project_data.get('bpm', 120)}\n")
            f.write(f"- Time Signature: {project_data.get('time_signature', '4/4')}\n\n")
            f.write("To import into Ableton Live:\n")
            f.write("1. Create a new Ableton Live project\n")
            f.write("2. Set the project BPM to match the value above\n")
            f.write("3. In the browser, navigate to the 'Audio Files' folder\n")
            f.write("4. Drag and drop each WAV file to create new audio tracks\n")
            
            f.write("\nTrack Details:\n")
            for track in tracks:
                f.write(f"- {track.get('name', 'Untitled')}: ")
                f.write(f"Volume: {track.get('volume', 100)}%, ")
                f.write(f"Pan: {track.get('pan', 0)}, ")
                f.write(f"Type: {track.get('type', 'unknown')}\n")