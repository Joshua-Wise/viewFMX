import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Error boundary component for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
    // Log to console for debugging on iPad
    if (window.console && window.console.log) {
      window.console.log('Error details:', {
        error: error.toString(),
        stack: error.stack,
        errorInfo: errorInfo,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          textAlign: 'center',
          padding: '50px',
          fontFamily: 'Arial, sans-serif'
        }
      }, [
        React.createElement('h2', { key: 'title' }, 'Something went wrong'),
        React.createElement('p', { key: 'message' }, 'Please check the browser console for details.'),
        React.createElement('button', {
          key: 'reload',
          onClick: () => window.location.reload(),
          style: {
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Reload Page')
      ]);
    }

    return this.props.children;
  }
}

// Check for compatibility and render
try {
  var root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  // Use legacy ReactDOM.render for better compatibility
  ReactDOM.render(
    React.createElement(ErrorBoundary, null,
      React.createElement(BrowserRouter, null,
        React.createElement(App, null)
      )
    ),
    root
  );
} catch (error) {
  console.error('Failed to render application:', error);
  // Fallback rendering
  var root = document.getElementById('root');
  if (root) {
    root.innerHTML = 
      '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">' +
      '<h2>Application Error</h2>' +
      '<p>Failed to load the application. Error: ' + error.message + '</p>' +
      '<p>User Agent: ' + navigator.userAgent + '</p>' +
      '<button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>' +
      '</div>';
  }
}
