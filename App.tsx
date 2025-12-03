
import React, { useState } from 'react';
import ARCanvas from './components/ARCanvas';
import Controls from './components/Controls';
import { AppState, AppSettings } from './types';

const App: React.FC = () => {
  // Application Global State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [faceCount, setFaceCount] = useState(0);
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [visitedFaceIds, setVisitedFaceIds] = useState<Set<number>>(new Set());
  const [resetTrigger, setResetTrigger] = useState(0);
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    minDetectionConfidence: 0.5,
    trackingSensitivity: 0.15, 
    smoothingFactor: 0.5,
  });

  // Flow: IDLE -> ROLLING -> SELECTED (Red) -> CELEBRATION (Purple) -> IDLE
  const handleSelectionComplete = (faceId: number) => {
    if (faceId === -1) {
      setAppState(AppState.IDLE);
      alert("No faces detected! Please ensure camera sees students.");
      return;
    }

    setSelectedFaceId(faceId);
    
    // Step 1: Red Reveal (SELECTED)
    setAppState(AppState.SELECTED);
    
    // Step 2: After 1 second, transition to Purple Celebration (CELEBRATION)
    setTimeout(() => {
        setAppState(AppState.CELEBRATION);
        
        // Step 3: Celebration lasts 4 seconds, then back to IDLE
        setTimeout(() => {
             // Mark as visited
            setVisitedFaceIds(prev => {
              const next = new Set(prev);
              next.add(faceId);
              return next;
            });
            
            // Reset
            setAppState(AppState.IDLE);
            setSelectedFaceId(null);
        }, 4000);
    }, 1000);
  };

  const handleStart = () => {
    if (faceCount === 0) return;
    setAppState(AppState.ROLLING);
    setSelectedFaceId(null);
  };

  const handlePause = () => {
    setAppState(AppState.IDLE);
    setSelectedFaceId(null);
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setSelectedFaceId(null);
    setVisitedFaceIds(new Set());
    setResetTrigger(p => p + 1);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      <ARCanvas
        appState={appState}
        settings={settings}
        onFaceCountChange={setFaceCount}
        onSelectionComplete={handleSelectionComplete}
        resetTrigger={resetTrigger}
        selectedFaceId={selectedFaceId}
        visitedFaceIds={visitedFaceIds}
      />
      
      <Controls
        appState={appState}
        faceCount={faceCount}
        visitedCount={visitedFaceIds.size}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
};

export default App;
