import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create UI context
const UIContext = createContext();

/**
 * UIProvider component for managing global UI state
 * such as modals, panels, notifications, and theme settings
 */
export const UIProvider = ({ children }) => {
  // Theme state (light/dark)
  const [theme, setTheme] = useState('dark');
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Active panel and tabs
  const [activePanel, setActivePanel] = useState('tracks'); // tracks, mixer, effects, generator
  const [activePanelTabs, setActivePanelTabs] = useState({
    tracks: 'arrangement',
    mixer: 'channels',
    effects: 'main',
    generator: 'parameters'
  });
  
  // Modal state
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState({});
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  
  // Selected elements
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [selectedEffectId, setSelectedEffectId] = useState(null);
  
  // UI preferences
  const [preferences, setPreferences] = useState({
    showWaveforms: true,
    showMeters: true,
    autoScroll: true,
    snapToGrid: true,
    gridSize: 4, // 1, 2, 4, 8, 16 etc.
    timelineZoom: 100, // percentage
    confirmOnDelete: true,
    highContrastMode: false,
    uiScale: 100, // percentage
  });
  
  // Screen size detection
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  });
  
  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
      
      // Auto-collapse sidebar on small screens
      if (width < 768) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      
      // Apply theme class to the document
      document.documentElement.classList.remove(`theme-${prevTheme}`);
      document.documentElement.classList.add(`theme-${newTheme}`);
      
      // Save in local storage
      localStorage.setItem('theme', newTheme);
      
      return newTheme;
    });
  }, []);
  
  // Load theme from local storage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.add(`theme-${savedTheme}`);
  }, []);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  // Toggle sidebar collapsed state
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);
  
  // Set active panel
  const changeActivePanel = useCallback((panelId) => {
    setActivePanel(panelId);
  }, []);
  
  // Set active tab within a panel
  const changePanelTab = useCallback((panelId, tabId) => {
    setActivePanelTabs(prev => ({
      ...prev,
      [panelId]: tabId
    }));
  }, []);
  
  // Open a modal
  const openModal = useCallback((modalId, props = {}) => {
    setActiveModal(modalId);
    setModalProps(props);
    
    // Add class to prevent scrolling of the background
    document.body.classList.add('modal-open');
  }, []);
  
  // Close the active modal
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalProps({});
    
    // Remove modal-open class
    document.body.classList.remove('modal-open');
  }, []);
  
  // Add a notification
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    
    // Create notification object
    const newNotification = {
      id,
      type: notification.type || 'info',
      message: notification.message,
      title: notification.title,
      duration: notification.duration || 5000, // default 5 seconds
      ...notification
    };
    
    // Add notification to the list
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-dismiss after duration (if not 0 or permanent)
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  }, []);
  
  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Update a UI preference
  const updatePreference = useCallback((key, value) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, [key]: value };
      
      // Save to local storage
      localStorage.setItem('ui_preferences', JSON.stringify(newPreferences));
      
      return newPreferences;
    });
  }, []);
  
  // Load preferences from local storage on initial render
  useEffect(() => {
    try {
      const savedPreferences = JSON.parse(localStorage.getItem('ui_preferences') || '{}');
      
      if (Object.keys(savedPreferences).length > 0) {
        setPreferences(prev => ({
          ...prev,
          ...savedPreferences
        }));
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error);
    }
  }, []);
  
  // Create success notification shorthand
  const notifySuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }, [addNotification]);
  
  // Create error notification shorthand
  const notifyError = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      ...options
    });
  }, [addNotification]);
  
  // Create warning notification shorthand
  const notifyWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      ...options
    });
  }, [addNotification]);
  
  // Create info notification shorthand
  const notifyInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }, [addNotification]);
  
  // Context value
  const value = {
    // Theme
    theme,
    toggleTheme,
    
    // Sidebar
    isSidebarOpen,
    isSidebarCollapsed,
    toggleSidebar,
    toggleSidebarCollapsed,
    
    // Panels and tabs
    activePanel,
    activePanelTabs,
    changeActivePanel,
    changePanelTab,
    
    // Modals
    activeModal,
    modalProps,
    openModal,
    closeModal,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    
    // Selection
    selectedTrackId,
    setSelectedTrackId,
    selectedEffectId,
    setSelectedEffectId,
    
    // Preferences
    preferences,
    updatePreference,
    
    // Screen size
    screenSize
  };
  
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

// Custom hook for using the UI context
export const useUIContext = () => {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  
  return context;
};

export default UIContext;