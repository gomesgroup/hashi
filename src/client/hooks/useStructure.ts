import { useState, useCallback } from 'react';
import axios from 'axios';
import { Atom, Bond, Structure, Residue, Chain } from '../types';

// Mock data for testing
const mockAtoms: Atom[] = [
  { id: 1, element: 'C', x: 0, y: 0, z: 0, residueId: 1, chainId: 'A' },
  { id: 2, element: 'O', x: 1.5, y: 0, z: 0, residueId: 1, chainId: 'A' },
  { id: 3, element: 'N', x: 0, y: 1.5, z: 0, residueId: 2, chainId: 'A' },
  { id: 4, element: 'C', x: 0, y: 0, z: 1.5, residueId: 2, chainId: 'A' },
];

const mockBonds: Bond[] = [
  { atomId1: 1, atomId2: 2, order: 2 },
  { atomId1: 1, atomId2: 3, order: 1 },
  { atomId1: 1, atomId2: 4, order: 1 },
];

const mockResidues = new Map<number, Residue>([
  [1, { id: 1, name: 'ALA', number: 1, chainId: 'A' }],
  [2, { id: 2, name: 'GLY', number: 2, chainId: 'A' }],
]);

const mockChains = new Map<string, Chain>([
  ['A', { id: 'A', name: 'A', residueCount: 2 }],
]);

const mockStructure: Structure = {
  id: '1abc',
  name: 'Sample Structure',
  format: 'pdb',
  metadata: {
    atomCount: mockAtoms.length,
    residueCount: mockResidues.size,
    chainCount: mockChains.size,
    bonds: mockBonds.length
  },
  path: '/path/to/structure',
  uploadDate: new Date().toISOString(),
};

interface UseStructureReturn {
  structure: Structure | null;
  atoms: Atom[];
  bonds: Bond[];
  residues: Map<number, Residue>;
  chains: Map<string, Chain>;
  loading: boolean;
  error: string | null;
  fetchStructure: (structureId: string) => Promise<void>;
}

export const useStructure = (): UseStructureReturn => {
  const [structure, setStructure] = useState<Structure | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [residues, setResidues] = useState<Map<number, Residue>>(new Map());
  const [chains, setChains] = useState<Map<string, Chain>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStructure = useCallback(async (structureId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use mock data
      // In a real implementation, this would fetch from the API
      // const response = await axios.get(`/api/structures/${structureId}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStructure(mockStructure);
      setAtoms(mockAtoms);
      setBonds(mockBonds);
      setResidues(mockResidues);
      setChains(mockChains);
      
    } catch (err: any) {
      console.error('Error fetching structure:', err);
      setError(err.message || 'Failed to load structure');
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    structure,
    atoms,
    bonds,
    residues,
    chains,
    loading,
    error,
    fetchStructure
  };
};

export default useStructure;