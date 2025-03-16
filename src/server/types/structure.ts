/**
 * Types related to molecular structure manipulation
 */

/**
 * Types of molecular entity selection
 */
export enum SelectionType {
  ATOM = 'atom',
  RESIDUE = 'residue',
  CHAIN = 'chain',
  MOLECULE = 'molecule',
  MODEL = 'model',
}

/**
 * Selection criteria for molecular entities
 */
export interface SelectionCriteria {
  type: SelectionType;
  specifier: string;
  options?: {
    extend?: boolean;
    invert?: boolean;
    replace?: boolean;
  };
}

/**
 * Result of a selection operation
 */
export interface SelectionResult {
  selectionName: string;
  count: number;
  type: SelectionType;
  specifier: string;
}

/**
 * Atom properties for modification or creation
 */
export interface AtomProperties {
  element?: string;
  name?: string;
  position?: [number, number, number];
  charge?: number;
  radius?: number;
  serialNumber?: number;
  occupancy?: number;
  bfactor?: number;
  altloc?: string;
}

/**
 * Bond definition for creation or modification
 */
export interface BondDefinition {
  atom1: string;
  atom2: string;
  order?: number;
  length?: number;
  type?: string;
}

/**
 * Transformation operation types
 */
export enum TransformationType {
  ROTATE = 'rotate',
  TRANSLATE = 'translate',
  CENTER = 'center',
  SCALE = 'scale',
  MATRIX = 'matrix',
}

/**
 * Parameters for various transformation operations
 */
export interface TransformationParameters {
  type: TransformationType;
  selectionName?: string;
  structureId?: string;
  // For rotation
  angle?: number;
  axis?: [number, number, number];
  center?: [number, number, number];
  // For translation
  translation?: [number, number, number];
  // For scaling
  factor?: number;
  // For matrix transformation
  matrix?: number[][];
  // For center operation
  centerPoint?: [number, number, number];
}

/**
 * Energy minimization parameters
 */
export interface MinimizationParameters {
  selectionName?: string;
  structureId?: string;
  steps?: number;
  algorithm?: string;
  forceField?: string;
  cutoff?: number;
  maxIterations?: number;
  energyTolerance?: number;
}

/**
 * Result of an energy minimization operation
 */
export interface MinimizationResult {
  initialEnergy: number;
  finalEnergy: number;
  steps: number;
  converged: boolean;
  rmsd: number;
  duration: number;
}

/**
 * Transaction record for structure modifications
 */
export interface Transaction {
  id: string;
  sessionId: string;
  timestamp: Date;
  operation: string;
  parameters: any;
  selectionName?: string;
  structureId?: string;
}

/**
 * Transaction operation result 
 */
export interface TransactionResult {
  transactionId: string;
  success: boolean;
  message?: string;
  data?: any;
}