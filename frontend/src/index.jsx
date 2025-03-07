import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import global styles
import './styles/global.css';

// Error boundary for the entire application
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <h1>Something went wrong</h1>
            <div className="error-details">
              <p>The application encountered an unexpected error.</p>
              <button 
                onClick={() => window.location.reload()}
                className="error-button"
              >
                Reload Application
              </button>
              
              {/* Collapsed error details for debugging */}
              <details className="error-info">
                <summary>Technical Details</summary>
                <pre>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            </div>
          </div>
          
          {/* Add error styles */}
          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-color: #121212;
              color: white;
              font-family: sans-serif;
              padding: 2rem;
            }
            
            .error-container {
              max-width: 600px;
              background-color: #1e1e1e;
              border-radius: 8px;
              padding: 2rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }
            
            .error-details {
              margin-top: 1rem;
            }
            
            .error-button {
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              margin-top: 1rem;
              border-radius: 4px;
              cursor: pointer;
            }
            
            .error-button:hover {
              background-color: #2563eb;
            }
            
            .error-info {
              margin-top: 2rem;
              padding: 1rem;
              background-color: #2a2a2a;
              border-radius: 4px;
              overflow-x: auto;
            }
            
            .error-info summary {
              cursor: pointer;
              user-select: none;
              margin-bottom: 1rem;
            }
            
            .error-info pre {
              white-space: pre-wrap;
              font-size: 0.85rem;
              color: #ef4444;
              line-height: 1.5;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring
const reportWebVitals = (metric) => {
  // Send metrics to analytics
  if (process.env.NODE_ENV === 'production') {
    // This would be replaced with actual analytics service
    console.log('Performance metric:', metric);
  }
};

// Create root and render
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render app with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Initialize service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Export performance monitoring
export { reportWebVitals };