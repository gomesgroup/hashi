import { ValidationError } from '../../utils/errors';

interface ValidatorContext {
  fileName?: string;
  format: string;
  userId: string;
  size: number;
  content: Buffer;
}

/**
 * Interface for structure validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  details?: {
    atomCount?: number;
    bondCount?: number;
    fragmentCount?: number;
    format?: string;
    fileSize?: number;
    detectedFormat?: string;
  };
}

/**
 * Base validator for molecular structures
 */
export abstract class StructureValidator {
  /**
   * Validate a molecular structure file
   * @param context Validation context
   * @returns Validation result
   */
  public abstract validate(context: ValidatorContext): Promise<ValidationResult>;
  
  /**
   * Check if this validator supports the given file format
   * @param format File format
   * @returns True if supported
   */
  public abstract supportsFormat(format: string): boolean;
}

/**
 * PDB structure validator
 */
export class PDBValidator extends StructureValidator {
  /**
   * Check if this validator supports the given file format
   * @param format File format
   * @returns True if supported
   */
  public supportsFormat(format: string): boolean {
    return format.toLowerCase() === 'pdb';
  }
  
  /**
   * Validate a PDB file
   * @param context Validation context
   * @returns Validation result
   */
  public async validate(context: ValidatorContext): Promise<ValidationResult> {
    const { content, format, fileName } = context;
    
    // Basic format validation for PDB
    const fileContent = content.toString('utf-8');
    const lines = fileContent.split('\n');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for HEADER record
    const hasHeader = lines.some(line => line.startsWith('HEADER'));
    if (!hasHeader) {
      warnings.push('Missing HEADER record in PDB file');
    }
    
    // Check for ATOM/HETATM records
    const atomLines = lines.filter(line => line.startsWith('ATOM') || line.startsWith('HETATM'));
    if (atomLines.length === 0) {
      errors.push('No ATOM or HETATM records found in PDB file');
    }
    
    // Check for END record
    const hasEnd = lines.some(line => line.trim() === 'END');
    if (!hasEnd) {
      warnings.push('Missing END record in PDB file');
    }
    
    // Count atoms, residues, chains
    const atoms = atomLines.length;
    const residues = new Set(atomLines.map(line => line.substring(22, 27).trim())).size;
    const chains = new Set(atomLines.map(line => line.substring(21, 22).trim())).size;
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        atomCount: atoms,
        fragmentCount: chains,
        format: 'pdb',
        fileSize: content.length,
        detectedFormat: 'pdb'
      }
    };
  }
}

/**
 * Validator for CIF/mmCIF files
 */
export class CIFValidator extends StructureValidator {
  /**
   * Check if this validator supports the given file format
   * @param format File format
   * @returns True if supported
   */
  public supportsFormat(format: string): boolean {
    return ['cif', 'mmcif'].includes(format.toLowerCase());
  }
  
  /**
   * Validate a CIF/mmCIF file
   * @param context Validation context
   * @returns Validation result
   */
  public async validate(context: ValidatorContext): Promise<ValidationResult> {
    const { content, format } = context;
    
    // Basic format validation for CIF
    const fileContent = content.toString('utf-8');
    const lines = fileContent.split('\n');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for data_ sections
    const hasDataSection = lines.some(line => line.startsWith('data_'));
    if (!hasDataSection) {
      errors.push('No data_ section found in CIF file');
    }
    
    // Check for _atom_site section
    const hasAtomSite = lines.some(line => line.includes('_atom_site.'));
    if (!hasAtomSite) {
      errors.push('No _atom_site records found in CIF file');
    }
    
    // Count atoms (rough estimate)
    const atomLines = lines.filter(line => !line.startsWith('_') && !line.startsWith('#') && line.trim().length > 0 && line.includes(' '));
    const atomCount = hasAtomSite ? atomLines.length : 0;
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        atomCount,
        format: format.toLowerCase(),
        fileSize: content.length,
        detectedFormat: hasDataSection ? 'cif' : 'unknown'
      }
    };
  }
}

/**
 * Validator factory for molecular structures
 */
export class StructureValidatorFactory {
  private validators: StructureValidator[] = [
    new PDBValidator(),
    new CIFValidator()
  ];
  
  /**
   * Get a validator for a specific file format
   * @param format File format
   * @returns Validator instance
   */
  public getValidator(format: string): StructureValidator {
    const validator = this.validators.find(v => v.supportsFormat(format));
    
    if (!validator) {
      throw new ValidationError(`No validator found for format ${format}`, {
        format,
        supportedFormats: this.getSupportedFormats()
      });
    }
    
    return validator;
  }
  
  /**
   * Get all supported file formats
   * @returns Array of supported formats
   */
  public getSupportedFormats(): string[] {
    const formats: string[] = [];
    
    for (const validator of this.validators) {
      for (const format of ['pdb', 'cif', 'mmcif', 'xyz', 'mol', 'mol2', 'sdf']) {
        if (validator.supportsFormat(format) && !formats.includes(format)) {
          formats.push(format);
        }
      }
    }
    
    return formats;
  }
}