import { useState, useEffect, useCallback } from 'react';
import chimeraxClient, { 
  ConnectionStatus, 
  ChimeraXStatus, 
  RenderingCapabilities 
} from '../services/chimeraxService';

export interface ChimeraXRenderOptions {
  width?: number;
  height?: number;
  representation?: string;
  colorScheme?: string;
  backgroundColor?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface ChimeraXRenderResult {
  loading: boolean;
  imageUrl?: string;
  error?: string;
  usedFallback: boolean;
}

/**
 * Hook for interacting with ChimeraX server
 */
export const useChimeraX = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    chimeraxClient.getConnectionStatus()
  );
  const [serverStatus, setServerStatus] = useState<ChimeraXStatus | null>(null);
  const [capabilities, setCapabilities] = useState<RenderingCapabilities>(
    chimeraxClient.getCapabilities()
  );
  const [isPolling, setIsPolling] = useState(false);

  // Initialize connection status polling
  useEffect(() => {
    const startPolling = async () => {
      setIsPolling(true);
      await chimeraxClient.checkConnection();
      const status = await chimeraxClient.getChimeraXStatus();
      setServerStatus(status);
      setConnectionStatus(chimeraxClient.getConnectionStatus());
      setCapabilities(chimeraxClient.getCapabilities());
      chimeraxClient.startStatusPolling();
    };

    startPolling();

    return () => {
      chimeraxClient.stopStatusPolling();
      setIsPolling(false);
    };
  }, []);

  // Check connection manually
  const checkConnection = useCallback(async () => {
    const connected = await chimeraxClient.checkConnection();
    const status = await chimeraxClient.getChimeraXStatus();
    setServerStatus(status);
    setConnectionStatus(chimeraxClient.getConnectionStatus());
    setCapabilities(chimeraxClient.getCapabilities());
    return connected;
  }, []);

  // Start ChimeraX server
  const startChimeraX = useCallback(async () => {
    const status = await chimeraxClient.startChimeraX();
    setServerStatus(status);
    await checkConnection();
    return status;
  }, [checkConnection]);

  // Stop ChimeraX server
  const stopChimeraX = useCallback(async () => {
    const status = await chimeraxClient.stopChimeraX();
    setServerStatus(status);
    await checkConnection();
    return status;
  }, [checkConnection]);

  // Execute a ChimeraX command
  const executeCommand = useCallback(async (command: string) => {
    return chimeraxClient.executeCommand(command);
  }, []);

  // Render a structure using ChimeraX or fallbacks
  const renderStructure = useCallback(
    async (structureId: string, options?: ChimeraXRenderOptions): Promise<ChimeraXRenderResult> => {
      try {
        // Attempt to render with ChimeraX
        const result = await chimeraxClient.renderStructure(structureId, options);
        
        if (result.success && result.imageUrl) {
          return {
            loading: false,
            imageUrl: result.imageUrl,
            usedFallback: !capabilities.offscreenRendering
          };
        } else {
          return {
            loading: false,
            error: result.error || 'Failed to render structure',
            usedFallback: true
          };
        }
      } catch (error) {
        console.error('Rendering error:', error);
        return {
          loading: false,
          error: (error as Error).message || 'Failed to render structure',
          usedFallback: true
        };
      }
    },
    [capabilities.offscreenRendering]
  );

  return {
    connectionStatus,
    serverStatus,
    capabilities,
    isPolling,
    checkConnection,
    startChimeraX,
    stopChimeraX,
    executeCommand,
    renderStructure
  };
};

export default useChimeraX;