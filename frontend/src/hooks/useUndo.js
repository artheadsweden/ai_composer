import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for implementing undo/redo functionality with state history tracking
 * 
 * @param {any} initialState - The initial state to track
 * @param {Object} options - Configuration options
 * @param {number} options.maxHistoryLength - Maximum number of history states to keep
 * @param {Function} options.onUndo - Callback when undo is performed
 * @param {Function} options.onRedo - Callback when redo is performed
 * @returns {Object} Undo/redo methods and state
 */
const useUndo = (
  initialState,
  {
    maxHistoryLength = 30,
    onUndo = null,
    onRedo = null
  } = {}
) => {
  // Current state
  const [state, setState] = useState(initialState);
  
  // History stacks
  const [pastStates, setPastStates] = useState([]);
  const [futureStates, setFutureStates] = useState([]);
  
  // Flag to prevent recording intermediate states during undo/redo
  const isUndoRedoOperationRef = useRef(false);
  
  // Track if we've dirtied the state
  const [isDirty, setIsDirty] = useState(false);
  
  /**
   * Set new state and record in history
   * 
   * @param {any|Function} newState - New state or function to update state
   * @param {Object} options - Update options
   * @param {boolean} options.recordHistory - Whether to record this change in history
   */
  const updateState = useCallback((newState, { recordHistory = true } = {}) => {
    setState(prevState => {
      // Handle function updater pattern
      const resolvedNewState = typeof newState === 'function' 
        ? newState(prevState) 
        : newState;
      
      // Skip if state is unchanged
      if (JSON.stringify(prevState) === JSON.stringify(resolvedNewState)) {
        return prevState;
      }
      
      // Record in history unless instructed not to or during undo/redo
      if (recordHistory && !isUndoRedoOperationRef.current) {
        setPastStates(prev => {
          const newPastStates = [...prev, prevState];
          
          // Limit history length
          if (newPastStates.length > maxHistoryLength) {
            return newPastStates.slice(newPastStates.length - maxHistoryLength);
          }
          
          return newPastStates;
        });
        
        // Clear future states when new changes occur
        setFutureStates([]);
      }
      
      // Mark as dirty
      setIsDirty(true);
      
      return resolvedNewState;
    });
  }, [maxHistoryLength]);
  
  /**
   * Undo the last change
   * 
   * @returns {boolean} Whether undo was successful
   */
  const undo = useCallback(() => {
    if (pastStates.length === 0) {
      return false;
    }
    
    // Mark that we're in an undo operation
    isUndoRedoOperationRef.current = true;
    
    // Get the last state from history
    const previous = pastStates[pastStates.length - 1];
    const newPast = pastStates.slice(0, pastStates.length - 1);
    
    // Update stacks
    setPastStates(newPast);
    setFutureStates([...futureStates, state]);
    
    // Restore previous state
    setState(previous);
    
    // Call undo callback if provided
    if (onUndo) {
      onUndo(previous, state);
    }
    
    // End undo operation
    isUndoRedoOperationRef.current = false;
    
    return true;
  }, [pastStates, futureStates, state, onUndo]);
  
  /**
   * Redo a previously undone change
   * 
   * @returns {boolean} Whether redo was successful
   */
  const redo = useCallback(() => {
    if (futureStates.length === 0) {
      return false;
    }
    
    // Mark that we're in a redo operation
    isUndoRedoOperationRef.current = true;
    
    // Get the next state from future stack
    const next = futureStates[futureStates.length - 1];
    const newFuture = futureStates.slice(0, futureStates.length - 1);
    
    // Update stacks
    setPastStates([...pastStates, state]);
    setFutureStates(newFuture);
    
    // Restore next state
    setState(next);
    
    // Call redo callback if provided
    if (onRedo) {
      onRedo(next, state);
    }
    
    // End redo operation
    isUndoRedoOperationRef.current = false;
    
    return true;
  }, [pastStates, futureStates, state, onRedo]);
  
  /**
   * Create a snapshot in history without changing state
   * Useful for creating checkpoints before a series of operations
   */
  const createSnapshot = useCallback(() => {
    setPastStates(prev => [...prev, state]);
    setFutureStates([]);
  }, [state]);
  
  /**
   * Clear all history but keep current state
   */
  const clearHistory = useCallback(() => {
    setPastStates([]);
    setFutureStates([]);
    setIsDirty(false);
  }, []);
  
  /**
   * Reset to initial state and clear history
   */
  const reset = useCallback(() => {
    setState(initialState);
    setPastStates([]);
    setFutureStates([]);
    setIsDirty(false);
  }, [initialState]);
  
  /**
   * Get undo/redo stack information
   * 
   * @returns {Object} History info
   */
  const getHistoryInfo = useCallback(() => {
    return {
      canUndo: pastStates.length > 0,
      canRedo: futureStates.length > 0,
      pastStatesCount: pastStates.length,
      futureStatesCount: futureStates.length,
      isDirty
    };
  }, [pastStates.length, futureStates.length, isDirty]);
  
  /**
   * Force the current state to be recorded in history
   * Useful when you want to ensure state changes are recordable
   * even if they might normally be filtered out
   */
  const forceRecordCurrentState = useCallback(() => {
    setPastStates(prev => [...prev, state]);
    setFutureStates([]);
  }, [state]);
  
  /**
   * Mark state as clean (not dirty)
   * Usually called after saving
   */
  const markAsClean = useCallback(() => {
    setIsDirty(false);
  }, []);
  
  return {
    // Current state
    state,
    setState: updateState,
    
    // Undo/redo functionality
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    
    // History management
    createSnapshot,
    clearHistory,
    reset,
    getHistoryInfo,
    forceRecordCurrentState,
    
    // Dirty state tracking
    isDirty,
    markAsClean
  };
};

export default useUndo;