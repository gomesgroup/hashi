import { MoleculeFile } from '../../shared/types';

/**
 * Supported molecular file formats
 */
export enum FileFormat {
  PDB = 'pdb',
  MMCIF = 'mmcif',
  SDF = 'sdf',
  MOL = 'mol',
  MOL2 = 'mol2',
  XYZ = 'xyz',
}

/**
 * File type to MIME type mapping
 */
export const formatToMimeType: Record<FileFormat, string> = {
  [FileFormat.PDB]: 'chemical/x-pdb',
  [FileFormat.MMCIF]: 'chemical/x-cif',
  [FileFormat.SDF]: 'chemical/x-mdl-sdfile',
  [FileFormat.MOL]: 'chemical/x-mdl-molfile',
  [FileFormat.MOL2]: 'chemical/x-mol2',
  [FileFormat.XYZ]: 'chemical/x-xyz',
};

/**
 * File extension to format mapping
 */
export const extensionToFormat: Record<string, FileFormat> = {
  'pdb': FileFormat.PDB,
  'cif': FileFormat.MMCIF,
  'mmcif': FileFormat.MMCIF,
  'sdf': FileFormat.SDF,
  'mol': FileFormat.MOL,
  'mol2': FileFormat.MOL2,
  'xyz': FileFormat.XYZ,
};

/**
 * File storage information
 */
export interface FileStorageInfo {
  path: string;      // Full path to the file
  filename: string;  // The name of the file on disk
  originalname: string; // Original filename
  mimetype: string;  // MIME type of the file
  size: number;      // Size of the file in bytes
  sessionId?: string; // Session ID if file is associated with a session
  format: FileFormat; // The format of the molecular file
}

/**
 * Extended molecule file with storage information
 */
export interface StoredMoleculeFile extends MoleculeFile {
  storage: FileStorageInfo;
}

/**
 * File conversion options
 */
export interface ConversionOptions {
  targetFormat: FileFormat;
  options?: Record<string, any>; // Additional format-specific options
}

/**
 * File upload metadata
 */
export interface FileUploadMetadata {
  sessionId?: string;
  description?: string;
  tags?: string[];
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  format?: FileFormat;
  error?: string;
}