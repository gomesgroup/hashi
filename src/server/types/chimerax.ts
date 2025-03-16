import { ChildProcess } from 'child_process';

/**
 * Status of a ChimeraX process
 */
export type ChimeraXProcessStatus = 'starting' | 'running' | 'error' | 'terminated';

/**
 * Information about a ChimeraX process
 */
export interface ChimeraXProcess {
  /** Unique session ID */
  id: string;
  
  /** Port number for the REST API */
  port: number;
  
  /** Process reference */
  process: ChildProcess;
  
  /** Process ID */
  pid: number;
  
  /** Current status */
  status: ChimeraXProcessStatus;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last activity timestamp */
  lastActive: Date;
  
  /** Error information (if status is 'error') */
  error?: string;
}

/**
 * Result of a ChimeraX command execution
 */
export interface ChimeraXCommandResult {
  /** Whether the command was executed successfully */
  success: boolean;
  
  /** Response data (if success is true) */
  data?: any;
  
  /** Error message (if success is false) */
  error?: string;
}

/**
 * Options for ChimeraX command execution
 */
export interface ChimeraXCommandOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Whether to execute the command in the background */
  background?: boolean;
  
  /** Whether to suppress command output */
  silent?: boolean;
}

/**
 * Request body for executing a single ChimeraX command
 */
export interface ChimeraXCommandRequest {
  /** Command to execute */
  command: string;
  
  /** Command execution options */
  options?: ChimeraXCommandOptions;
}

/**
 * Request body for executing multiple ChimeraX commands in sequence
 */
export interface ChimeraXCommandSequenceRequest {
  /** Array of commands to execute in sequence */
  commands: string[];
  
  /** Command execution options (applied to all commands) */
  options?: ChimeraXCommandOptions;
}

/**
 * Summary of a ChimeraX process (without sensitive data)
 */
export interface ChimeraXProcessSummary {
  /** Unique session ID */
  id: string;
  
  /** Port number for the REST API */
  port: number;
  
  /** Process ID */
  pid: number;
  
  /** Current status */
  status: ChimeraXProcessStatus;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last activity timestamp */
  lastActive: string;
  
  /** Idle time in milliseconds */
  idleTimeMs: number;
}

/**
 * Structure types supported by ChimeraX
 */
export enum StructureType {
  PROTEIN = 'protein',
  NUCLEIC_ACID = 'nucleic_acid',
  LIGAND = 'ligand',
  SMALL_MOLECULE = 'small_molecule',
  COMPLEX = 'complex',
  UNKNOWN = 'unknown'
}

/**
 * Supported output formats for structure data
 */
export enum StructureFormat {
  JSON = 'json',
  PDB = 'pdb',
  CIF = 'mmcif',
  SDF = 'sdf',
  MOL2 = 'mol2',
  XYZ = 'xyz'
}

/**
 * Structure metadata in a ChimeraX session
 */
export interface StructureMetadata {
  id: string;
  modelId: number;
  name: string;
  type: StructureType;
  description?: string;
  source?: string;
  resolution?: number;
  chains?: number;
  residues?: number;
  atoms?: number;
  bonds?: number;
  created: Date;
}

/**
 * Structure coordinate information
 */
export interface AtomData {
  id: number;
  element: string;
  name: string;
  serial: number;
  x: number;
  y: number;
  z: number;
  residue: string;
  residueId: number;
  chain: string;
  bfactor?: number;
  occupancy?: number;
  isHet?: boolean;
}

/**
 * Bond information
 */
export interface BondData {
  id: number;
  atom1: number;
  atom2: number;
  order: number;
  type?: string;
  length?: number;
}

/**
 * Residue information
 */
export interface ResidueData {
  id: number;
  name: string;
  number: number;
  insertionCode?: string;
  chain: string;
  secondaryStructure?: string;
  atoms: number[];
}

/**
 * Chain information
 */
export interface ChainData {
  id: string;
  name: string;
  residueCount: number;
  atomCount: number;
  description?: string;
  residues: number[];
}

/**
 * Calculated properties for a structure
 */
export interface StructureProperties {
  mass?: number;
  charge?: number;
  surfaceArea?: number;
  volume?: number;
  centerOfMass?: [number, number, number];
  dimensions?: [number, number, number];
  secondaryStructure?: {
    helix: number;
    sheet: number;
    coil: number;
  };
}

/**
 * Complete structure data
 */
export interface StructureData {
  metadata: StructureMetadata;
  atoms: AtomData[];
  bonds: BondData[];
  residues: ResidueData[];
  chains: ChainData[];
  properties?: StructureProperties;
}

/**
 * Filter parameters for retrieving partial structure data
 */
export interface StructureFilter {
  chains?: string[];
  residues?: number[];
  residueRanges?: Array<{chain: string, start: number, end: number}>;
  atomSerials?: number[];
  elements?: string[];
  ligands?: boolean;
  water?: boolean;
  metals?: boolean;
  distanceFrom?: {
    x: number;
    y: number;
    z: number;
    radius: number;
  };
}