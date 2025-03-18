/**
 * Types for snapshot and rendering functionality
 */

/**
 * Image format supported for rendering
 */
export enum ImageFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  TIFF = 'tiff'
}

/**
 * Status of a rendering job
 */
export enum RenderingJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Camera settings for rendering
 */
export interface CameraSettings {
  position?: [number, number, number]; // x, y, z coordinates
  target?: [number, number, number];   // x, y, z coordinates for look-at point
  fieldOfView?: number;                // field of view in degrees
  near?: number;                       // near clipping plane
  far?: number;                        // far clipping plane
  rotationMatrix?: number[];          // 4x4 transformation matrix
}

/**
 * Lighting settings for rendering
 */
export interface LightingSettings {
  ambientIntensity?: number;          // 0.0-1.0
  ambientColor?: string;              // hex color or named color
  directionalLights?: {
    direction: [number, number, number];
    color?: string;
    intensity?: number;
  }[];
  shadows?: boolean;
}

/**
 * Background settings for rendering
 */
export interface BackgroundSettings {
  color?: string;                     // hex color or named color
  transparent?: boolean;              // whether to use transparency
  gradient?: {
    topColor: string;
    bottomColor: string;
  };
}

/**
 * Style settings for molecular visualization
 */
export interface StyleSettings {
  representation: 'stick' | 'sphere' | 'ribbon' | 'cartoon' | 'surface' | string;
  colorScheme?: string;
  material?: string;
  transparency?: number;              // 0.0-1.0
  showHydrogens?: boolean;
  showSolvent?: boolean;
  showHeteroAtoms?: boolean;
}

/**
 * Snapshot rendering parameters
 */
export interface SnapshotParameters {
  width?: number;                     // Width in pixels
  height?: number;                    // Height in pixels
  format?: ImageFormat;               // Image format
  quality?: number;                   // JPEG quality (1-100)
  camera?: CameraSettings;            // Camera configuration
  lighting?: LightingSettings;        // Lighting configuration
  background?: BackgroundSettings;    // Background configuration
  style?: StyleSettings;              // Molecule style configuration
  supersampling?: number;             // Supersampling level for anti-aliasing
  caption?: string;                   // Optional text caption
  showScaleBar?: boolean;             // Whether to show a scale bar
  scaleBarOptions?: {
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    length?: number;                  // Length in angstroms
    color?: string;
  };
}

/**
 * Rendering job information
 */
export interface RenderingJob {
  id: string;
  sessionId: string;
  parameters: SnapshotParameters;
  status: RenderingJobStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  filePath?: string;
  fileSize?: number;
  priority?: number;
}

/**
 * Public snapshot metadata (returned to client)
 */
export interface SnapshotMetadata {
  id: string;
  sessionId: string;
  parameters: SnapshotParameters;
  status: RenderingJobStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  fileSize?: number;
  url?: string;
}

/**
 * Movie format type
 */
export enum MovieFormat {
  MP4 = 'mp4',
  GIF = 'gif'
}

/**
 * Movie rendering parameters
 */
export interface MovieParameters extends Omit<SnapshotParameters, 'format'> {
  frames: {
    duration: number;          // Duration in milliseconds
    camera?: CameraSettings;   // Camera settings for this frame
    style?: StyleSettings;     // Style settings for this frame
  }[];
  fps?: number;                // Frames per second
  format?: MovieFormat;        // Movie format
}