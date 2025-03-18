import { ReactNode } from 'react';

// Session Types
export interface Session {
  id: string;
  createdAt: string;
  lastAccessed: string;
  status: SessionStatus;
}

export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export interface SessionContextProps {
  session: Session | null;
  activeSession?: Session | null;
  sessions?: Session[];  // List of all sessions
  isLoading: boolean;
  error: string | null;
  createSession: () => Promise<Session | null>;
  getSession: (sessionId: string) => Promise<Session | null>;
  refreshSession: (sessionId: string) => Promise<boolean>;
  closeSession: (sessionId: string) => Promise<boolean>;
  fetchSessions?: () => Promise<Session[]>;  // Method to fetch all sessions
  resetError: () => void;
}

// Structure Types
export interface Structure {
  id: string;
  name: string;
  format: string;
  path: string;
  uploadDate?: string;
  metadata: StructureMetadata;
}

export interface StructureMetadata {
  atomCount: number;
  bondCount?: number;
  bonds?: number;
  residueCount: number;
  chainCount: number;
  title?: string;
  description?: string;
  authors?: string[];
  experimentalMethod?: string;
  resolution?: number;
  creationDate?: string;
}

export interface Atom {
  id: number;
  name?: string;
  element: string;
  x: number;
  y: number;
  z: number;
  residueId?: number;
  chainId?: string;
  bFactor?: number;
  charge?: number;
  occupancy?: number;
  altLoc?: string;
}

export interface Bond {
  atomId1: number;
  atomId2: number;
  order: number;
  type?: string;
}

export interface Residue {
  id: number;
  name: string;
  chainId: string;
  number?: number;
  sequence?: number;
  atoms?: number[];
}

export interface Chain {
  id: string;
  name: string;
  residueCount?: number;
  residues?: number[];
}

// Error Context Types
export interface ErrorContextProps {
  error: Error | null;
  setError: (error: Error | null) => void;
  addError: (message: string) => void;
  clearError: () => void;
}

export interface Error {
  message: string;
  timestamp: number;
}

// Component Prop Types
export interface ProviderProps {
  children: ReactNode;
}

// File Upload Types
export interface FileUploadOptions {
  sessionId: string;
  format?: string;
  name?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    path: string;
    format: string;
    size: number;
    structureId?: string;
  };
  error?: string;
}

// Visualization Types
export interface VisualizationOptions {
  representation: RepresentationType;
  colorScheme: ColorScheme;
  background: string;
  showLabels: boolean;
  showHydrogens: boolean;
  showSolvent: boolean;
  quality: 'low' | 'medium' | 'high';
}

export enum RepresentationType {
  BALL_AND_STICK = 'ball-and-stick',
  STICK = 'stick',
  SPHERE = 'sphere',
  CARTOON = 'cartoon',
  RIBBON = 'ribbon',
  TUBE = 'tube',
  SURFACE = 'surface',
}

export enum ColorScheme {
  ELEMENT = 'element',
  CHAIN = 'chain',
  RESIDUE = 'residue',
  RESIDUE_TYPE = 'residue-type',
  SECONDARY_STRUCTURE = 'secondary-structure',
  B_FACTOR = 'b-factor',
  CUSTOM = 'custom',
}