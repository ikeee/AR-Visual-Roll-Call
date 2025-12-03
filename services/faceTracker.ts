import { DetectedFace, TrackedFace, AppSettings } from '../types';

/**
 * Because MediaPipe Face Detection only returns bounding boxes without IDs,
 * we need a simple centroid tracker to assign stable IDs to faces frame-to-frame.
 */
export class FaceTracker {
  private nextFaceId = 1;
  private trackedFaces: TrackedFace[] = [];
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  public updateSettings(newSettings: AppSettings) {
    this.settings = newSettings;
  }

  public update(detections: DetectedFace[]): TrackedFace[] {
    const timestamp = performance.now();
    const newTrackedFaces: TrackedFace[] = [];
    const usedDetectionIndices = new Set<number>();

    // 1. Try to match existing tracked faces to new detections
    for (const knownFace of this.trackedFaces) {
      let bestMatchIndex = -1;
      let minDistance = Number.MAX_VALUE;

      detections.forEach((detection, index) => {
        if (usedDetectionIndices.has(index)) return;

        // Calculate Euclidean distance between centers
        const dist = Math.hypot(
          knownFace.boundingBox.xCenter - detection.boundingBox.xCenter,
          knownFace.boundingBox.yCenter - detection.boundingBox.yCenter
        );

        if (dist < this.settings.trackingSensitivity && dist < minDistance) {
          minDistance = dist;
          bestMatchIndex = index;
        }
      });

      if (bestMatchIndex !== -1) {
        // Match found - Update the tracked face
        usedDetectionIndices.add(bestMatchIndex);
        const match = detections[bestMatchIndex];
        
        // Simple linear interpolation (LERP) for smoothing visual movement
        const alpha = this.settings.smoothingFactor;
        
        const smoothX = knownFace.stableX + (match.boundingBox.xCenter - knownFace.stableX) * alpha;
        const smoothY = knownFace.stableY + (match.boundingBox.yCenter - knownFace.stableY) * alpha;
        const smoothW = knownFace.stableW + (match.boundingBox.width - knownFace.stableW) * alpha;
        const smoothH = knownFace.stableH + (match.boundingBox.height - knownFace.stableH) * alpha;

        newTrackedFaces.push({
          ...match,
          id: knownFace.id,
          lastSeen: timestamp,
          stableX: smoothX,
          stableY: smoothY,
          stableW: smoothW,
          stableH: smoothH
        });
      }
    }

    // 2. Register new faces for unmatched detections
    detections.forEach((detection, index) => {
      if (!usedDetectionIndices.has(index)) {
        newTrackedFaces.push({
          ...detection,
          id: this.nextFaceId++,
          lastSeen: timestamp,
          stableX: detection.boundingBox.xCenter,
          stableY: detection.boundingBox.yCenter,
          stableW: detection.boundingBox.width,
          stableH: detection.boundingBox.height
        });
      }
    });

    this.trackedFaces = newTrackedFaces;
    return this.trackedFaces;
  }

  public reset() {
    this.trackedFaces = [];
    // We don't reset nextFaceId to avoid confusion if a face reappears quickly, 
    // effectively treating it as new is safer for this specific app logic.
  }
}