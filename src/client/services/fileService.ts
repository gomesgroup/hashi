import api from './api';
import { FileUploadOptions, UploadResponse } from '../types';

export const fileService = {
  /**
   * Upload a molecular structure file
   */
  uploadFile: async (file: File, options: FileUploadOptions): Promise<UploadResponse> => {
    const { sessionId, format, name } = options;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    if (format) {
      formData.append('format', format);
    }
    
    if (name) {
      formData.append('name', name);
    }
    
    try {
      const response = await api.post(`/sessions/${sessionId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'File upload failed',
      };
    }
  },

  /**
   * Get list of uploaded files for a session
   */
  getFiles: async (sessionId: string): Promise<any[]> => {
    const response = await api.get(`/sessions/${sessionId}/files`);
    return response.data;
  },

  /**
   * Download a file by ID
   */
  downloadFile: async (sessionId: string, fileId: string): Promise<Blob> => {
    const response = await api.get(`/sessions/${sessionId}/files/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete a file by ID
   */
  deleteFile: async (sessionId: string, fileId: string): Promise<boolean> => {
    const response = await api.delete(`/sessions/${sessionId}/files/${fileId}`);
    return response.status === 200;
  },
};