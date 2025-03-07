/**
 * API service for communicating with the backend
 * Handles all HTTP requests and response processing
 */

// Base API URL - configurable based on environment
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 30000;

// Default headers for all requests
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

/**
 * Create a timeout promise that rejects after specified milliseconds
 * 
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
const createTimeoutPromise = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
};

/**
 * Handle API response
 * 
 * @param {Response} response - Fetch response object
 * @returns {Promise} Promise that resolves with the parsed response or rejects with error
 */
const handleResponse = async (response) => {
  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  // Parse response
  const data = isJson ? await response.json() : await response.text();
  
  // Handle error responses
  if (!response.ok) {
    // Try to extract error message from response
    const errorMessage = isJson && data.error ? data.error : 'Request failed';
    
    // Create error object with response details
    const error = new Error(errorMessage);
    error.status = response.status;
    error.statusText = response.statusText;
    error.data = data;
    
    throw error;
  }
  
  return data;
};

/**
 * Make a request to the API
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise} Promise that resolves with the response data
 */
const apiRequest = async (endpoint, options = {}) => {
  // Build request URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  // Set up request options
  const requestOptions = {
    method: options.method || 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers
    },
    credentials: 'include', // Include cookies in requests
    ...options
  };
  
  // Add body for non-GET requests if provided
  if (requestOptions.method !== 'GET' && options.body) {
    requestOptions.body = 
      typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
  }
  
  // Remove headers and body from options object
  delete requestOptions.headers;
  delete requestOptions.body;
  
  try {
    // Create fetch promise
    const fetchPromise = fetch(url, {
      method: requestOptions.method,
      headers: options.headers || DEFAULT_HEADERS,
      body: options.body ? 
        (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : 
        undefined,
      credentials: 'include',
      ...requestOptions
    });
    
    // Add timeout
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    
    // Race fetch against timeout
    const response = await Promise.race([
      fetchPromise,
      createTimeoutPromise(timeout)
    ]);
    
    // Handle response
    return await handleResponse(response);
  } catch (error) {
    // Enhance error with request details
    error.endpoint = endpoint;
    error.request = requestOptions;
    
    throw error;
  }
};

// API methods for projects
const projects = {
  /**
   * Get all projects
   * 
   * @returns {Promise} Promise resolving to array of projects
   */
  getAll: () => {
    return apiRequest('/projects');
  },
  
  /**
   * Get a single project by ID
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise resolving to project object
   */
  getById: (projectId) => {
    return apiRequest(`/projects/${projectId}`);
  },
  
  /**
   * Create a new project
   * 
   * @param {Object} projectData - Project data
   * @returns {Promise} Promise resolving to created project
   */
  create: (projectData) => {
    return apiRequest('/projects', {
      method: 'POST',
      body: projectData
    });
  },
  
  /**
   * Update a project
   * 
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise} Promise resolving to updated project
   */
  update: (projectId, projectData) => {
    return apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: projectData
    });
  },
  
  /**
   * Delete a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise resolving when project is deleted
   */
  delete: (projectId) => {
    return apiRequest(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  }
};

// API methods for tracks
const tracks = {
  /**
   * Get all tracks for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise resolving to array of tracks
   */
  getAll: (projectId) => {
    return apiRequest(`/projects/${projectId}/tracks`);
  },
  
  /**
   * Get a single track by ID
   * 
   * @param {string} trackId - Track ID
   * @returns {Promise} Promise resolving to track object
   */
  getById: (trackId) => {
    return apiRequest(`/tracks/${trackId}`);
  },
  
  /**
   * Create a new track in a project
   * 
   * @param {string} projectId - Project ID
   * @param {Object} trackData - Track data
   * @returns {Promise} Promise resolving to created track
   */
  create: (projectId, trackData) => {
    return apiRequest(`/projects/${projectId}/tracks`, {
      method: 'POST',
      body: trackData
    });
  },
  
  /**
   * Update a track
   * 
   * @param {string} trackId - Track ID
   * @param {Object} trackData - Updated track data
   * @returns {Promise} Promise resolving to updated track
   */
  update: (trackId, trackData) => {
    return apiRequest(`/tracks/${trackId}`, {
      method: 'PUT',
      body: trackData
    });
  },
  
  /**
   * Delete a track
   * 
   * @param {string} trackId - Track ID
   * @returns {Promise} Promise resolving when track is deleted
   */
  delete: (trackId) => {
    return apiRequest(`/tracks/${trackId}`, {
      method: 'DELETE'
    });
  },
  
  /**
   * Upload audio file for a track
   * 
   * @param {string} trackId - Track ID
   * @param {File} file - Audio file to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Promise resolving when upload is complete
   */
  uploadAudio: (trackId, file, onProgress) => {
    return new Promise((resolve, reject) => {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      
      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred during upload'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });
      
      // Open and send request
      xhr.open('POST', `${API_URL}/tracks/${trackId}/audio`);
      xhr.send(formData);
    });
  },
  
  /**
   * Get audio file URL for a track
   * 
   * @param {string} trackId - Track ID
   * @returns {string} URL for track audio
   */
  getAudioUrl: (trackId) => {
    return `${API_URL}/tracks/${trackId}/audio`;
  }
};

// API methods for generation
const generation = {
  /**
   * Generate music with AI
   * 
   * @param {Object} params - Generation parameters
   * @returns {Promise} Promise resolving to generation result
   */
  generate: (params) => {
    return apiRequest('/generation/generate', {
      method: 'POST',
      body: params,
      timeout: 60000 // Longer timeout for generation
    });
  },
  
  /**
   * Get status of an ongoing generation
   * 
   * @param {string} generationId - Generation ID
   * @returns {Promise} Promise resolving to generation status
   */
  getStatus: (generationId) => {
    return apiRequest(`/generation/status/${generationId}`);
  },
  
  /**
   * Cancel an ongoing generation
   * 
   * @param {string} generationId - Generation ID
   * @returns {Promise} Promise resolving when generation is cancelled
   */
  cancel: (generationId) => {
    return apiRequest(`/generation/cancel/${generationId}`, {
      method: 'POST'
    });
  }
};

// API methods for export
const exportApi = {
  /**
   * Export project to various formats
   * 
   * @param {string} projectId - Project ID
   * @param {string} format - Export format (zip, stems, wav, etc.)
   * @returns {Promise} Promise resolving to export result
   */
  exportProject: (projectId, format = 'zip') => {
    return apiRequest(`/export/project/${projectId}?format=${format}`);
  },
  
  /**
   * Get download URL for exported project
   * 
   * @param {string} projectId - Project ID
   * @param {string} format - Export format
   * @returns {string} Download URL
   */
  getDownloadUrl: (projectId, format = 'zip') => {
    return `${API_URL}/export/download/${projectId}?format=${format}`;
  }
};

// Combined API object
const api = {
  // Resource endpoints
  projects,
  tracks,
  generation,
  export: exportApi,
  
  // Base request method for custom endpoints
  request: apiRequest,
  
  // Utility to get full API URL for an endpoint
  getUrl: (endpoint) => `${API_URL}${endpoint}`
};

export default api;