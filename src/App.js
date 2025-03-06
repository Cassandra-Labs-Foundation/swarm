import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CreateSession from './components/CreateSession';
import JoinSession from './components/JoinSession';
import SwarmSession from './components/SwarmSession';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Swarm Intelligence</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateSession />} />
            <Route path="/join" element={<JoinSession />} />
            <Route path="/session/:sessionId" element={<SwarmSession />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;