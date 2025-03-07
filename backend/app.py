from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import uuid
import time
from werkzeug.utils import secure_filename
import tempfile

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure app
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload
app.config['UPLOAD_FOLDER'] = os.path.join(tempfile.gettempdir(), 'ai_ensemble_uploads')
app.config['PROJECT_STORAGE'] = os.path.join(tempfile.gettempdir(), 'ai_ensemble_projects')

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROJECT_STORAGE'], exist_ok=True)

# Mock database for development (replace with real DB in production)
PROJECTS_DB = {}
TRACKS_DB = {}

# Endpoints for project management
@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get all projects"""
    return jsonify(list(PROJECTS_DB.values()))

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get project by ID"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    # Get project data
    project = PROJECTS_DB[project_id]
    
    # Get associated tracks
    project_tracks = [
        track for track_id, track in TRACKS_DB.items() 
        if track['project_id'] == project_id
    ]
    
    # Add tracks to project data
    project_data = {**project, 'tracks': project_tracks}
    
    return jsonify(project_data)

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    data = request.json
    
    if not data or 'name' not in data:
        return jsonify({"error": "Project name is required"}), 400
    
    project_id = str(uuid.uuid4())
    
    project = {
        'id': project_id,
        'name': data['name'],
        'created_at': time.time(),
        'updated_at': time.time(),
        'bpm': data.get('bpm', 120),
        'time_signature': data.get('time_signature', '4/4')
    }
    
    PROJECTS_DB[project_id] = project
    
    # Save project to disk
    with open(os.path.join(app.config['PROJECT_STORAGE'], f"{project_id}.json"), 'w') as f:
        json.dump(project, f)
    
    return jsonify(project), 201

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Update project by ID"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    data = request.json
    
    if not data:
        return jsonify({"error": "No update data provided"}), 400
    
    project = PROJECTS_DB[project_id]
    
    # Update fields
    for key, value in data.items():
        if key in ['name', 'bpm', 'time_signature']:
            project[key] = value
    
    project['updated_at'] = time.time()
    PROJECTS_DB[project_id] = project
    
    # Save updated project to disk
    with open(os.path.join(app.config['PROJECT_STORAGE'], f"{project_id}.json"), 'w') as f:
        json.dump(project, f)
    
    return jsonify(project)

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete project by ID"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    # Delete project
    del PROJECTS_DB[project_id]
    
    # Delete all tracks associated with project
    tracks_to_delete = [
        track_id for track_id, track in TRACKS_DB.items() 
        if track['project_id'] == project_id
    ]
    
    for track_id in tracks_to_delete:
        del TRACKS_DB[track_id]
        # Delete track audio file if it exists
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{track_id}.wav")
        if os.path.exists(audio_path):
            os.remove(audio_path)
    
    # Delete project file
    project_path = os.path.join(app.config['PROJECT_STORAGE'], f"{project_id}.json")
    if os.path.exists(project_path):
        os.remove(project_path)
    
    return '', 204

# Endpoints for track management
@app.route('/api/projects/<project_id>/tracks', methods=['GET'])
def get_tracks(project_id):
    """Get all tracks for a project"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    project_tracks = [
        track for track_id, track in TRACKS_DB.items() 
        if track['project_id'] == project_id
    ]
    
    return jsonify(project_tracks)

@app.route('/api/projects/<project_id>/tracks', methods=['POST'])
def create_track(project_id):
    """Create a new track in a project"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    data = request.json
    
    if not data or 'name' not in data:
        return jsonify({"error": "Track name is required"}), 400
    
    track_id = str(uuid.uuid4())
    
    track = {
        'id': track_id,
        'project_id': project_id,
        'name': data['name'],
        'color': data.get('color', '#3B82F6'),
        'muted': data.get('muted', False),
        'solo': data.get('solo', False),
        'volume': data.get('volume', 70),
        'created_at': time.time()
    }
    
    TRACKS_DB[track_id] = track
    
    return jsonify(track), 201

@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    """Get track by ID"""
    if track_id not in TRACKS_DB:
        return jsonify({"error": "Track not found"}), 404
    
    return jsonify(TRACKS_DB[track_id])

@app.route('/api/tracks/<track_id>', methods=['PUT'])
def update_track(track_id):
    """Update track by ID"""
    if track_id not in TRACKS_DB:
        return jsonify({"error": "Track not found"}), 404
    
    data = request.json
    
    if not data:
        return jsonify({"error": "No update data provided"}), 400
    
    track = TRACKS_DB[track_id]
    
    # Update fields
    for key, value in data.items():
        if key in ['name', 'color', 'muted', 'solo', 'volume']:
            track[key] = value
    
    TRACKS_DB[track_id] = track
    
    return jsonify(track)

@app.route('/api/tracks/<track_id>', methods=['DELETE'])
def delete_track(track_id):
    """Delete track by ID"""
    if track_id not in TRACKS_DB:
        return jsonify({"error": "Track not found"}), 404
    
    # Delete track
    del TRACKS_DB[track_id]
    
    # Delete track audio file if it exists
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{track_id}.wav")
    if os.path.exists(audio_path):
        os.remove(audio_path)
    
    return '', 204

@app.route('/api/tracks/<track_id>/audio', methods=['GET'])
def get_track_audio(track_id):
    """Get audio file for a track"""
    if track_id not in TRACKS_DB:
        return jsonify({"error": "Track not found"}), 404
    
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{track_id}.wav")
    
    if not os.path.exists(audio_path):
        return jsonify({"error": "Audio file not found"}), 404
    
    return send_file(audio_path, mimetype='audio/wav')

@app.route('/api/tracks/<track_id>/audio', methods=['POST'])
def upload_track_audio(track_id):
    """Upload audio file for a track"""
    if track_id not in TRACKS_DB:
        return jsonify({"error": "Track not found"}), 404
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(f"{track_id}.wav")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        return jsonify({"message": "File uploaded successfully"}), 200

# Endpoints for AI generation
@app.route('/api/generation/generate', methods=['POST'])
def generate_music():
    """Generate music using AI models"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No generation parameters provided"}), 400
    
    required_fields = ['project_id', 'style', 'instruments']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    project_id = data['project_id']
    
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    # In a real implementation, this would call the AI models
    # For now, we'll simulate the generation process
    
    # Mock generation process (would be replaced with actual AI generation)
    generation_id = str(uuid.uuid4())
    
    # Simulate processing time
    time.sleep(2)
    
    # Create tracks for each requested instrument
    tracks = []
    
    for instrument in data['instruments']:
        track_id = str(uuid.uuid4())
        
        track = {
            'id': track_id,
            'project_id': project_id,
            'name': instrument,
            'color': get_instrument_color(instrument),
            'muted': False,
            'solo': False,
            'volume': 70,
            'created_at': time.time()
        }
        
        TRACKS_DB[track_id] = track
        tracks.append(track)
        
        # In a real implementation, we would generate audio for each track
        # For now, we'll just create placeholder audio files
        create_placeholder_audio(track_id, instrument)
    
    return jsonify({
        "generation_id": generation_id,
        "tracks": tracks,
        "message": "Generation completed successfully"
    })

@app.route('/api/generation/status/<generation_id>', methods=['GET'])
def get_generation_status(generation_id):
    """Get status of an ongoing generation process"""
    # In a real implementation, this would check the status of the generation process
    # For now, we'll just return a successful status
    
    return jsonify({
        "generation_id": generation_id,
        "status": "completed",
        "progress": 100
    })

# Endpoints for export functionality
@app.route('/api/export/project/<project_id>', methods=['GET'])
def export_project(project_id):
    """Export project to various formats"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    export_format = request.args.get('format', 'zip')
    
    if export_format not in ['zip', 'stems', 'wav']:
        return jsonify({"error": "Unsupported export format"}), 400
    
    # In a real implementation, this would export the project
    # For now, we'll just return a success message
    
    return jsonify({
        "message": f"Project exported successfully in {export_format} format",
        "download_url": f"/api/export/download/{project_id}?format={export_format}"
    })

@app.route('/api/export/download/<project_id>', methods=['GET'])
def download_export(project_id):
    """Download exported project"""
    if project_id not in PROJECTS_DB:
        return jsonify({"error": "Project not found"}), 404
    
    export_format = request.args.get('format', 'zip')
    
    # In a real implementation, this would serve the exported file
    # For now, we'll just return a placeholder file
    
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    temp_file.write(b"This is a placeholder for the exported file")
    temp_file.close()
    
    filename = f"{PROJECTS_DB[project_id]['name']}.{export_format}"
    
    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name=filename,
        mimetype='application/octet-stream'
    )

# Helper functions
def get_instrument_color(instrument):
    """Get a color for an instrument"""
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
    
    return colors.get(instrument.lower(), '#3B82F6')

def create_placeholder_audio(track_id, instrument):
    """Create a placeholder audio file for a track"""
    # In a real implementation, this would create actual audio
    # For now, we'll just create an empty file
    
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{track_id}.wav")
    
    with open(audio_path, 'wb') as f:
        # Write a minimal WAV header
        f.write(b'RIFF')
        f.write((36).to_bytes(4, byteorder='little'))  # File size
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write((16).to_bytes(4, byteorder='little'))  # Format chunk size
        f.write((1).to_bytes(2, byteorder='little'))  # Format tag (PCM)
        f.write((1).to_bytes(2, byteorder='little'))  # Channels
        f.write((44100).to_bytes(4, byteorder='little'))  # Sample rate
        f.write((44100 * 2).to_bytes(4, byteorder='little'))  # Bytes per second
        f.write((2).to_bytes(2, byteorder='little'))  # Block align
        f.write((16).to_bytes(2, byteorder='little'))  # Bits per sample
        f.write(b'data')
        f.write((0).to_bytes(4, byteorder='little'))  # Data chunk size