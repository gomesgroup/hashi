import NodeCache from 'node-cache';
import chimeraXProcessManager from './ChimeraXProcessManager';
import sessionService from './session';
import logger from '../utils/logger';
import {
  StructureMetadata,
  StructureData,
  StructureFormat,
  StructureType,
  AtomData,
  BondData,
  ResidueData,
  ChainData,
  StructureProperties,
  StructureFilter
} from '../types/chimerax';

/**
 * Cache configuration
 * structureCache: Caches structure metadata and other lightweight data
 * - Standard TTL: 5 minutes
 * - Check period: 1 minute
 * 
 * atomCache: Caches large coordinate data
 * - Standard TTL: 2 minutes (shorter due to memory concerns)
 * - Check period: 30 seconds
 */
const structureCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60 // 1 minute
});

const atomCache = new NodeCache({
  stdTTL: 120, // 2 minutes
  checkperiod: 30 // 30 seconds
});

/**
 * Structure Retrieval Service
 * Responsible for retrieving structural data from ChimeraX sessions
 */
class StructureRetrievalService {
  /**
   * Get all structures in a session
   * @param sessionId Session ID
   * @returns Array of structure metadata
   */
  public async getStructures(sessionId: string): Promise<StructureMetadata[]> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structures:${sessionId}`;
      const cachedData = structureCache.get<StructureMetadata[]>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached structures for session ${sessionId}`);
        return cachedData;
      }

      // Send command to ChimeraX to list models
      const commandResult = await chimeraXProcessManager.sendCommand(sessionId, 'open_models info');
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error('Failed to retrieve structures from ChimeraX');
      }

      // Parse structure data from the response
      const structures: StructureMetadata[] = await this.parseStructuresFromResponse(sessionId, commandResult.data);
      
      // Cache the result
      structureCache.set(cacheKey, structures);
      
      return structures;
    } catch (error) {
      logger.error(`Error getting structures for session ${sessionId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get structure metadata by ID
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @returns Structure metadata
   */
  public async getStructureMetadata(sessionId: string, structureId: string): Promise<StructureMetadata> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structure:${sessionId}:${structureId}:metadata`;
      const cachedData = structureCache.get<StructureMetadata>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached structure metadata for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Send command to ChimeraX for detailed model info
      const commandResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `open_models info #${modelId} detailed true`
      );
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error(`Failed to retrieve structure ${structureId} from ChimeraX`);
      }

      // Parse metadata from the response
      const metadata = await this.parseStructureMetadataFromResponse(structureId, commandResult.data);
      
      // Cache the result
      structureCache.set(cacheKey, metadata);
      
      return metadata;
    } catch (error) {
      logger.error(`Error getting structure metadata for ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get complete structure data
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @param format Output format
   * @returns Structure data in the requested format
   */
  public async getStructure(
    sessionId: string, 
    structureId: string, 
    format: StructureFormat = StructureFormat.JSON
  ): Promise<any> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first - but only for JSON format
      if (format === StructureFormat.JSON) {
        const cacheKey = `structure:${sessionId}:${structureId}:complete`;
        const cachedData = structureCache.get<StructureData>(cacheKey);
        if (cachedData) {
          logger.debug(`Retrieved cached complete structure for ${structureId}`);
          return cachedData;
        }
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);

      // Handle different format requests
      if (format !== StructureFormat.JSON) {
        return this.getStructureInFormat(sessionId, modelId, format);
      }

      // Get metadata first
      const metadata = await this.getStructureMetadata(sessionId, structureId);
      
      // Get atoms
      const atoms = await this.getAtoms(sessionId, structureId);
      
      // Get bonds
      const bonds = await this.getBonds(sessionId, structureId);
      
      // Get residues
      const residues = await this.getResidues(sessionId, structureId);
      
      // Get chains
      const chains = await this.getChains(sessionId, structureId);
      
      // Get properties
      const properties = await this.getProperties(sessionId, structureId);

      // Assemble complete structure data
      const structureData: StructureData = {
        metadata,
        atoms,
        bonds,
        residues,
        chains,
        properties
      };

      // Cache the result
      const cacheKey = `structure:${sessionId}:${structureId}:complete`;
      structureCache.set(cacheKey, structureData);
      
      return structureData;
    } catch (error) {
      logger.error(`Error getting complete structure for ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get atom data for a structure
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @param filter Filter criteria
   * @returns Array of atom data
   */
  public async getAtoms(
    sessionId: string, 
    structureId: string, 
    filter?: StructureFilter
  ): Promise<AtomData[]> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Generate cache key with filter parameters
      const filterString = filter ? JSON.stringify(filter) : 'all';
      const cacheKey = `structure:${sessionId}:${structureId}:atoms:${filterString}`;
      
      // Check cache for large data
      const cachedData = atomCache.get<AtomData[]>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached atoms for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Build selection command based on filters
      let selectionSpec = `#${modelId}`;
      selectionSpec = this.buildAtomSelectionSpec(selectionSpec, filter);
      
      // Send command to ChimeraX for atom info
      const commandResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `info ${selectionSpec} atoms basic true`
      );
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error(`Failed to retrieve atoms for structure ${structureId}`);
      }

      // Parse atom data from the response
      const atoms = this.parseAtomsFromResponse(commandResult.data);
      
      // Cache the result
      atomCache.set(cacheKey, atoms);
      
      return atoms;
    } catch (error) {
      logger.error(`Error getting atoms for structure ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get bond data for a structure
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @returns Array of bond data
   */
  public async getBonds(sessionId: string, structureId: string): Promise<BondData[]> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structure:${sessionId}:${structureId}:bonds`;
      const cachedData = structureCache.get<BondData[]>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached bonds for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Send command to ChimeraX for bond info
      const commandResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `info #${modelId} bonds`
      );
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error(`Failed to retrieve bonds for structure ${structureId}`);
      }

      // Parse bond data from the response
      const bonds = this.parseBondsFromResponse(commandResult.data);
      
      // Cache the result
      structureCache.set(cacheKey, bonds);
      
      return bonds;
    } catch (error) {
      logger.error(`Error getting bonds for structure ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get residue data for a structure
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @returns Array of residue data
   */
  public async getResidues(sessionId: string, structureId: string): Promise<ResidueData[]> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structure:${sessionId}:${structureId}:residues`;
      const cachedData = structureCache.get<ResidueData[]>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached residues for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Send command to ChimeraX for residue info
      const commandResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `info #${modelId} residues`
      );
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error(`Failed to retrieve residues for structure ${structureId}`);
      }

      // Parse residue data from the response
      const residues = this.parseResiduesFromResponse(commandResult.data);
      
      // Cache the result
      structureCache.set(cacheKey, residues);
      
      return residues;
    } catch (error) {
      logger.error(`Error getting residues for structure ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get chain data for a structure
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @returns Array of chain data
   */
  public async getChains(sessionId: string, structureId: string): Promise<ChainData[]> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structure:${sessionId}:${structureId}:chains`;
      const cachedData = structureCache.get<ChainData[]>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached chains for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Send command to ChimeraX for chain info
      const commandResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `info #${modelId} chains`
      );
      
      if (!commandResult.success || !commandResult.data) {
        throw new Error(`Failed to retrieve chains for structure ${structureId}`);
      }

      // Parse chain data from the response
      const chains = this.parseChainsFromResponse(commandResult.data);
      
      // Cache the result
      structureCache.set(cacheKey, chains);
      
      return chains;
    } catch (error) {
      logger.error(`Error getting chains for structure ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get calculated properties for a structure
   * @param sessionId Session ID
   * @param structureId Structure ID
   * @returns Structure properties
   */
  public async getProperties(sessionId: string, structureId: string): Promise<StructureProperties> {
    try {
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check cache first
      const cacheKey = `structure:${sessionId}:${structureId}:properties`;
      const cachedData = structureCache.get<StructureProperties>(cacheKey);
      if (cachedData) {
        logger.debug(`Retrieved cached properties for ${structureId}`);
        return cachedData;
      }

      // Get the model number from the structure ID
      const modelId = this.getModelIdFromStructureId(structureId);
      
      // Calculate properties using ChimeraX commands
      const properties: StructureProperties = {};
      
      // Mass
      const massResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `measure mass #${modelId}`
      );
      if (massResult.success && massResult.data) {
        properties.mass = this.extractNumericValue(massResult.data.mass);
      }
      
      // Center of mass
      const comResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `measure center #${modelId}`
      );
      if (comResult.success && comResult.data && comResult.data.center) {
        properties.centerOfMass = comResult.data.center;
      }
      
      // Volume and surface area - only works for closed surfaces
      try {
        const surfaceResult = await chimeraXProcessManager.sendCommand(
          sessionId, 
          `measure sasa #${modelId}`
        );
        if (surfaceResult.success && surfaceResult.data) {
          properties.surfaceArea = this.extractNumericValue(surfaceResult.data.area);
          properties.volume = this.extractNumericValue(surfaceResult.data.volume);
        }
      } catch (error) {
        // Surface calculation might fail for some molecules
        logger.debug(`Surface calculation failed for ${structureId}: ${(error as Error).message}`);
      }
      
      // Dimensions (bounding box)
      const dimensionsResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `measure inertia #${modelId}`
      );
      if (dimensionsResult.success && dimensionsResult.data && dimensionsResult.data.axes) {
        properties.dimensions = [
          dimensionsResult.data.axes[0].length,
          dimensionsResult.data.axes[1].length,
          dimensionsResult.data.axes[2].length
        ];
      }
      
      // Secondary structure composition
      const ssResult = await chimeraXProcessManager.sendCommand(
        sessionId, 
        `info #${modelId} residues ssType true`
      );
      if (ssResult.success && ssResult.data) {
        const ss = {
          helix: 0,
          sheet: 0,
          coil: 0
        };
        
        // Parse secondary structure data
        if (ssResult.data.residues) {
          for (const residue of ssResult.data.residues) {
            if (residue.ssType === 'helix') {
              ss.helix++;
            } else if (residue.ssType === 'sheet') {
              ss.sheet++;
            } else {
              ss.coil++;
            }
          }
        }
        
        properties.secondaryStructure = ss;
      }
      
      // Cache the result
      structureCache.set(cacheKey, properties);
      
      return properties;
    } catch (error) {
      logger.error(`Error getting properties for structure ${structureId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Clear caches for a specific session
   * @param sessionId Session ID
   */
  public clearCachesForSession(sessionId: string): void {
    // Get all keys that contain the session ID
    const structureCacheKeys = structureCache.keys().filter(key => key.includes(sessionId));
    const atomCacheKeys = atomCache.keys().filter(key => key.includes(sessionId));
    
    // Delete them
    structureCacheKeys.forEach(key => structureCache.del(key));
    atomCacheKeys.forEach(key => atomCache.del(key));
    
    logger.debug(`Cleared ${structureCacheKeys.length} structure cache entries and ${atomCacheKeys.length} atom cache entries for session ${sessionId}`);
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    structureCache.flushAll();
    atomCache.flushAll();
    logger.debug('Cleared all structure and atom caches');
  }

  /**
   * Get a structure in a specific format
   * @param sessionId Session ID
   * @param modelId Model ID
   * @param format Output format
   * @returns Structure data in the requested format
   * @private
   */
  private async getStructureInFormat(sessionId: string, modelId: number, format: StructureFormat): Promise<string> {
    try {
      let commandResult;
      let formatData = '';
      
      // Format-specific commands
      switch (format) {
        case StructureFormat.PDB:
          commandResult = await chimeraXProcessManager.sendCommand(
            sessionId, 
            `export pdb #${modelId} pdbVersion 3`
          );
          if (commandResult.success && commandResult.data) {
            formatData = commandResult.data.pdbText;
          }
          break;
          
        case StructureFormat.CIF:
          commandResult = await chimeraXProcessManager.sendCommand(
            sessionId, 
            `export mmcif #${modelId}`
          );
          if (commandResult.success && commandResult.data) {
            formatData = commandResult.data.mmcifText;
          }
          break;
          
        case StructureFormat.SDF:
          commandResult = await chimeraXProcessManager.sendCommand(
            sessionId, 
            `export sdf #${modelId}`
          );
          if (commandResult.success && commandResult.data) {
            formatData = commandResult.data.sdfText;
          }
          break;
          
        case StructureFormat.MOL2:
          commandResult = await chimeraXProcessManager.sendCommand(
            sessionId, 
            `export mol2 #${modelId}`
          );
          if (commandResult.success && commandResult.data) {
            formatData = commandResult.data.mol2Text;
          }
          break;
          
        case StructureFormat.XYZ:
          commandResult = await chimeraXProcessManager.sendCommand(
            sessionId, 
            `export xyz #${modelId}`
          );
          if (commandResult.success && commandResult.data) {
            formatData = commandResult.data.xyzText;
          }
          break;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      if (!formatData) {
        throw new Error(`Failed to convert structure to ${format} format`);
      }
      
      return formatData;
    } catch (error) {
      logger.error(`Error converting structure to format ${format}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Build an atom selection specification based on filter criteria
   * @param baseSpec Base selection specification
   * @param filter Filter criteria
   * @returns Complete selection specification
   * @private
   */
  private buildAtomSelectionSpec(baseSpec: string, filter?: StructureFilter): string {
    if (!filter) {
      return baseSpec;
    }
    
    let spec = baseSpec;
    const selectors: string[] = [];
    
    // Chain filter
    if (filter.chains && filter.chains.length > 0) {
      selectors.push(`/${filter.chains.join(',')}`);
    }
    
    // Residue filter
    if (filter.residues && filter.residues.length > 0) {
      selectors.push(`:${filter.residues.join(',')}`);
    }
    
    // Residue range filter
    if (filter.residueRanges && filter.residueRanges.length > 0) {
      const rangeSpecs = filter.residueRanges.map(range => 
        `/${range.chain}:${range.start}-${range.end}`
      );
      selectors.push(rangeSpecs.join('|'));
    }
    
    // Element filter
    if (filter.elements && filter.elements.length > 0) {
      selectors.push(`@${filter.elements.join(',')}`);
    }
    
    // Atom serial numbers
    if (filter.atomSerials && filter.atomSerials.length > 0) {
      selectors.push(`@${filter.atomSerials.join(',')}`);
    }
    
    // Ligand filter
    if (filter.ligands) {
      selectors.push('ligand');
    }
    
    // Water filter
    if (filter.water === false) {
      selectors.push('~solvent');
    } else if (filter.water === true) {
      selectors.push('solvent');
    }
    
    // Metals filter
    if (filter.metals === false) {
      selectors.push('~metal');
    } else if (filter.metals === true) {
      selectors.push('metal');
    }
    
    // Distance-based filter
    if (filter.distanceFrom) {
      const { x, y, z, radius } = filter.distanceFrom;
      selectors.push(`@dist(${x},${y},${z}) < ${radius}`);
    }
    
    // Combine base spec with selectors
    if (selectors.length > 0) {
      spec = `${baseSpec} & ${selectors.join(' & ')}`;
    }
    
    return spec;
  }

  /**
   * Parse structure information from ChimeraX response
   * @param sessionId Session ID
   * @param data ChimeraX response data
   * @returns Array of structure metadata
   * @private
   */
  private async parseStructuresFromResponse(sessionId: string, data: any): Promise<StructureMetadata[]> {
    const structures: StructureMetadata[] = [];
    
    if (!data.models || !Array.isArray(data.models)) {
      return structures;
    }
    
    for (const model of data.models) {
      // Convert ChimeraX model to our structure format
      const structureId = `${sessionId}_${model.id}`;
      
      // Determine the structure type based on the data
      let type = StructureType.UNKNOWN;
      if (model.type === 'protein') {
        type = StructureType.PROTEIN;
      } else if (model.type === 'nucleic_acid') {
        type = StructureType.NUCLEIC_ACID;
      } else if (model.type === 'ligand') {
        type = StructureType.LIGAND;
      } else if (model.atom_count < 100) {
        type = StructureType.SMALL_MOLECULE;
      } else if (model.atom_count >= 100) {
        type = StructureType.COMPLEX;
      }
      
      const structure: StructureMetadata = {
        id: structureId,
        modelId: model.id,
        name: model.name || `Structure ${model.id}`,
        type,
        source: model.source || undefined,
        resolution: model.resolution || undefined,
        chains: model.chain_count || undefined,
        residues: model.residue_count || undefined,
        atoms: model.atom_count || undefined,
        bonds: model.bond_count || undefined,
        created: new Date()
      };
      
      structures.push(structure);
    }
    
    return structures;
  }

  /**
   * Parse detailed structure metadata from ChimeraX response
   * @param structureId Structure ID
   * @param data ChimeraX response data
   * @returns Structure metadata
   * @private
   */
  private async parseStructureMetadataFromResponse(structureId: string, data: any): Promise<StructureMetadata> {
    if (!data.models || !data.models[0]) {
      throw new Error('Invalid ChimeraX response for structure metadata');
    }
    
    const model = data.models[0];
    const modelId = this.getModelIdFromStructureId(structureId);
    
    // Determine the structure type based on the data
    let type = StructureType.UNKNOWN;
    if (model.type === 'protein') {
      type = StructureType.PROTEIN;
    } else if (model.type === 'nucleic_acid') {
      type = StructureType.NUCLEIC_ACID;
    } else if (model.type === 'ligand') {
      type = StructureType.LIGAND;
    } else if (model.atom_count < 100) {
      type = StructureType.SMALL_MOLECULE;
    } else if (model.atom_count >= 100) {
      type = StructureType.COMPLEX;
    }
    
    return {
      id: structureId,
      modelId,
      name: model.name || `Structure ${model.id}`,
      type,
      description: model.description || undefined,
      source: model.source || undefined,
      resolution: model.resolution || undefined,
      chains: model.chain_count || undefined,
      residues: model.residue_count || undefined,
      atoms: model.atom_count || undefined,
      bonds: model.bond_count || undefined,
      created: new Date()
    };
  }

  /**
   * Parse atom data from ChimeraX response
   * @param data ChimeraX response data
   * @returns Array of atom data
   * @private
   */
  private parseAtomsFromResponse(data: any): AtomData[] {
    const atoms: AtomData[] = [];
    
    if (!data.atoms || !Array.isArray(data.atoms)) {
      return atoms;
    }
    
    for (const atom of data.atoms) {
      atoms.push({
        id: atom.id,
        element: atom.element || '',
        name: atom.name || '',
        serial: atom.serial || atom.id,
        x: atom.xyz[0],
        y: atom.xyz[1],
        z: atom.xyz[2],
        residue: atom.residue_name || '',
        residueId: atom.residue_id || 0,
        chain: atom.chain_id || '',
        bfactor: atom.bfactor !== undefined ? atom.bfactor : undefined,
        occupancy: atom.occupancy !== undefined ? atom.occupancy : undefined,
        isHet: atom.is_het !== undefined ? atom.is_het : undefined
      });
    }
    
    return atoms;
  }

  /**
   * Parse bond data from ChimeraX response
   * @param data ChimeraX response data
   * @returns Array of bond data
   * @private
   */
  private parseBondsFromResponse(data: any): BondData[] {
    const bonds: BondData[] = [];
    
    if (!data.bonds || !Array.isArray(data.bonds)) {
      return bonds;
    }
    
    for (const bond of data.bonds) {
      bonds.push({
        id: bond.id,
        atom1: bond.atom1_id,
        atom2: bond.atom2_id,
        order: bond.order || 1,
        type: bond.type || undefined,
        length: bond.length || undefined
      });
    }
    
    return bonds;
  }

  /**
   * Parse residue data from ChimeraX response
   * @param data ChimeraX response data
   * @returns Array of residue data
   * @private
   */
  private parseResiduesFromResponse(data: any): ResidueData[] {
    const residues: ResidueData[] = [];
    
    if (!data.residues || !Array.isArray(data.residues)) {
      return residues;
    }
    
    for (const residue of data.residues) {
      residues.push({
        id: residue.id,
        name: residue.name || '',
        number: residue.number || 0,
        insertionCode: residue.insertion_code || undefined,
        chain: residue.chain_id || '',
        secondaryStructure: residue.ss_type || undefined,
        atoms: residue.atom_ids || []
      });
    }
    
    return residues;
  }

  /**
   * Parse chain data from ChimeraX response
   * @param data ChimeraX response data
   * @returns Array of chain data
   * @private
   */
  private parseChainsFromResponse(data: any): ChainData[] {
    const chains: ChainData[] = [];
    
    if (!data.chains || !Array.isArray(data.chains)) {
      return chains;
    }
    
    for (const chain of data.chains) {
      chains.push({
        id: chain.id,
        name: chain.name || chain.id,
        residueCount: chain.residue_count || 0,
        atomCount: chain.atom_count || 0,
        description: chain.description || undefined,
        residues: chain.residue_ids || []
      });
    }
    
    return chains;
  }

  /**
   * Extract a numeric value from ChimeraX response text
   * @param value Value to extract
   * @returns Extracted numeric value
   * @private
   */
  private extractNumericValue(value: any): number | undefined {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      const match = value.match(/(\d+(\.\d+)?)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }
    
    return undefined;
  }

  /**
   * Extract a model ID from a structure ID
   * @param structureId Structure ID
   * @returns Model ID
   * @private
   */
  private getModelIdFromStructureId(structureId: string): number {
    // Structure IDs are in the format sessionId_modelId
    const parts = structureId.split('_');
    if (parts.length < 2) {
      throw new Error(`Invalid structure ID: ${structureId}`);
    }
    
    const modelId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(modelId)) {
      throw new Error(`Invalid model ID in structure ID: ${structureId}`);
    }
    
    return modelId;
  }
}

export const structureRetrievalService = new StructureRetrievalService();
export default structureRetrievalService;