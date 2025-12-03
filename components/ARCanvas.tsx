
import React, { useEffect, useRef } from 'react';
import { AppState, AppSettings, TrackedFace } from '../types';
import { FaceTracker } from '../services/faceTracker';
import { audioService } from '../services/audio';

// Define minimal interfaces locally to avoid import errors for types
interface MpResults {
  detections: Array<{
    boundingBox: {
      xCenter: number;
      yCenter: number;
      width: number;
      height: number;
    };
    landmarks: Array<{
      x: number;
      y: number;
    }>;
  }>;
  image: any;
}

interface ARCanvasProps {
  appState: AppState;
  settings: AppSettings;
  onFaceCountChange: (count: number) => void;
  onSelectionComplete: (faceId: number) => void;
  resetTrigger: number;
  selectedFaceId: number | null;
  visitedFaceIds: Set<number>;
}

const ARCanvas: React.FC<ARCanvasProps> = ({
  appState,
  settings,
  onFaceCountChange,
  onSelectionComplete,
  resetTrigger,
  selectedFaceId,
  visitedFaceIds
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<FaceTracker>(new FaceTracker(settings));
  const requestRef = useRef<number>();
  const faceDetectorRef = useRef<any>(null);
  
  const lastProcessedTimeRef = useRef<number>(0);
  const facesRef = useRef<TrackedFace[]>([]);
  
  // Animation Refs
  const rotationAngleRef = useRef<number>(0);
  const rollingStartTimeRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(0);
  const currentRollingIndexRef = useRef<number>(-1);
  const hasPickedRef = useRef<boolean>(false);

  // Initialize MediaPipe
  useEffect(() => {
    const FaceDetectionConstructor = (window as any).FaceDetection;

    if (!FaceDetectionConstructor) {
      console.error("MediaPipe FaceDetection global not found. Ensure the script is loaded.");
      return;
    }

    const faceDetection = new FaceDetectionConstructor({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5,
    });

    faceDetection.onResults((results: MpResults) => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const detectedFaces = results.detections.map((det) => ({
        boundingBox: det.boundingBox,
        landmarks: det.landmarks,
      }));

      // Update stable IDs
      facesRef.current = trackerRef.current.update(detectedFaces as any);
      onFaceCountChange(facesRef.current.length);
    });

    faceDetectorRef.current = faceDetection;

    const startCamera = async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false,
          });
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            requestRef.current = requestAnimationFrame(loop);
          };
        } catch (err) {
          console.error("Camera error:", err);
        }
      }
    };

    startCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      faceDetectorRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update settings
  useEffect(() => {
    trackerRef.current.updateSettings(settings);
    faceDetectorRef.current?.setOptions({
      minDetectionConfidence: settings.minDetectionConfidence,
    });
  }, [settings]);

  // Handle Reset
  useEffect(() => {
    trackerRef.current.reset();
  }, [resetTrigger]);

  // Handle State Changes
  useEffect(() => {
    if (appState === AppState.ROLLING) {
      rollingStartTimeRef.current = performance.now();
      lastTickTimeRef.current = 0;
      hasPickedRef.current = false;
      currentRollingIndexRef.current = -1;
      // Ensure audio context is ready
      audioService.resume();
    } else if (appState === AppState.CELEBRATION) {
       audioService.playVictory();
    }
  }, [appState]);

  const loop = async (time: number) => {
    if (!videoRef.current || !faceDetectorRef.current) {
      requestRef.current = requestAnimationFrame(loop);
      return;
    }

    // Limit detection to ~30fps for performance
    if (time - lastProcessedTimeRef.current > 33 && videoRef.current.readyState === 4) {
      await faceDetectorRef.current.send({ image: videoRef.current });
      lastProcessedTimeRef.current = time;
    }

    draw(time);
    requestRef.current = requestAnimationFrame(loop);
  };

  const getEligibleFaces = () => {
    return facesRef.current.filter(f => !visitedFaceIds.has(f.id));
  };

  const pickWinner = () => {
    if (hasPickedRef.current) return;
    
    const candidates = getEligibleFaces();
    let winnerId: number | null = null;
    
    // Logic: If we were rolling, try to pick the one that was currently highlighted if possible,
    // or just pick random. To ensure "what you see is what you get", let's strictly pick from candidates.
    if (candidates.length > 0) {
      // Pick random
      const randomIndex = Math.floor(Math.random() * candidates.length);
      winnerId = candidates[randomIndex].id;
    } else if (facesRef.current.length > 0) {
      // Fallback if all visited
      const randomIndex = Math.floor(Math.random() * facesRef.current.length);
      winnerId = facesRef.current[randomIndex].id;
    }

    hasPickedRef.current = true;
    onSelectionComplete(winnerId !== null ? winnerId : -1); 
  };

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // 1. Draw Video (Mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Dimming overlay during final celebration
    if (appState === AppState.CELEBRATION || appState === AppState.SELECTED) {
       ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
       ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    // 2. Logic: Rolling Animation
    let activeRollingId = -1;
    
    if (appState === AppState.ROLLING) {
      const candidates = getEligibleFaces();
      
      if (candidates.length > 0) {
        // Speed control: Initially fast, could slow down, but constant is fine for "jumping" effect
        const tickRate = 120; // ms
        
        if (time - lastTickTimeRef.current > tickRate) {
          // Move to next candidate
          currentRollingIndexRef.current = (currentRollingIndexRef.current + 1) % candidates.length;
          lastTickTimeRef.current = time;
          audioService.playTick(); // JUMP SOUND
        }
        
        if (candidates[currentRollingIndexRef.current]) {
          activeRollingId = candidates[currentRollingIndexRef.current].id;
        }
      }

      // Time limit for rolling (e.g., 3 seconds)
      if (time - rollingStartTimeRef.current > 3000 && !hasPickedRef.current) {
         pickWinner();
      }
    }

    // 3. Draw AR Overlay
    rotationAngleRef.current += 0.08;

    facesRef.current.forEach((face) => {
      // Mirror math
      const w = face.stableW * canvas.width;
      const h = face.stableH * canvas.height;
      const x = (1 - face.stableX) * canvas.width - w / 2;
      const y = face.stableY * canvas.height - h / 2;

      const isVisited = visitedFaceIds.has(face.id);
      const isWinner = selectedFaceId === face.id;
      const isRollingActive = face.id === activeRollingId;

      ctx.save();

      // --- IDLE ---
      if (appState === AppState.IDLE) {
        if (isVisited) {
          drawBox(ctx, x, y, w, h, 'rgba(156, 163, 175, 0.5)', 2); // Gray
          drawLabel(ctx, x, y - 10, "PICKED", '#9CA3AF');
        } else {
          // Standard Blue
          drawBox(ctx, x, y, w, h, 'rgba(59, 130, 246, 0.6)', 2); 
          drawCornerBrackets(ctx, x, y, w, h, '#60A5FA');
        }
      }

      // --- ROLLING (Blue Jump) ---
      else if (appState === AppState.ROLLING) {
         if (isRollingActive) {
            // Bright Blue + Halo
            drawHalo(ctx, x + w/2, y + h/2, Math.max(w,h) * 0.8, rotationAngleRef.current, '#3B82F6'); // Blue Halo
            drawBox(ctx, x, y, w, h, '#60A5FA', 4);
         } else {
            // Dimmed
            drawBox(ctx, x, y, w, h, 'rgba(59, 130, 246, 0.2)', 1);
         }
      }

      // --- SELECTED (Red Reveal) ---
      else if (appState === AppState.SELECTED) {
        if (isWinner) {
            // Red + Halo
            drawHalo(ctx, x + w/2, y + h/2, Math.max(w,h) * 0.8, rotationAngleRef.current, '#EF4444'); // Red Halo
            drawBox(ctx, x, y, w, h, '#EF4444', 5);
        } else {
            drawBox(ctx, x, y, w, h, 'rgba(255, 255, 255, 0.05)', 1);
        }
      }

      // --- CELEBRATION (Purple + Congratulation) ---
      else if (appState === AppState.CELEBRATION) {
        if (isWinner) {
            // Purple + Halo + Text
            drawHalo(ctx, x + w/2, y + h/2, Math.max(w,h) * 0.9, rotationAngleRef.current, '#A855F7'); // Purple Halo
            drawBox(ctx, x, y, w, h, '#A855F7', 6);
            
            // Text
            ctx.font = 'bold 32px Inter, sans-serif';
            ctx.fillStyle = '#E9D5FF'; // Purple-200
            ctx.shadowColor = '#6B21A8';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText("Congratulation", x + w/2, y - 30);
        } else {
            drawBox(ctx, x, y, w, h, 'rgba(255, 255, 255, 0.05)', 1);
        }
      }

      ctx.restore();
    });
  };

  // -- Drawing Primitives --

  const drawBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, lineWidth: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    const r = 8; 
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  };

  const drawCornerBrackets = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    const len = Math.min(w, h) * 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len); ctx.stroke();
  };

  const drawLabel = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) => {
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
  };

  const drawHalo = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, angle: number, colorHex: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    
    // Convert hex to rgba for gradient
    // Simple rough conversion or just use the hex
    // For specific colors used: 
    // Blue #3B82F6, Red #EF4444, Purple #A855F7
    
    // 1. Outer Rotating Glow Ring
    ctx.rotate(angle);
    const grad = ctx.createConicGradient(0, 0, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.25, colorHex); 
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(0.75, colorHex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Inner Counter-Rotating Ring
    ctx.rotate(-angle * 2.5); 
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-slate-900 flex justify-center items-center overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover" />
    </div>
  );
};

export default ARCanvas;
