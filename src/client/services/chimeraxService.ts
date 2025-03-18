import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Structure, Atom, Bond, Residue, Chain } from '../types';

/**
 * Status of ChimeraX server connection
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * ChimeraX status response
 */
export interface ChimeraXStatus {
  running: boolean;
  pid?: number;
  chimeraxPath?: string;
  version?: string;
  error?: string;
}

/**
 * Command response from ChimeraX
 */
export interface ChimeraXCommandResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Rendering capabilities
 */
export interface RenderingCapabilities {
  offscreenRendering: boolean;
  webGLSupport: boolean;
  threeDSupport: boolean;
  fallbackAvailable: boolean;
  message?: string;
}

/**
 * ChimeraX API client for communicating with the standalone ChimeraX server
 */
export class ChimeraXClient {
  private client: AxiosInstance;
  private serverUrl: string;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private pollingInterval: NodeJS.Timeout | null = null;
  private capabilities: RenderingCapabilities = {
    offscreenRendering: false,
    webGLSupport: true,
    threeDSupport: true,
    fallbackAvailable: true
  };
  
  /**
   * Create a new ChimeraX client
   * @param serverUrl URL of the ChimeraX standalone server
   */
  constructor(serverUrl: string = 'http://localhost:9876/api') {
    this.serverUrl = serverUrl;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Check if WebGL is supported
    this.checkWebGLSupport();
  }
  
  /**
   * Check if WebGL is supported by the browser
   * Used for fallback determination
   */
  private checkWebGLSupport(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.capabilities.webGLSupport = !!gl;
    } catch (e) {
      this.capabilities.webGLSupport = false;
    }
  }
  
  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Get current rendering capabilities
   */
  public getCapabilities(): RenderingCapabilities {
    return this.capabilities;
  }
  
  /**
   * Start connection status polling
   * @param intervalMs Polling interval in milliseconds
   */
  public startStatusPolling(intervalMs: number = 10000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Do an immediate check
    this.checkConnection();
    
    // Then poll at the specified interval
    this.pollingInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);
  }
  
  /**
   * Stop connection status polling
   */
  public stopStatusPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Check the connection to the ChimeraX server
   */
  public async checkConnection(): Promise<boolean> {
    try {
      this.connectionStatus = ConnectionStatus.CONNECTING;
      const response = await this.client.get('/health');
      
      if (response.data.status === 'success') {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        // Also check ChimeraX status to update rendering capabilities
        await this.updateCapabilities();
        return true;
      } else {
        this.connectionStatus = ConnectionStatus.ERROR;
        return false;
      }
    } catch (error) {
      console.error('ChimeraX server connection failed:', error);
      this.connectionStatus = ConnectionStatus.ERROR;
      return false;
    }
  }
  
  /**
   * Update rendering capabilities based on ChimeraX status
   */
  private async updateCapabilities(): Promise<void> {
    try {
      const status = await this.getChimeraXStatus();
      
      // Update capabilities
      this.capabilities.offscreenRendering = status.running && !status.error;
      
      // If ChimeraX is running but has an error about OSMesa, note the issue
      if (status.running && status.error && status.error.includes('OSMesa')) {
        this.capabilities.offscreenRendering = false;
        this.capabilities.message = 'ChimeraX running but OSMesa libraries missing for offscreen rendering';
      } else if (!status.running) {
        this.capabilities.message = 'ChimeraX is not running';
      } else if (status.error) {
        this.capabilities.message = `ChimeraX error: ${status.error}`;
      } else {
        this.capabilities.message = 'ChimeraX rendering available';
      }
    } catch (error) {
      this.capabilities.offscreenRendering = false;
      this.capabilities.message = 'Failed to determine ChimeraX capabilities';
    }
  }
  
  /**
   * Get the status of ChimeraX process
   */
  public async getChimeraXStatus(): Promise<ChimeraXStatus> {
    try {
      const response = await this.client.get('/chimerax/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get ChimeraX status:', error);
      return { 
        running: false, 
        error: (error as any)?.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Start ChimeraX process
   */
  public async startChimeraX(): Promise<ChimeraXStatus> {
    try {
      const response = await this.client.post('/chimerax/start');
      await this.updateCapabilities();
      return response.data;
    } catch (error) {
      console.error('Failed to start ChimeraX:', error);
      return { 
        running: false, 
        error: (error as any)?.message || 'Failed to start ChimeraX'
      };
    }
  }
  
  /**
   * Stop ChimeraX process
   */
  public async stopChimeraX(): Promise<ChimeraXStatus> {
    try {
      const response = await this.client.post('/chimerax/stop');
      await this.updateCapabilities();
      return response.data;
    } catch (error) {
      console.error('Failed to stop ChimeraX:', error);
      return { 
        running: false, 
        error: (error as any)?.message || 'Failed to stop ChimeraX'
      };
    }
  }
  
  /**
   * Execute a ChimeraX command
   * @param command ChimeraX command to execute
   */
  public async executeCommand(command: string): Promise<ChimeraXCommandResponse> {
    try {
      const response = await this.client.post('/chimerax/command', { command });
      return response.data;
    } catch (error) {
      console.error('Failed to execute ChimeraX command:', error);
      return {
        success: false,
        error: (error as any)?.message || 'Failed to execute command'
      };
    }
  }
  
  /**
   * Render a structure as an image
   * @param structureId Structure ID to render
   * @param options Rendering options
   */
  public async renderStructure(
    structureId: string, 
    options: {
      width?: number;
      height?: number;
      representation?: string;
      colorScheme?: string;
      backgroundColor?: string;
      quality?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      // Check if ChimeraX rendering is available
      if (!this.capabilities.offscreenRendering) {
        return this.getFallbackImage(structureId);
      }
      
      const { width = 800, height = 600, representation = 'ball+stick', colorScheme = 'element', backgroundColor = '#000000', quality = 'medium' } = options;
      
      // Prepare rendering commands
      const commands = [
        `open ${structureId}`,
        `view`,
        `style ${representation}`,
        `color ${colorScheme}`,
        `set bgColor ${backgroundColor}`,
        `view matrix ortho`,
        `saveimage ${width} ${height} supersample ${quality === 'high' ? 3 : quality === 'medium' ? 2 : 1} transparent false`
      ];
      
      const response = await this.client.post('/chimerax/render', {
        commands,
        width,
        height,
        quality
      });
      
      if (response.data.success && response.data.imageUrl) {
        return {
          success: true,
          imageUrl: response.data.imageUrl
        };
      } else {
        console.warn('ChimeraX rendering failed:', response.data.error);
        return this.getFallbackImage(structureId);
      }
    } catch (error) {
      console.error('Structure rendering failed:', error);
      return this.getFallbackImage(structureId);
    }
  }
  
  /**
   * Get a fallback image for a structure
   * @param pdbId PDB ID of the structure to render
   */
  private async getFallbackImage(
    pdbId: string
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    // Try to use PDB ID from the structure ID (often in format like "session_1ABC")
    try {
      // Extract potential PDB ID using regex looking for 4-character alphanumeric code at the end
      const pdbIdMatch = pdbId.match(/[A-Za-z0-9]{4}$/);
      const extractedPdbId = pdbIdMatch ? pdbIdMatch[0] : pdbId;
      
      // Try to get image from RCSB PDB
      return await this.getRcsbImage(extractedPdbId);
    } catch (error) {
      console.error('Failed to get fallback image:', error);
      return {
        success: false,
        error: 'Failed to get structure image'
      };
    }
  }
  
  /**
   * Get a structure image from RCSB PDB
   * @param pdbId PDB ID of the structure
   */
  private async getRcsbImage(
    pdbId: string
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      // Normalize PDB ID to lowercase
      const normalizedPdbId = pdbId.toLowerCase();
      
      // Try different fallback sources in order
      
      // 1. RCSB PDB image service - first try the assembly thumbnail
      const assemblyUrl = `https://cdn.rcsb.org/images/structures/${normalizedPdbId.substring(1, 3)}/${normalizedPdbId}/${normalizedPdbId}_assembly-1.jpeg`;
      
      try {
        // Check if image exists
        await axios.head(assemblyUrl);
        return {
          success: true,
          imageUrl: assemblyUrl
        };
      } catch (e) {
        console.warn('RCSB assembly image not available, trying asymmetric unit');
      }
      
      // 2. Try the asymmetric unit image
      const asymUrl = `https://cdn.rcsb.org/images/structures/${normalizedPdbId.substring(1, 3)}/${normalizedPdbId}/${normalizedPdbId}_asym_r_250.jpeg`;
      
      try {
        await axios.head(asymUrl);
        return {
          success: true,
          imageUrl: asymUrl
        };
      } catch (e) {
        console.warn('RCSB asymmetric image not available, trying PDBe');
      }
      
      // 3. Try PDBe image
      const pdbeUrl = `https://www.ebi.ac.uk/pdbe/static/entry/${normalizedPdbId}_deposited_chain_front_image-200x200.png`;
      
      try {
        await axios.head(pdbeUrl);
        return {
          success: true,
          imageUrl: pdbeUrl
        };
      } catch (e) {
        console.warn('PDBe image not available');
      }
      
      // 4. Return default placeholder image
      return {
        success: false,
        imageUrl: '/assets/molecule-placeholder.png',
        error: 'No structure image available'
      };
    } catch (error) {
      console.error('Error getting RCSB image:', error);
      return {
        success: false,
        imageUrl: '/assets/molecule-placeholder.png',
        error: 'Failed to get structure image'
      };
    }
  }
}

// Create singleton instance
export const chimeraxClient = new ChimeraXClient();
export default chimeraxClient;