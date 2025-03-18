import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useSession } from '../hooks/useSession';
import LoadingIndicator from './LoadingIndicator';

interface ChimeraXInteractiveViewerProps {
  structureId?: string;
  width?: string;
  height?: string;
  serverUrl?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const ViewerContainer = styled.div<{width?: string, height?: string}>`
  position: relative;
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '600px'};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background-color: #121212;
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
  padding: 20px;
  text-align: center;
`;

const RetryButton = styled.button`
  margin-top: 20px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const FallbackButton = styled.button`
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #219653;
  }
`;

const FallbackViewerContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #121212;
`;

/**
 * ChimeraX Interactive Viewer Component
 * 
 * Embeds the interactive ChimeraX UI directly in the application using an iframe.
 * This provides access to the full ChimeraX interface and functionality.
 * Includes fallback to RCSB Viewer on error.
 */
const ChimeraXInteractiveViewer: React.FC<ChimeraXInteractiveViewerProps> = ({
  structureId,
  width = '100%',
  height = '600px',
  serverUrl = 'http://localhost:9876',
  onLoad,
  onError
}) => {
  const { activeSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Check if ChimeraX server is running
  useEffect(() => {
    if (useFallback) return; // Skip server check if in fallback mode
    
    const checkServer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${serverUrl}/api/health`);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'success') {
          throw new Error('ChimeraX server reported non-success status');
        }
        
        setError(null);
      } catch (err) {
        const errorMessage = `Cannot connect to ChimeraX server: ${(err as Error).message}`;
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    checkServer();
  }, [serverUrl, onError, useFallback]);

  // Load structure if specified
  useEffect(() => {
    if (!structureId || !iframeRef.current || loading || error || useFallback) return;
    
    // Delay to ensure iframe has loaded
    const loadStructureTimer = setTimeout(() => {
      try {
        // Post message to the iframe to load the structure
        // This relies on the iframe content handling the message
        iframeRef.current?.contentWindow?.postMessage({
          type: 'loadStructure',
          structureId
        }, serverUrl);
      } catch (err) {
        console.error('Error sending message to iframe:', err);
      }
    }, 2000);
    
    return () => clearTimeout(loadStructureTimer);
  }, [structureId, loading, error, serverUrl, useFallback]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setLoading(false);
    if (onLoad) onLoad();
  };

  // Retry connection
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Force reload the iframe
    if (iframeRef.current) {
      iframeRef.current.src = `${serverUrl}?t=${Date.now()}`;
    }
  };

  // Switch to fallback RCSB viewer
  const switchToFallback = () => {
    setUseFallback(true);
    setError(null);
    setLoading(false);
  };

  // Determine which PDB ID to use for RCSB viewer
  const getPdbIdFromStructureId = () => {
    if (!structureId) return '1ubq'; // Default fallback
    
    // Extract 4-character PDB ID if possible
    const pdbMatch = structureId.match(/[a-zA-Z0-9]{4}$/);
    return pdbMatch ? pdbMatch[0].toLowerCase() : '1ubq';
  };
  
  // Always use fallback for macOS with OpenGL issues
  useEffect(() => {
    // Check if we're on macOS
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) {
      console.log('macOS detected - using RCSB fallback viewer due to OpenGL compatibility issues');
      setUseFallback(true);
    }
  }, []);

  // Render RCSB Molecular Viewer as fallback
  const renderRcsbViewer = () => {
    const pdbId = getPdbIdFromStructureId();
    return (
      <FallbackViewerContainer>
        <h3 style={{ color: 'white', marginBottom: '20px' }}>RCSB Molecular Viewer (Fallback)</h3>
        <iframe 
          src={`https://www.rcsb.org/3d-view/${pdbId}?preset=default`}
          style={{ width: '95%', height: '90%', border: 'none' }}
          title="RCSB Molecular Viewer"
        />
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => setUseFallback(false)}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#3498db', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Try ChimeraX Again
          </button>
        </div>
      </FallbackViewerContainer>
    );
  };

  if (useFallback) {
    return (
      <ViewerContainer width={width} height={height}>
        {renderRcsbViewer()}
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer width={width} height={height}>
      {loading && (
        <LoadingContainer>
          <LoadingIndicator />
        </LoadingContainer>
      )}
      
      {error ? (
        <ErrorOverlay>
          <div>
            <h3>ChimeraX Connection Error</h3>
            <p>{error}</p>
            <p>Make sure the ChimeraX server is running with:</p>
            <code>./run-interactive.sh</code>
          </div>
          <RetryButton onClick={handleRetry}>
            Retry Connection
          </RetryButton>
          <FallbackButton onClick={switchToFallback}>
            Use RCSB Viewer Instead
          </FallbackButton>
        </ErrorOverlay>
      ) : (
        <StyledIframe
          ref={iframeRef}
          src={`${serverUrl}?session=${activeSession?.id || ''}`}
          title="ChimeraX Interactive"
          onLoad={handleIframeLoad}
          allow="fullscreen"
        />
      )}
    </ViewerContainer>
  );
};

export default ChimeraXInteractiveViewer;