/**
 * Theme configuration with dark and light mode variables
 * This is used to dynamically toggle theme variables and colors
 */

// Dark theme colors
const darkTheme = {
    // Background colors
    bgPrimary: '#121212',
    bgSecondary: '#1e1e1e',
    bgTertiary: '#2a2a2a',
    bgElevated: '#323232',
    bgHighlight: '#3a3a3a',
    
    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#aaaaaa',
    textTertiary: '#777777',
    textDisabled: '#555555',
    
    // Border colors
    borderPrimary: '#3a3a3a',
    borderSecondary: '#2a2a2a',
    borderFocus: '#3b82f6',
    
    // Brand colors
    brandPrimary: '#3b82f6',    // Blue
    brandSecondary: '#2563eb',  // Darker blue
    brandTertiary: '#60a5fa',   // Lighter blue
    
    // Status colors
    success: '#10b981',  // Green
    warning: '#f59e0b',  // Amber
    error: '#ef4444',    // Red
    info: '#0ea5e9',     // Sky blue
    
    // Track colors
    trackColors: [
      '#FF5A5F',  // Red
      '#3D5A80',  // Blue
      '#8AC926',  // Green
      '#FFCA3A',  // Yellow
      '#6A4C93',  // Purple
      '#4D908E',  // Teal
      '#F9844A',  // Orange
      '#277DA1',  // Indigo
    ],
    
    // UI element colors
    buttonPrimary: '#3b82f6',
    buttonSecondary: '#4b5563',
    buttonDanger: '#ef4444',
    buttonDisabled: '#4b5563',
    
    // Shadow colors
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    dropShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    
    // Waveform and visualization colors
    waveformPrimary: '#3b82f6',
    waveformSecondary: '#60a5fa', 
    waveformPlayed: '#9333ea',
    
    // Overlay and modal colors
    overlayBg: 'rgba(0, 0, 0, 0.8)',
    modalBg: '#1e1e1e',
    
    // Contrast colors for high-contrast mode
    highContrastText: '#ffffff',
    highContrastBg: '#000000',
    highContrastBorder: '#ffffff'
  };
  
  // Light theme colors
  const lightTheme = {
    // Background colors
    bgPrimary: '#f8fafc',
    bgSecondary: '#f1f5f9',
    bgTertiary: '#e2e8f0',
    bgElevated: '#cbd5e1',
    bgHighlight: '#f8fafc',
    
    // Text colors
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textTertiary: '#64748b',
    textDisabled: '#94a3b8',
    
    // Border colors
    borderPrimary: '#cbd5e1',
    borderSecondary: '#e2e8f0',
    borderFocus: '#3b82f6',
    
    // Brand colors - keep consistent with dark theme
    brandPrimary: '#3b82f6',    // Blue
    brandSecondary: '#2563eb',  // Darker blue
    brandTertiary: '#60a5fa',   // Lighter blue
    
    // Status colors - keep consistent with dark theme
    success: '#10b981',  // Green
    warning: '#f59e0b',  // Amber
    error: '#ef4444',    // Red
    info: '#0ea5e9',     // Sky blue
    
    // Track colors - keep consistent with dark theme for recognition
    trackColors: [
      '#FF5A5F',  // Red
      '#3D5A80',  // Blue
      '#8AC926',  // Green
      '#FFCA3A',  // Yellow
      '#6A4C93',  // Purple
      '#4D908E',  // Teal
      '#F9844A',  // Orange
      '#277DA1',  // Indigo
    ],
    
    // UI element colors
    buttonPrimary: '#3b82f6',
    buttonSecondary: '#cbd5e1',
    buttonDanger: '#ef4444',
    buttonDisabled: '#e2e8f0',
    
    // Shadow colors
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    dropShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    
    // Waveform and visualization colors
    waveformPrimary: '#3b82f6',
    waveformSecondary: '#60a5fa',
    waveformPlayed: '#9333ea',
    
    // Overlay and modal colors
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    modalBg: '#ffffff',
    
    // Contrast colors for high-contrast mode
    highContrastText: '#000000',
    highContrastBg: '#ffffff',
    highContrastBorder: '#000000'
  };
  
  /**
   * Generate CSS variables from a theme object
   * 
   * @param {Object} theme - Theme object with color values
   * @returns {string} CSS variables as a string
   */
  export const generateCssVariables = (theme) => {
    let cssVars = '';
    
    // Add each theme property as a CSS variable
    Object.entries(theme).forEach(([key, value]) => {
      // Handle nested arrays like trackColors
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          cssVars += `  --${key}-${index}: ${item};\n`;
        });
      } else {
        cssVars += `  --${key}: ${value};\n`;
      }
    });
    
    return cssVars;
  };
  
  /**
   * Apply theme to the document by adding CSS variables to the root element
   * 
   * @param {string} themeName - Theme name ('dark' or 'light')
   */
  export const applyTheme = (themeName) => {
    // Get the theme object based on name
    const theme = themeName === 'dark' ? darkTheme : lightTheme;
    
    // Create CSS variables
    const cssVars = generateCssVariables(theme);
    
    // Add or update the style element
    let styleEl = document.getElementById('theme-vars');
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-vars';
      document.head.appendChild(styleEl);
    }
    
    // Set the CSS variables
    styleEl.textContent = `:root {\n${cssVars}}`;
    
    // Add theme class to the document
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${themeName}`);
    
    // Store theme preference
    localStorage.setItem('theme', themeName);
  };
  
  /**
   * Get the preferred theme based on user preference and system setting
   * 
   * @returns {string} Theme name ('dark' or 'light')
   */
  export const getPreferredTheme = () => {
    // Check local storage first
    const storedTheme = localStorage.getItem('theme');
    
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to dark theme
    return 'dark';
  };
  
  // Default export with theme objects and functions
  export default {
    darkTheme,
    lightTheme,
    applyTheme,
    generateCssVariables,
    getPreferredTheme
  };