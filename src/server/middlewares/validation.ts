import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';
import { SelectionType, TransformationType } from '../types/structure';

/**
 * Generic validation middleware creator
 * @param schema Joi schema for validation
 * @param property Request property to validate ('body', 'query', 'params')
 */
export const validateRequest = (schema: Joi.Schema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (!error) {
      return next();
    }

    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn(`Validation error: ${JSON.stringify(validationErrors)}`);

    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: validationErrors
    });
  };
};

/**
 * Session creation request schema
 */
export const createSessionSchema = Joi.object({
  pdbId: Joi.string()
    .trim()
    .min(4)
    .max(10)
    .pattern(/^[a-zA-Z0-9]+$/)
    .description('PDB ID to load'),
    
  file: Joi.binary()
    .description('Molecular structure file to upload'),
  
  userId: Joi.string()
    .trim()
    .description('User ID for authentication (optional)')
});

/**
 * Session ID parameter schema
 */
export const sessionIdSchema = Joi.object({
  id: Joi.string()
    .trim()
    .uuid()
    .required()
    .description('Session ID')
});

/**
 * Structure ID parameter schema
 */
export const structureIdSchema = Joi.object({
  sessionId: Joi.string()
    .trim()
    .uuid()
    .required()
    .description('Session ID'),
  
  structureId: Joi.string()
    .trim()
    .required()
    .description('Structure ID')
});

/**
 * Selection creation schema
 */
export const selectionSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(SelectionType))
    .required()
    .description('Type of selection (atom, residue, chain, molecule, model)'),
  
  specifier: Joi.string()
    .required()
    .description('Selection specifier (e.g., "protein", "#1", ":1-10", etc.)'),
  
  options: Joi.object({
    extend: Joi.boolean()
      .description('Extend the selection'),
    
    invert: Joi.boolean()
      .description('Invert the selection'),
    
    replace: Joi.boolean()
      .description('Replace the current selection')
  }).optional()
});

/**
 * Atom properties schema
 */
export const atomPropertiesSchema = Joi.object({
  element: Joi.string()
    .description('Element symbol'),
  
  name: Joi.string()
    .description('Atom name'),
  
  position: Joi.array()
    .items(Joi.number())
    .length(3)
    .description('Atom position [x, y, z]'),
  
  charge: Joi.number()
    .description('Atom charge'),
  
  radius: Joi.number()
    .min(0)
    .description('Atom radius'),
  
  serialNumber: Joi.number()
    .integer()
    .description('Atom serial number'),
  
  occupancy: Joi.number()
    .min(0)
    .max(1)
    .description('Atom occupancy'),
  
  bfactor: Joi.number()
    .description('Atom B-factor'),
  
  altloc: Joi.string()
    .max(1)
    .description('Alternate location identifier')
}).min(1);

/**
 * Schema for atom modification
 */
export const modifyAtomsSchema = Joi.object({
  selectionName: Joi.string()
    .required()
    .description('Name of the selection to modify'),
  
  properties: atomPropertiesSchema
    .required()
    .description('Atom properties to modify')
});

/**
 * Schema for adding atoms
 */
export const addAtomsSchema = Joi.object({
  structureId: Joi.string()
    .required()
    .description('Structure ID to add atoms to'),
  
  atoms: Joi.array()
    .items(atomPropertiesSchema)
    .min(1)
    .required()
    .description('Array of atoms to add')
});

/**
 * Schema for removing atoms
 */
export const removeAtomsSchema = Joi.object({
  selectionName: Joi.string()
    .required()
    .description('Name of the selection to remove')
});

/**
 * Schema for bond definition
 */
export const bondDefinitionSchema = Joi.object({
  atom1: Joi.string()
    .required()
    .description('First atom specifier'),
  
  atom2: Joi.string()
    .required()
    .description('Second atom specifier'),
  
  order: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .description('Bond order (1=single, 2=double, 3=triple)'),
  
  length: Joi.number()
    .positive()
    .description('Bond length in Angstroms'),
  
  type: Joi.string()
    .description('Bond type')
});

/**
 * Schema for adding bonds
 */
export const addBondsSchema = Joi.object({
  bonds: Joi.array()
    .items(bondDefinitionSchema)
    .min(1)
    .required()
    .description('Array of bonds to add')
});

/**
 * Schema for removing bonds
 */
export const removeBondsSchema = Joi.object({
  selectionName: Joi.string()
    .required()
    .description('Name of the selection containing bonds to remove')
});

/**
 * Schema for transformation parameters
 */
export const transformationSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(TransformationType))
    .required()
    .description('Type of transformation'),
  
  selectionName: Joi.string()
    .description('Name of the selection to transform'),
  
  structureId: Joi.string()
    .description('Structure ID to transform'),
  
  // For rotation
  angle: Joi.number()
    .when('type', {
      is: TransformationType.ROTATE,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Rotation angle in degrees'),
  
  axis: Joi.array()
    .items(Joi.number())
    .length(3)
    .when('type', {
      is: TransformationType.ROTATE,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Rotation axis [x, y, z]'),
  
  center: Joi.array()
    .items(Joi.number())
    .length(3)
    .description('Rotation center point [x, y, z]'),
  
  // For translation
  translation: Joi.array()
    .items(Joi.number())
    .length(3)
    .when('type', {
      is: TransformationType.TRANSLATE,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Translation vector [x, y, z]'),
  
  // For scaling
  factor: Joi.number()
    .positive()
    .when('type', {
      is: TransformationType.SCALE,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Scaling factor'),
  
  // For matrix transformation
  matrix: Joi.array()
    .items(Joi.array().items(Joi.number()).length(4))
    .length(4)
    .when('type', {
      is: TransformationType.MATRIX,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('4x4 transformation matrix')
})
.custom((value, helpers) => {
  if (!value.selectionName && !value.structureId) {
    return helpers.error('object.missing', { peers: ['selectionName', 'structureId'] });
  }
  return value;
})
.description('Transformation parameters');

/**
 * Schema for minimization parameters
 */
export const minimizationSchema = Joi.object({
  selectionName: Joi.string()
    .description('Name of the selection to minimize'),
  
  structureId: Joi.string()
    .description('Structure ID to minimize'),
  
  steps: Joi.number()
    .integer()
    .positive()
    .description('Number of minimization steps'),
  
  algorithm: Joi.string()
    .description('Minimization algorithm'),
  
  forceField: Joi.string()
    .description('Force field to use'),
  
  cutoff: Joi.number()
    .positive()
    .description('Non-bonded interaction cutoff distance'),
  
  maxIterations: Joi.number()
    .integer()
    .positive()
    .description('Maximum number of iterations'),
  
  energyTolerance: Joi.number()
    .positive()
    .description('Energy convergence criterion')
})
.custom((value, helpers) => {
  if (!value.selectionName && !value.structureId) {
    return helpers.error('object.missing', { peers: ['selectionName', 'structureId'] });
  }
  return value;
})
.description('Minimization parameters');