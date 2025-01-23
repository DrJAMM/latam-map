import React from 'react';
import LatamMap from './LatamMap';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="flex items-center space-x-4 m-4">
        <h1 className="text-2xl font-bold">Latin American Chapter Member Mao</h1>


      </div>
      <LatamMap />
    </div>
  );
}

export default App;