import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to mu-webapp-2</h1>
        <p>
          A modern React application ready for development.
        </p>
        <div className="features">
          <div className="feature-card">
            <h3>⚛️ React 18</h3>
            <p>Latest React with modern features</p>
          </div>
          <div className="feature-card">
            <h3>🔧 Webpack 5</h3>
            <p>Fast bundling and hot reloading</p>
          </div>
          <div className="feature-card">
            <h3>🎨 Modern CSS</h3>
            <p>Clean and responsive design</p>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
