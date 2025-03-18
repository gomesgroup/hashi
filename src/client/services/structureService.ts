import axios from 'axios';
import { Structure, StructureMetadata, Atom, Bond, Residue, Chain } from '../types';

// Mock data for testing
const mockStructures: Structure[] = [
  {
    id: '1abc',
    name: 'Sample PDB Structure',
    format: 'pdb',
    path: '/path/to/structure.pdb',
    uploadDate: new Date().toISOString(),
    metadata: {
      atomCount: 4,
      bonds: 3,
      residueCount: 2,
      chainCount: 1,
      title: 'Sample Structure',
      description: 'A sample structure for testing'
    }
  },
  {
    id: '2xyz',
    name: 'Sample CIF Structure',
    format: 'cif',
    path: '/path/to/structure.cif',
    uploadDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    metadata: {
      atomCount: 120,
      bonds: 130,
      residueCount: 15,
      chainCount: 2,
      title: 'Complex Structure',
      description: 'A more complex structure for testing'
    }
  }
];

// Mock atoms
const mockAtoms: Atom[] = [
  { id: 1, element: 'C', x: 0, y: 0, z: 0, residueId: 1, chainId: 'A' },
  { id: 2, element: 'O', x: 1.5, y: 0, z: 0, residueId: 1, chainId: 'A' },
  { id: 3, element: 'N', x: 0, y: 1.5, z: 0, residueId: 2, chainId: 'A' },
  { id: 4, element: 'C', x: 0, y: 0, z: 1.5, residueId: 2, chainId: 'A' },
];

// Mock bonds
const mockBonds: Bond[] = [
  { atomId1: 1, atomId2: 2, order: 2 },
  { atomId1: 1, atomId2: 3, order: 1 },
  { atomId1: 1, atomId2: 4, order: 1 },
];

// Mock residues
const mockResiduesArray: Residue[] = [
  { id: 1, name: 'ALA', number: 1, chainId: 'A' },
  { id: 2, name: 'GLY', number: 2, chainId: 'A' },
];

// Mock chains
const mockChainsArray: Chain[] = [
  { id: 'A', name: 'A', residueCount: 2 },
];

// Residues as a Map
const mockResiduesMap = new Map<number, Residue>(
  mockResiduesArray.map(r => [r.id, r])
);

// Chains as a Map
const mockChainsMap = new Map<string, Chain>(
  mockChainsArray.map(c => [c.id, c])
);

export const structureService = {
  /**
   * Get all structures for a session
   */
  getStructures: async (sessionId: string): Promise<Structure[]> => {
    console.log(`Getting structures for session: ${sessionId}`);
    
    // Return mock data for testing
    return mockStructures;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures`);
    // return response.data;
  },

  /**
   * Get structure metadata
   */
  getStructureMetadata: async (sessionId: string, structureId: string): Promise<StructureMetadata> => {
    console.log(`Getting metadata for structure: ${structureId}`);
    
    // Return mock data for testing
    const structure = mockStructures.find(s => s.id === structureId);
    if (!structure) {
      throw new Error('Structure not found');
    }
    
    return structure.metadata;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/metadata`);
    // return response.data;
  },

  /**
   * Get structure with format specification
   */
  getStructure: async (sessionId: string, structureId: string, format: string = 'json'): Promise<any> => {
    console.log(`Getting structure: ${structureId} in format: ${format}`);
    
    // Return mock data for testing
    const structure = mockStructures.find(s => s.id === structureId);
    if (!structure) {
      throw new Error('Structure not found');
    }
    
    return structure;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}`, {
    //   headers: {
    //     'Accept': format === 'json' ? 'application/json' : `chemical/${format}`,
    //   },
    //   responseType: format === 'json' ? 'json' : 'blob',
    // });
    // return response.data;
  },

  /**
   * Get atom data with optional filtering
   */
  getAtoms: async (sessionId: string, structureId: string, filter?: any): Promise<Atom[]> => {
    console.log(`Getting atoms for structure: ${structureId}`);
    
    // Return mock data for testing
    return mockAtoms;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/atoms`, {
    //   params: filter,
    // });
    // return response.data;
  },

  /**
   * Get bond data
   */
  getBonds: async (sessionId: string, structureId: string): Promise<Bond[]> => {
    console.log(`Getting bonds for structure: ${structureId}`);
    
    // Return mock data for testing
    return mockBonds;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/bonds`);
    // return response.data;
  },

  /**
   * Get residue data
   */
  getResidues: async (sessionId: string, structureId: string): Promise<Residue[]> => {
    console.log(`Getting residues for structure: ${structureId}`);
    
    // Return mock data for testing
    return mockResiduesArray;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/residues`);
    // return response.data;
  },

  /**
   * Get chain data
   */
  getChains: async (sessionId: string, structureId: string): Promise<Chain[]> => {
    console.log(`Getting chains for structure: ${structureId}`);
    
    // Return mock data for testing
    return mockChainsArray;
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/chains`);
    // return response.data;
  },

  /**
   * Get molecular properties
   */
  getProperties: async (sessionId: string, structureId: string): Promise<any> => {
    console.log(`Getting properties for structure: ${structureId}`);
    
    // Return mock data for testing
    return {
      molecularWeight: 162.14,
      formula: 'C6H10N2O3',
      charge: 0,
      bondCount: mockBonds.length,
      atomCount: mockAtoms.length
    };
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/properties`);
    // return response.data;
  },

  /**
   * Clear structure cache
   */
  clearCache: async (sessionId: string): Promise<boolean> => {
    console.log(`Clearing cache for session: ${sessionId}`);
    
    // Always succeed for testing
    return true;
    
    // In production, this would call the API
    // const response = await api.delete(`/sessions/${sessionId}/structures/cache`);
    // return response.status === 200;
  },
};