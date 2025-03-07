import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * @param {Object} shortcuts - Object mapping shortcut keys to handler functions
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether shortcuts are enabled
 * @param {Array<string>} options.excludeTargets - Element selectors to exclude (e.g. inputs)
 * @param {Array<string>} options.includeTargets - Element selectors to exclusively include
 * @param {boolean} options.allowInInputs - Whether to allow shortcuts in input elements
 * @param {Function} options.onShortcutTriggered - Callback when any shortcut is triggered
 * @returns {Object} Shortcut control methods
 */
const useKeyboardShortcuts = (
  shortcuts = {},
  {
    enabled = true,
    excludeTargets = ['input', 'textarea', 'select', '[contenteditable="true"]'],
    includeTargets = [],
    allowInInputs = false,
    onShortcutTriggered = null
  } = {}
) => {
  const shortcutsRef = useRef(shortcuts);
  const isEnabledRef = useRef(enabled);
  const excludeTargetsRef = useRef(excludeTargets);
  const includeTargetsRef = useRef(includeTargets);
  const allowInInputsRef = useRef(allowInInputs);
  const onShortcutTriggeredRef = useRef(onShortcutTriggered);
  
  // Track active modifiers
  const modifiersRef = useRef({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  });
  
  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);
  
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);
  
  useEffect(() => {
    excludeTargetsRef.current = excludeTargets;
  }, [excludeTargets]);
  
  useEffect(() => {
    includeTargetsRef.current = includeTargets;
  }, [includeTargets]);
  
  useEffect(() => {
    allowInInputsRef.current = allowInInputs;
  }, [allowInInputs]);
  
  useEffect(() => {
    onShortcutTriggeredRef.current = onShortcutTriggered;
  }, [onShortcutTriggered]);
  
  /**
   * Parse a keyboard shortcut string into an object of required keys
   * 
   * @param {string} shortcut - Shortcut key combination (e.g. "ctrl+s")
   * @returns {Object} Required keys for this shortcut
   */
  const parseShortcut = useCallback((shortcut) => {
    const keys = shortcut.toLowerCase().split('+');
    
    // Extract modifiers and main key
    return {
      ctrl: keys.includes('ctrl') || keys.includes('control'),
      shift: keys.includes('shift'),
      alt: keys.includes('alt'),
      meta: keys.includes('meta') || keys.includes('cmd') || keys.includes('command'),
      key: keys.filter(k => !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'command'].includes(k))[0]
    };
  }, []);
  
  /**
   * Check if element should be excluded from shortcuts
   * 
   * @param {Element} element - DOM element to check
   * @returns {boolean} Whether element should be excluded
   */
  const shouldExcludeElement = useCallback((element) => {
    // Check if element matches exclude targets
    const isExcluded = excludeTargetsRef.current.some(selector => 
      element.matches(selector)
    );
    
    // If include targets specified, element must match one of them
    const shouldInclude = includeTargetsRef.current.length === 0 || 
      includeTargetsRef.current.some(selector => element.matches(selector));
    
    // Special handling for input elements
    if (isExcluded && !allowInInputsRef.current) {
      return true;
    }
    
    return !shouldInclude;
  }, []);
  
  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((event) => {
    if (!isEnabledRef.current) return;
    
    // Update modifier state
    modifiersRef.current = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
    
    // Check if the event target is excluded
    if (shouldExcludeElement(event.target)) return;
    
    // Normalize key name
    const key = event.key.toLowerCase();
    
    // Check each shortcut
    for (const [shortcutStr, handler] of Object.entries(shortcutsRef.current)) {
      const shortcut = parseShortcut(shortcutStr);
      
      // Check if this shortcut matches the current key combination
      if (
        shortcut.key === key &&
        shortcut.ctrl === modifiersRef.current.ctrl &&
        shortcut.shift === modifiersRef.current.shift &&
        shortcut.alt === modifiersRef.current.alt &&
        shortcut.meta === modifiersRef.current.meta
      ) {
        // Prevent default browser behavior
        event.preventDefault();
        
        // Call the handler
        handler(event);
        
        // Call the global shortcut triggered callback
        if (onShortcutTriggeredRef.current) {
          onShortcutTriggeredRef.current(shortcutStr, event);
        }
        
        break;
      }
    }
  }, [parseShortcut, shouldExcludeElement]);
  
  /**
   * Handle keyup events
   */
  const handleKeyUp = useCallback((event) => {
    // Update modifier state
    if (event.key === 'Control') modifiersRef.current.ctrl = false;
    if (event.key === 'Shift') modifiersRef.current.shift = false;
    if (event.key === 'Alt') modifiersRef.current.alt = false;
    if (event.key === 'Meta') modifiersRef.current.meta = false;
  }, []);
  
  /**
   * Set up event listeners
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  /**
   * Temporarily disable shortcuts
   */
  const disableShortcuts = useCallback(() => {
    isEnabledRef.current = false;
  }, []);
  
  /**
   * Enable shortcuts
   */
  const enableShortcuts = useCallback(() => {
    isEnabledRef.current = true;
  }, []);
  
  /**
   * Toggle shortcuts enabled state
   */
  const toggleShortcuts = useCallback(() => {
    isEnabledRef.current = !isEnabledRef.current;
    return isEnabledRef.current;
  }, []);
  
  /**
   * Get keyboard shortcut help for UI display
   * 
   * @returns {Array<Object>} Array of shortcut descriptions
   */
  const getShortcutsHelp = useCallback(() => {
    return Object.entries(shortcutsRef.current).map(([shortcut, handler]) => {
      // Format shortcut for display
      const formattedShortcut = shortcut
        .split('+')
        .map(key => {
          // Capitalize first letter of each segment
          return key.charAt(0).toUpperCase() + key.slice(1);
        })
        .join(' + ');
      
      // Extract function name or provide generic description
      let description = 'Unknown action';
      
      if (handler.name) {
        // Convert camelCase to words
        description = handler.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
      }
      
      return {
        shortcut: formattedShortcut,
        original: shortcut,
        description
      };
    });
  }, []);
  
  return {
    isEnabled: isEnabledRef.current,
    enableShortcuts,
    disableShortcuts,
    toggleShortcuts,
    getShortcutsHelp
  };
};

export default useKeyboardShortcuts;