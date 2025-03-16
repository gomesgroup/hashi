import api from './api';
import { Structure, StructureMetadata, Atom, Bond, Residue, Chain } from '../types';

export const structureService = {
  /**
   * Get all structures for a session
   */
  getStructures: async (sessionId: string): Promise<Structure[]> => {
    const response = await api.get(`/sessions/${sessionId}/structures`);
    return response.data;
  },

  /**
   * Get structure metadata
   */
  getStructureMetadata: async (sessionId: string, structureId: string): Promise<StructureMetadata> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/metadata`);
    return response.data;
  },

  /**
   * Get structure with format specification
   */
  getStructure: async (sessionId: string, structureId: string, format: string = 'json'): Promise<any> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}`, {
      headers: {
        'Accept': format === 'json' ? 'application/json' : `chemical/${format}`,
      },
      responseType: format === 'json' ? 'json' : 'blob',
    });
    return response.data;
  },

  /**
   * Get atom data with optional filtering
   */
  getAtoms: async (sessionId: string, structureId: string, filter?: any): Promise<Atom[]> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/atoms`, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get bond data
   */
  getBonds: async (sessionId: string, structureId: string): Promise<Bond[]> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/bonds`);
    return response.data;
  },

  /**
   * Get residue data
   */
  getResidues: async (sessionId: string, structureId: string): Promise<Residue[]> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/residues`);
    return response.data;
  },

  /**
   * Get chain data
   */
  getChains: async (sessionId: string, structureId: string): Promise<Chain[]> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/chains`);
    return response.data;
  },

  /**
   * Get molecular properties
   */
  getProperties: async (sessionId: string, structureId: string): Promise<any> => {
    const response = await api.get(`/sessions/${sessionId}/structures/${structureId}/properties`);
    return response.data;
  },

  /**
   * Clear structure cache
   */
  clearCache: async (sessionId: string): Promise<boolean> => {
    const response = await api.delete(`/sessions/${sessionId}/structures/cache`);
    return response.status === 200;
  },
};