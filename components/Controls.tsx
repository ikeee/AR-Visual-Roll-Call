
import React from 'react';
import { Play, RotateCcw, Pause, Settings, User } from 'lucide-react';
import { AppState, AppSettings } from '../types';

interface ControlsProps {
  appState: AppState;
  faceCount: number;
  visitedCount: number;
  onStart: () => void;
  onReset: () => void;
  onPause: () => void;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

const Controls: React.FC<ControlsProps> = ({
  appState,
  faceCount,
  visitedCount,
  onStart,
  onReset,
  onPause,
  settings,
  onSettingsChange
}) => {
  const [showSettings, setShowSettings] = React.useState(false);

  const isIdle = appState === AppState.IDLE;
  // Disable start if we are in any active animation state
  const isAnimating = appState === AppState.ROLLING || appState === AppState.SELECTED || appState === AppState.CELEBRATION;

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-lg px-4">
      
      {/* Status Badge */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-6 py-2 flex items-center gap-4 text-sm text-slate-300 shadow-xl">
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-400" />
          <span>Detected: <strong className="text-white">{faceCount}</strong></span>
        </div>
        <div className="w-px h-4 bg-slate-600"></div>
        <div>
          <span>Selected: <strong className="text-white">{visitedCount}</strong></span>
        </div>
      </div>

      {/* Main Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
        
        {!isAnimating ? (
          <button
            onClick={onStart}
            disabled={faceCount === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              faceCount === 0 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 active:scale-95'
            }`}
          >
            <Play size={20} fill="currentColor" />
            START ROLL
          </button>
        ) : (
           <button
            onClick={onPause}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:shadow-amber-500/25 active:scale-95 transition-all"
          >
            <Pause size={20} fill="currentColor" />
            STOP
          </button>
        )}

        <div className="w-px h-8 bg-slate-700 mx-1"></div>

        <button
          onClick={onReset}
          className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Reset All"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-xl transition-colors ${showSettings ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Panel Popover */}
      {showSettings && (
        <div className="absolute bottom-full mb-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 w-72 shadow-2xl">
          <h3 className="font-bold text-white mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Tracking Sensitivity</span>
                <span>{settings.trackingSensitivity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.01"
                value={settings.trackingSensitivity}
                onChange={(e) => onSettingsChange({...settings, trackingSensitivity: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Detection Confidence</span>
                <span>{settings.minDetectionConfidence.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.1"
                value={settings.minDetectionConfidence}
                onChange={(e) => onSettingsChange({...settings, minDetectionConfidence: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            
            <div>
               <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Motion Smoothing</span>
                <span>{settings.smoothingFactor.toFixed(2)}</span>
              </div>
               <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={settings.smoothingFactor}
                onChange={(e) => onSettingsChange({...settings, smoothingFactor: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
