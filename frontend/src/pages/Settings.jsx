import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Sliders, Volume2, HardDrive, Key, Shield, Info } from 'lucide-react';
import { useUIContext } from '../context/UIContext';
import Button from '../components/common/Button';
import Slider from '../components/common/Slider';
import storageUtils from '../services/storageUtils';

/**
 * Settings page component for managing application preferences
 */
const Settings = () => {
  const { 
    theme, 
    toggleTheme, 
    preferences, 
    updatePreference 
  } = useUIContext();
  
  const [activeSection, setActiveSection] = useState('appearance');
  const [storageInfo, setStorageInfo] = useState({
    quota: 0,
    usage: 0,
    available: 0,
    usagePercentage: 0
  });
  
  // Fetch storage info on mount
  React.useEffect(() => {
    const checkStorage = async () => {
      const info = await storageUtils.checkStorageQuota();
      setStorageInfo(info);
    };
    
    checkStorage();
  }, []);
  
  // Format bytes to human-readable size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || bytes === null) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Clear application cache
  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the audio cache? This will remove all cached audio files but keep your projects.')) {
      try {
        const cleared = await storageUtils.clearOldCache(0); // 0 days = clear all
        alert(`Cleared ${cleared} cached audio files.`);
        
        // Update storage info
        const info = await storageUtils.checkStorageQuota();
        setStorageInfo(info);
      } catch (error) {
        alert(`Failed to clear cache: ${error.message}`);
      }
    }
  };
  
  // Handle keyboard shortcut toggle
  const handleToggleKeyboardShortcuts = () => {
    updatePreference('keyboardShortcutsEnabled', !preferences.keyboardShortcutsEnabled);
  };
  
  // Handle auto-save toggle
  const handleToggleAutoSave = () => {
    updatePreference('autoSaveEnabled', !preferences.autoSaveEnabled);
  };
  
  // Handle theme change
  const handleThemeChange = (newTheme) => {
    if (newTheme !== theme) {
      toggleTheme();
    }
  };
  
  // Render appearance settings
  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-700 bg-gray-800'} flex flex-col items-center`}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon size={24} className="mb-2" />
            <span>Dark</span>
          </button>
          
          <button
            className={`p-4 rounded-lg border ${theme === 'light' ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-700 bg-gray-800'} flex flex-col items-center`}
            onClick={() => handleThemeChange('light')}
          >
            <Sun size={24} className="mb-2" />
            <span>Light</span>
          </button>
          
          <button
            className={`p-4 rounded-lg border ${theme === 'system' ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-700 bg-gray-800'} flex flex-col items-center`}
            onClick={() => handleThemeChange('system')}
          >
            <Monitor size={24} className="mb-2" />
            <span>System</span>
          </button>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-700">
        <h3 className="text-lg font-medium mb-4">Display Options</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>High Contrast Mode</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.highContrastMode || false}
                onChange={() => updatePreference('highContrastMode', !preferences.highContrastMode)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm">UI Scale: {preferences.uiScale || 100}%</label>
            <Slider
              min={75}
              max={150}
              step={5}
              value={preferences.uiScale || 100}
              onChange={(value) => updatePreference('uiScale', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Show Tooltips</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.showTooltips !== false} // Default to true
                onChange={() => updatePreference('showTooltips', !preferences.showTooltips)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render audio settings
  const renderAudio = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Playback</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">Default Volume: {preferences.defaultVolume || 80}%</label>
            <Slider
              min={0}
              max={100}
              value={preferences.defaultVolume || 80}
              onChange={(value) => updatePreference('defaultVolume', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Auto-play on Track Load</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.autoPlayEnabled || false}
                onChange={() => updatePreference('autoPlayEnabled', !preferences.autoPlayEnabled)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-700">
        <h3 className="text-lg font-medium mb-4">Audio Quality</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label>Generation Quality</label>
            <select
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
              value={preferences.generationQuality || 'standard'}
              onChange={(e) => updatePreference('generationQuality', e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label>Export Format</label>
            <select
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
              value={preferences.defaultExportFormat || 'wav'}
              onChange={(e) => updatePreference('defaultExportFormat', e.target.value)}
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="stems">Stems</option>
              <option value="project">Project File</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>High-quality Playback</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.highQualityPlayback || false}
                onChange={() => updatePreference('highQualityPlayback', !preferences.highQualityPlayback)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render storage settings
  const renderStorage = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Storage Usage</h3>
        
        {storageInfo.quota ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Used: {formatBytes(storageInfo.usage)}</span>
                <span>Available: {formatBytes(storageInfo.available)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full"
                  style={{ width: `${storageInfo.usagePercentage}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {storageInfo.usagePercentage}% of {formatBytes(storageInfo.quota)}
              </div>
            </div>
            
            <Button
              variant="secondary"
              onClick={handleClearCache}
            >
              Clear Audio Cache
            </Button>
          </div>
        ) : (
          <div className="text-gray-400">
            Storage information not available. Your browser may not support the Storage API.
          </div>
        )}
      </div>
      
      <div className="pt-6 border-t border-gray-700">
        <h3 className="text-lg font-medium mb-4">Project Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Auto-save Projects</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.autoSaveEnabled !== false} // Default to true
                onChange={handleToggleAutoSave}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Confirm Before Deleting</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.confirmOnDelete !== false} // Default to true
                onChange={() => updatePreference('confirmOnDelete', !preferences.confirmOnDelete)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm">Auto-save Interval: {preferences.autoSaveInterval || 30} seconds</label>
            <Slider
              min={10}
              max={120}
              step={5}
              value={preferences.autoSaveInterval || 30}
              onChange={(value) => updatePreference('autoSaveInterval', value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render advanced settings
  const renderAdvanced = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Performance</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Show Waveforms</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.showWaveforms !== false} // Default to true
                onChange={() => updatePreference('showWaveforms', !preferences.showWaveforms)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Show Audio Meters</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.showMeters !== false} // Default to true
                onChange={() => updatePreference('showMeters', !preferences.showMeters)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-700">
        <h3 className="text-lg font-medium mb-4">Keyboard and Controls</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Enable Keyboard Shortcuts</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.keyboardShortcutsEnabled !== false} // Default to true
                onChange={handleToggleKeyboardShortcuts}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <span>Snap to Grid</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={preferences.snapToGrid !== false} // Default to true
                onChange={() => updatePreference('snapToGrid', !preferences.snapToGrid)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm">Grid Size: {preferences.gridSize || 4}</label>
            <Slider
              min={1}
              max={16}
              step={1}
              value={preferences.gridSize || 4}
              onChange={(value) => updatePreference('gridSize', value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="settings-page container mx-auto px-4 py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <SettingsIcon size={24} className="mr-2 text-blue-500" />
          Settings
        </h1>
        <p className="text-gray-400 mt-2">
          Customize your AI Ensemble Composer experience
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <aside className="md:col-span-1">
          <nav className="bg-gray-800 rounded-lg overflow-hidden">
            <ul>
              <li>
                <button
                  className={`w-full text-left px-4 py-3 flex items-center ${activeSection === 'appearance' ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-l-4 border-blue-500' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveSection('appearance')}
                >
                  <Monitor size={18} className="mr-2" />
                  <span>Appearance</span>
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-3 flex items-center ${activeSection === 'audio' ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-l-4 border-blue-500' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveSection('audio')}
                >
                  <Volume2 size={18} className="mr-2" />
                  <span>Audio</span>
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-3 flex items-center ${activeSection === 'storage' ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-l-4 border-blue-500' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveSection('storage')}
                >
                  <HardDrive size={18} className="mr-2" />
                  <span>Storage</span>
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-3 flex items-center ${activeSection === 'advanced' ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-l-4 border-blue-500' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveSection('advanced')}
                >
                  <Sliders size={18} className="mr-2" />
                  <span>Advanced</span>
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-3 flex items-center ${activeSection === 'about' ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-l-4 border-blue-500' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveSection('about')}
                >
                  <Info size={18} className="mr-2" />
                  <span>About</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>
        
        {/* Settings content */}
        <div className="md:col-span-3 bg-gray-800 rounded-lg p-6">
          {activeSection === 'appearance' && renderAppearance()}
          {activeSection === 'audio' && renderAudio()}
          {activeSection === 'storage' && renderStorage()}
          {activeSection === 'advanced' && renderAdvanced()}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <h2 className="text-2xl font-bold mb-2">AI Ensemble Composer</h2>
                <p className="text-gray-400">Version 0.1.0</p>
                <p className="mt-4">
                  An open-source AI-powered music creation studio
                </p>
                <div className="mt-6 flex justify-center">
                  <a 
                    href="https://github.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded mx-2"
                  >
                    GitHub
                  </a>
                  <a 
                    href="https://github.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded mx-2"
                  >
                    Documentation
                  </a>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-4">Credits</h3>
                <p className="text-gray-400">
                  AI Ensemble Composer uses technology from the following open-source projects:
                </p>
                <ul className="list-disc pl-5 mt-2 text-gray-400 space-y-1">
                  <li>YuE - For vocal generation capabilities</li>
                  <li>AudioCraft - For instrument sound synthesis</li>
                  <li>React - For the user interface</li>
                  <li>Web Audio API - For audio processing</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;