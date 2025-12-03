
// Define the possible states of the application logic
export enum AppState {
  IDLE = 'IDLE',              // Normal monitoring
  ROLLING = 'ROLLING',        // Cycling through students (Blue/Jump sound)
  SELECTED = 'SELECTED',      // Winner revealed (Red)
  CELEBRATION = 'CELEBRATION' // Final state (Purple/Congratulation)
}

// Coordinate interface from MediaPipe
export interface Point {
  x: number;
  y: number;
}

// Bounding box interface
export interface BoundingBox {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

// Represents a face detected by MediaPipe
export interface DetectedFace {
  boundingBox: BoundingBox;
  landmarks: Point[];
}

// Represents a face that we are tracking over time with a stable ID
export interface TrackedFace extends DetectedFace {
  id: number;
  lastSeen: number; // Timestamp
  stableX: number; // Smoothed X for display
  stableY: number; // Smoothed Y for display
  stableW: number; // Smoothed Width
  stableH: number; // Smoothed Height
}

// Application settings configuration
export interface AppSettings {
  minDetectionConfidence: number;
  trackingSensitivity: number; // Distance threshold to match faces
  smoothingFactor: number;     // For position interpolation
}
