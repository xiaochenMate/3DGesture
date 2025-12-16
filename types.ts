export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM', // Scatter/Cloud
  CLOSED_FIST = 'CLOSED_FIST', // Form Tree/Photo
  PINCH = 'PINCH', // Zoom/Focus
}

export interface HandData {
  gesture: GestureType;
  x: number;
  y: number;
  isDetected: boolean;
}

// Optimized structure for BufferGeometry
export interface PointCloudData {
  positions: Float32Array;      // Current positions (dynamic)
  targetTree: Float32Array;     // Photo shape positions
  targetCloud: Float32Array;    // Cloud shape positions
  colors: Float32Array;         // Pixel colors
  sizes: Float32Array;          // Particle sizes
}
