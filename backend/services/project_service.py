"""
Project service for AI Ensemble Composer

This module handles project-related operations:
- Project creation, retrieval, update, and deletion
- Track management within projects
- Project metadata handling
"""

import os
import json
import time
import uuid
import logging
import tempfile
from typing import Dict, List, Any, Optional, Tuple, Union

# Setup logging
logger = logging.getLogger(__name__)

class ProjectService:
    """
    Service for managing projects and tracks
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the project service
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.storage_dir = self.config.get('storage_dir', os.path.join(tempfile.gettempdir(), 'ai_ensemble_projects'))
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # In-memory project and track caches for faster access
        self.projects_cache = {}
        self.tracks_cache = {}
        
        # Load existing projects into cache
        self._load_existing_projects()
        
        logger.info(f"Project service initialized with storage directory: {self.storage_dir}")
    
    def _load_existing_projects(self) -> None:
        """Load existing projects from storage into memory cache"""
        try:
            # Check if storage directory exists
            if not os.path.exists(self.storage_dir):
                logger.info(f"Storage directory does not exist: {self.storage_dir}")
                return
            
            # Find all project JSON files
            project_files = [f for f in os.listdir(self.storage_dir) if f.endswith('.json')]
            
            # Load each project file
            for project_file in project_files:
                try:
                    project_path = os.path.join(self.storage_dir, project_file)
                    with open(project_path, 'r') as f:
                        project_data = json.load(f)
                    
                    # Add to cache
                    project_id = project_data.get('id')
                    if project_id:
                        self.projects_cache[project_id] = project_data
                        
                        # Load tracks if they exist
                        tracks_dir = os.path.join(self.storage_dir, f"tracks_{project_id}")
                        if os.path.exists(tracks_dir):
                            track_files = [f for f in os.listdir(tracks_dir) if f.endswith('.json')]
                            
                            for track_file in track_files:
                                try:
                                    track_path = os.path.join(tracks_dir, track_file)
                                    with open(track_path, 'r') as f:
                                        track_data = json.load(f)
                                    
                                    track_id = track_data.get('id')
                                    if track_id:
                                        self.tracks_cache[track_id] = track_data
                                except Exception as e:
                                    logger.error(f"Error loading track file {track_file}: {str(e)}")
                except Exception as e:
                    logger.error(f"Error loading project file {project_file}: {str(e)}")
            
            logger.info(f"Loaded {len(self.projects_cache)} projects and {len(self.tracks_cache)} tracks from storage")
        except Exception as e:
            logger.error(f"Error loading existing projects: {str(e)}")
    
    def get_all_projects(self) -> List[Dict[str, Any]]:
        """
        Get all projects
        
        Returns:
            List of project objects
        """
        return list(self.projects_cache.values())
    
    def get_project(self, project_id: str, include_tracks: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get a project by ID
        
        Args:
            project_id: Project ID
            include_tracks: Whether to include track data
            
        Returns:
            Project object or None if not found
        """
        # Get from cache
        project = self.projects_cache.get(project_id)
        
        if not project:
            logger.warning(f"Project not found: {project_id}")
            return None
        
        # Clone the project to avoid modifying the cache
        project_copy = json.loads(json.dumps(project))
        
        # Add tracks if requested
        if include_tracks:
            project_copy['tracks'] = self.get_project_tracks(project_id)
        
        return project_copy
    
    def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new project
        
        Args:
            project_data: Project data
            
        Returns:
            Created project object
        """
        # Generate project ID if not provided
        if 'id' not in project_data:
            project_data['id'] = str(uuid.uuid4())
        
        # Add timestamps
        project_data['created_at'] = project_data.get('created_at', time.time())
        project_data['updated_at'] = time.time()
        
        # Set default values
        project_data['name'] = project_data.get('name', 'Untitled Project')
        project_data['bpm'] = project_data.get('bpm', 120)
        project_data['time_signature'] = project_data.get('time_signature', '4/4')
        
        # Save to storage
        self._save_project(project_data)
        
        # Add to cache
        self.projects_cache[project_data['id']] = project_data
        
        logger.info(f"Created project: {project_data['name']} (ID: {project_data['id']})")
        
        return project_data
    
    def update_project(self, project_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update a project
        
        Args:
            project_id: Project ID
            updates: Fields to update
            
        Returns:
            Updated project object or None if not found
        """
        # Get the project
        project = self.projects_cache.get(project_id)
        
        if not project:
            logger.warning(f"Project not found for update: {project_id}")
            return None
        
        # Update fields
        for key, value in updates.items():
            if key not in ['id', 'created_at']:  # Protect certain fields
                project[key] = value
        
        # Update timestamp
        project['updated_at'] = time.time()
        
        # Save to storage
        self._save_project(project)
        
        logger.info(f"Updated project: {project['name']} (ID: {project_id})")
        
        return project
    
    def delete_project(self, project_id: str) -> bool:
        """
        Delete a project
        
        Args:
            project_id: Project ID
            
        Returns:
            True if deleted, False if not found
        """
        # Check if project exists
        if project_id not in self.projects_cache:
            logger.warning(f"Project not found for deletion: {project_id}")
            return False
        
        # Get project info for logging
        project_name = self.projects_cache[project_id].get('name', 'Untitled Project')
        
        # Delete project file
        project_path = os.path.join(self.storage_dir, f"{project_id}.json")
        if os.path.exists(project_path):
            os.remove(project_path)
        
        # Delete tracks directory
        tracks_dir = os.path.join(self.storage_dir, f"tracks_{project_id}")
        if os.path.exists(tracks_dir):
            for track_file in os.listdir(tracks_dir):
                track_path = os.path.join(tracks_dir, track_file)
                try:
                    os.remove(track_path)
                except Exception as e:
                    logger.error(f"Error deleting track file {track_path}: {str(e)}")
            
            try:
                os.rmdir(tracks_dir)
            except Exception as e:
                logger.error(f"Error deleting tracks directory {tracks_dir}: {str(e)}")
        
        # Remove tracks from cache
        tracks_to_remove = [
            track_id for track_id, track in self.tracks_cache.items()
            if track.get('project_id') == project_id
        ]
        
        for track_id in tracks_to_remove:
            del self.tracks_cache[track_id]
        
        # Remove from cache
        del self.projects_cache[project_id]
        
        logger.info(f"Deleted project: {project_name} (ID: {project_id})")
        
        return True
    
    def get_project_tracks(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all tracks for a project
        
        Args:
            project_id: Project ID
            
        Returns:
            List of track objects
        """
        # Filter tracks by project ID
        project_tracks = [
            track for track in self.tracks_cache.values()
            if track.get('project_id') == project_id
        ]
        
        return project_tracks
    
    def get_track(self, track_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a track by ID
        
        Args:
            track_id: Track ID
            
        Returns:
            Track object or None if not found
        """
        return self.tracks_cache.get(track_id)
    
    def create_track(self, project_id: str, track_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new track in a project
        
        Args:
            project_id: Project ID
            track_data: Track data
            
        Returns:
            Created track object or None if project not found
        """
        # Check if project exists
        if project_id not in self.projects_cache:
            logger.warning(f"Project not found for track creation: {project_id}")
            return None
        
        # Generate track ID if not provided
        if 'id' not in track_data:
            track_data['id'] = str(uuid.uuid4())
        
        # Set project ID
        track_data['project_id'] = project_id
        
        # Add timestamps
        track_data['created_at'] = track_data.get('created_at', time.time())
        
        # Set default values
        track_data['name'] = track_data.get('name', 'New Track')
        track_data['color'] = track_data.get('color', '#3B82F6')  # Default to blue
        track_data['muted'] = track_data.get('muted', False)
        track_data['solo'] = track_data.get('solo', False)
        track_data['volume'] = track_data.get('volume', 70)
        
        # Save to storage
        self._save_track(track_data)
        
        # Add to cache
        self.tracks_cache[track_data['id']] = track_data
        
        logger.info(f"Created track: {track_data['name']} (ID: {track_data['id']}) in project {project_id}")
        
        return track_data
    
    def update_track(self, track_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update a track
        
        Args:
            track_id: Track ID
            updates: Fields to update
            
        Returns:
            Updated track object or None if not found
        """
        # Get the track
        track = self.tracks_cache.get(track_id)
        
        if not track:
            logger.warning(f"Track not found for update: {track_id}")
            return None
        
        # Update fields
        for key, value in updates.items():
            if key not in ['id', 'project_id', 'created_at']:  # Protect certain fields
                track[key] = value
        
        # Save to storage
        self._save_track(track)
        
        logger.info(f"Updated track: {track['name']} (ID: {track_id})")
        
        return track
    
    def delete_track(self, track_id: str) -> bool:
        """
        Delete a track
        
        Args:
            track_id: Track ID
            
        Returns:
            True if deleted, False if not found
        """
        # Check if track exists
        if track_id not in self.tracks_cache:
            logger.warning(f"Track not found for deletion: {track_id}")
            return False
        
        # Get track info for logging
        track = self.tracks_cache[track_id]
        track_name = track.get('name', 'Untitled Track')
        project_id = track.get('project_id')
        
        # Delete track file
        if project_id:
            tracks_dir = os.path.join(self.storage_dir, f"tracks_{project_id}")
            track_path = os.path.join(tracks_dir, f"{track_id}.json")
            
            if os.path.exists(track_path):
                os.remove(track_path)
        
        # Remove from cache
        del self.tracks_cache[track_id]
        
        logger.info(f"Deleted track: {track_name} (ID: {track_id})")
        
        return True
    
    def _save_project(self, project: Dict[str, Any]) -> None:
        """
        Save a project to storage
        
        Args:
            project: Project data
        """
        project_id = project['id']
        project_path = os.path.join(self.storage_dir, f"{project_id}.json")
        
        with open(project_path, 'w') as f:
            json.dump(project, f, indent=2)
    
    def _save_track(self, track: Dict[str, Any]) -> None:
        """
        Save a track to storage
        
        Args:
            track: Track data
        """
        track_id = track['id']
        project_id = track['project_id']
        
        # Ensure tracks directory exists
        tracks_dir = os.path.join(self.storage_dir, f"tracks_{project_id}")
        os.makedirs(tracks_dir, exist_ok=True)
        
        # Save track file
        track_path = os.path.join(tracks_dir, f"{track_id}.json")
        
        with open(track_path, 'w') as f:
            json.dump(track, f, indent=2)


# Create a singleton instance
_instance = None

def get_project_service(config: Optional[Dict[str, Any]] = None) -> ProjectService:
    """
    Get or create the singleton instance of the ProjectService
    
    Args:
        config: Configuration dictionary (only used when creating a new instance)
        
    Returns:
        ProjectService instance
    """
    global _instance
    if _instance is None:
        _instance = ProjectService(config)
    return _instance