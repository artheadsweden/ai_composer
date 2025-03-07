/**
 * Storage utility functions for managing local storage,
 * IndexedDB, and file system operations
 */

// Constants for storage keys
const STORAGE_KEYS = {
    PROJECTS: 'ai_ensemble_projects',
    RECENT_PROJECTS: 'ai_ensemble_recent_projects',
    USER_PREFERENCES: 'ai_ensemble_preferences',
    AUTH_TOKEN: 'ai_ensemble_auth_token',
    THEMES: 'ai_ensemble_themes'
  };
  
  // IndexedDB database name and version
  const DB_NAME = 'ai_ensemble_composer';
  const DB_VERSION = 1;
  
  // IndexedDB store names
  const STORES = {
    PROJECTS: 'projects',
    AUDIO_CACHE: 'audiocache'
  };
  
  /**
   * Initialize the IndexedDB database
   * 
   * @returns {Promise<IDBDatabase>} Promise resolving to the database connection
   */
  const initDatabase = () => {
    return new Promise((resolve, reject) => {
      // Open database connection
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      // Handle database upgrade/creation
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create projects store if it doesn't exist
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Create audio cache store if it doesn't exist
        if (!db.objectStoreNames.contains(STORES.AUDIO_CACHE)) {
          const audioCacheStore = db.createObjectStore(STORES.AUDIO_CACHE, { keyPath: 'id' });
          audioCacheStore.createIndex('projectId', 'projectId', { unique: false });
          audioCacheStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      
      // Handle success
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      // Handle error
      request.onerror = (event) => {
        reject(new Error(`Failed to open IndexedDB: ${event.target.error.message}`));
      };
    });
  };
  
  /**
   * Get a database transaction for a specific store
   * 
   * @param {string} storeName - Name of the store to use
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @returns {Promise<IDBObjectStore>} Promise resolving to the store object
   */
  const getStore = async (storeName, mode = 'readonly') => {
    const db = await initDatabase();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  };
  
  /**
   * Save a value to local storage
   * 
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON-serialized)
   * @returns {boolean} True if successful
   */
  export const saveToLocalStorage = (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage: ${error.message}`);
      return false;
    }
  };
  
  /**
   * Load a value from local storage
   * 
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Parsed value or default
   */
  export const loadFromLocalStorage = (key, defaultValue = null) => {
    try {
      const serialized = localStorage.getItem(key);
      
      if (serialized === null) {
        return defaultValue;
      }
      
      return JSON.parse(serialized);
    } catch (error) {
      console.error(`Error loading from localStorage: ${error.message}`);
      return defaultValue;
    }
  };
  
  /**
   * Remove a value from local storage
   * 
   * @param {string} key - Storage key
   * @returns {boolean} True if successful
   */
  export const removeFromLocalStorage = (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${error.message}`);
      return false;
    }
  };
  
  /**
   * Clear all application data from local storage
   * 
   * @returns {boolean} True if successful
   */
  export const clearAllLocalStorage = () => {
    try {
      // Remove only app-specific keys
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error(`Error clearing localStorage: ${error.message}`);
      return false;
    }
  };
  
  /**
   * Save user preferences to local storage
   * 
   * @param {Object} preferences - User preferences object
   * @returns {boolean} True if successful
   */
  export const savePreferences = (preferences) => {
    return saveToLocalStorage(STORAGE_KEYS.USER_PREFERENCES, preferences);
  };
  
  /**
   * Load user preferences from local storage
   * 
   * @param {Object} defaultPreferences - Default preferences
   * @returns {Object} User preferences
   */
  export const loadPreferences = (defaultPreferences = {}) => {
    return loadFromLocalStorage(STORAGE_KEYS.USER_PREFERENCES, defaultPreferences);
  };
  
  /**
   * Save a project to IndexedDB
   * 
   * @param {Object} project - Project object to save
   * @returns {Promise<string>} Promise resolving to project ID
   */
  export const saveProject = async (project) => {
    // Ensure project has required fields
    if (!project.id) {
      throw new Error('Project must have an id field');
    }
    
    // Update timestamp
    project.updatedAt = Date.now();
    
    // Save to IndexedDB
    try {
      const store = await getStore(STORES.PROJECTS, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.put(project);
        
        request.onsuccess = () => {
          // Update recent projects list
          updateRecentProjects(project.id);
          resolve(project.id);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to save project: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error saving project: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Load a project from IndexedDB
   * 
   * @param {string} projectId - Project ID to load
   * @returns {Promise<Object>} Promise resolving to project object
   */
  export const loadProject = async (projectId) => {
    try {
      const store = await getStore(STORES.PROJECTS);
      
      return new Promise((resolve, reject) => {
        const request = store.get(projectId);
        
        request.onsuccess = () => {
          if (request.result) {
            // Update recent projects list
            updateRecentProjects(projectId);
            resolve(request.result);
          } else {
            reject(new Error(`Project not found: ${projectId}`));
          }
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to load project: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error loading project: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Delete a project from IndexedDB
   * 
   * @param {string} projectId - Project ID to delete
   * @returns {Promise<boolean>} Promise resolving to true if successful
   */
  export const deleteProject = async (projectId) => {
    try {
      // Delete project from projects store
      const projectsStore = await getStore(STORES.PROJECTS, 'readwrite');
      
      // Delete project
      await new Promise((resolve, reject) => {
        const request = projectsStore.delete(projectId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete project: ${request.error}`));
      });
      
      // Delete associated audio cache
      const audioCacheStore = await getStore(STORES.AUDIO_CACHE, 'readwrite');
      
      // Get all audio cache entries for this project
      const index = audioCacheStore.index('projectId');
      const audioEntries = await new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get audio cache: ${request.error}`));
      });
      
      // Delete each audio cache entry
      for (const entry of audioEntries) {
        await new Promise((resolve, reject) => {
          const request = audioCacheStore.delete(entry.id);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to delete audio cache: ${request.error}`));
        });
      }
      
      // Remove from recent projects
      removeFromRecentProjects(projectId);
      
      return true;
    } catch (error) {
      console.error(`Error deleting project: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Get a list of all projects from IndexedDB
   * 
   * @returns {Promise<Array>} Promise resolving to array of projects
   */
  export const getAllProjects = async () => {
    try {
      const store = await getStore(STORES.PROJECTS);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to get projects: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error getting projects: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Update the list of recent projects
   * 
   * @param {string} projectId - Project ID to add to recent list
   * @param {number} maxRecent - Maximum number of recent projects to keep
   * @returns {Array} Updated list of recent project IDs
   */
  export const updateRecentProjects = (projectId, maxRecent = 10) => {
    try {
      // Load current list
      let recentProjects = loadFromLocalStorage(STORAGE_KEYS.RECENT_PROJECTS, []);
      
      // Remove if already exists
      recentProjects = recentProjects.filter(id => id !== projectId);
      
      // Add to beginning
      recentProjects.unshift(projectId);
      
      // Limit to max length
      if (recentProjects.length > maxRecent) {
        recentProjects = recentProjects.slice(0, maxRecent);
      }
      
      // Save updated list
      saveToLocalStorage(STORAGE_KEYS.RECENT_PROJECTS, recentProjects);
      
      return recentProjects;
    } catch (error) {
      console.error(`Error updating recent projects: ${error.message}`);
      return [];
    }
  };
  
  /**
   * Remove a project from the recent projects list
   * 
   * @param {string} projectId - Project ID to remove
   * @returns {Array} Updated list of recent project IDs
   */
  export const removeFromRecentProjects = (projectId) => {
    try {
      // Load current list
      let recentProjects = loadFromLocalStorage(STORAGE_KEYS.RECENT_PROJECTS, []);
      
      // Remove project
      recentProjects = recentProjects.filter(id => id !== projectId);
      
      // Save updated list
      saveToLocalStorage(STORAGE_KEYS.RECENT_PROJECTS, recentProjects);
      
      return recentProjects;
    } catch (error) {
      console.error(`Error removing from recent projects: ${error.message}`);
      return [];
    }
  };
  
  /**
   * Get list of recent projects
   * 
   * @returns {Array} List of recent project IDs
   */
  export const getRecentProjects = () => {
    return loadFromLocalStorage(STORAGE_KEYS.RECENT_PROJECTS, []);
  };
  
  /**
   * Save audio data to cache
   * 
   * @param {string} id - Audio ID (typically track ID)
   * @param {string} projectId - Project ID
   * @param {ArrayBuffer|Blob} audioData - Audio data to cache
   * @returns {Promise<boolean>} Promise resolving to true if successful
   */
  export const cacheAudioData = async (id, projectId, audioData) => {
    try {
      const store = await getStore(STORES.AUDIO_CACHE, 'readwrite');
      
      // Create entry
      const cacheEntry = {
        id,
        projectId,
        audioData,
        createdAt: Date.now()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(cacheEntry);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to cache audio: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error caching audio: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Get cached audio data
   * 
   * @param {string} id - Audio ID to retrieve
   * @returns {Promise<ArrayBuffer|null>} Promise resolving to audio data or null if not found
   */
  export const getCachedAudio = async (id) => {
    try {
      const store = await getStore(STORES.AUDIO_CACHE);
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.audioData);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to get cached audio: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error getting cached audio: ${error.message}`);
      return null;
    }
  };
  
  /**
   * Clear old cache entries to free up space
   * 
   * @param {number} maxAgeDays - Maximum age in days to keep
   * @returns {Promise<number>} Promise resolving to number of entries cleared
   */
  export const clearOldCache = async (maxAgeDays = 7) => {
    try {
      const store = await getStore(STORES.AUDIO_CACHE, 'readwrite');
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - maxAgeMs;
      
      // Get all entries
      const index = store.index('createdAt');
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor();
        let count = 0;
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          
          if (cursor) {
            if (cursor.value.createdAt < cutoffTime) {
              // Delete old entries
              store.delete(cursor.value.id);
              count++;
            }
            
            cursor.continue();
          } else {
            // Done
            resolve(count);
          }
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to clear cache: ${request.error}`));
        };
      });
    } catch (error) {
      console.error(`Error clearing cache: ${error.message}`);
      return 0;
    }
  };
  
  /**
   * Download data as a file
   * 
   * @param {Blob|string} data - Data to download
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   */
  export const downloadFile = (data, filename, mimeType = 'application/octet-stream') => {
    // Create blob if needed
    const blob = typeof data === 'string' 
      ? new Blob([data], { type: mimeType }) 
      : data;
    
    // Create download URL
    const url = URL.createObjectURL(blob);
    
    // Create temporary link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to document
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    // Revoke URL to free memory
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  /**
   * Read a file as an ArrayBuffer
   * 
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>} Promise resolving to file content
   */
  export const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };
  
  /**
   * Read a file as text
   * 
   * @param {File} file - File to read
   * @returns {Promise<string>} Promise resolving to file content
   */
  export const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };
  
  /**
   * Check available storage space
   * 
   * @returns {Promise<Object>} Promise resolving to storage info
   */
  export const checkStorageQuota = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          usagePercentage: Math.round((estimate.usage / estimate.quota) * 100)
        };
      } catch (error) {
        console.error(`Error checking storage quota: ${error.message}`);
      }
    }
    
    return {
      quota: null,
      usage: null,
      available: null,
      usagePercentage: null
    };
  };
  
  // Export all functions as an object
  export default {
    // Storage keys
    STORAGE_KEYS,
    
    // Local storage
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    clearAllLocalStorage,
    
    // Preferences
    savePreferences,
    loadPreferences,
    
    // Project storage
    saveProject,
    loadProject,
    deleteProject,
    getAllProjects,
    
    // Recent projects
    updateRecentProjects,
    removeFromRecentProjects,
    getRecentProjects,
    
    // Audio cache
    cacheAudioData,
    getCachedAudio,
    clearOldCache,
    
    // File operations
    downloadFile,
    readFileAsArrayBuffer,
    readFileAsText,
    
    // Storage info
    checkStorageQuota
  };