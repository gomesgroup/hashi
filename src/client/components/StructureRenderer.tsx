import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useChimeraX, ChimeraXRenderOptions } from '../hooks/useChimeraX';
import MolecularViewer from './MolecularViewer';
import { RepresentationType, ColorScheme } from '../types';
import LoadingIndicator from './LoadingIndicator';
import { ConnectionStatus } from '../services/chimeraxService';

interface StructureRendererProps {
  structureId: string;
  width?: string;
  height?: string;
  initialRepresentation?: RepresentationType;
  initialColorScheme?: ColorScheme;
  backgroundColor?: string;
  showHydrogens?: boolean;
  showLabels?: boolean;
  quality?: 'low' | 'medium' | 'high';
  useThreeDFallback?: boolean;
  preferStaticImage?: boolean;
  onRenderComplete?: (success: boolean) => void;
}

const RendererContainer = styled.div<{ width?: string; height?: string }>`
  position: relative;
  width: ${(props) => props.width || '100%'};
  height: ${(props) => props.height || '500px'};
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const StaticImageContainer = styled.div<{ width?: string; height?: string }>`
  position: relative;
  width: ${(props) => props.width || '100%'};
  height: ${(props) => props.height || '500px'};
  background-color: #121212;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const StaticImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const StatusOverlay = styled.div<{ type: 'warning' | 'error' | 'info' }>`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: ${(props) =>
    props.type === 'warning'
      ? 'rgba(241, 196, 15, 0.9)'
      : props.type === 'error'
      ? 'rgba(231, 76, 60, 0.9)'
      : 'rgba(52, 152, 219, 0.9)'};
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
  max-width: 80%;
  pointer-events: none;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 20px;
  text-align: center;
`;

const RetryButton = styled.button`
  margin-top: 15px;
  padding: 5px 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #2980b9;
  }
`;

/**
 * Structure renderer component that supports multiple fallback mechanisms:
 * 1. ChimeraX server rendering - primary method
 * 2. Local Three.js rendering - fallback if ChimeraX unavailable but structure data is available
 * 3. Static image from RCSB PDB - fallback if ChimeraX and structure data unavailable
 */
const StructureRenderer: React.FC<StructureRendererProps> = ({
  structureId,
  width = '100%',
  height = '500px',
  initialRepresentation = RepresentationType.BALL_AND_STICK,
  initialColorScheme = ColorScheme.ELEMENT,
  backgroundColor = '#121212',
  showHydrogens = false,
  showLabels = false,
  quality = 'medium',
  useThreeDFallback = true,
  preferStaticImage = false,
  onRenderComplete
}) => {
  const {
    connectionStatus,
    capabilities,
    renderStructure
  } = useChimeraX();

  const [renderMode, setRenderMode] = useState<'chimerax' | 'three' | 'static'>('chimerax');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'warning' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    // Determine initial render mode based on preferences and capabilities
    if (preferStaticImage) {
      setRenderMode('static');
    } else if (!capabilities.offscreenRendering && useThreeDFallback && capabilities.webGLSupport) {
      setRenderMode('three');
    } else if (!capabilities.offscreenRendering) {
      setRenderMode('static');
    }
  }, [capabilities.offscreenRendering, capabilities.webGLSupport, preferStaticImage, useThreeDFallback]);

  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true);
      
      try {
        // For static or ChimeraX rendering, use the renderStructure function
        if (renderMode === 'static' || renderMode === 'chimerax') {
          const options: ChimeraXRenderOptions = {
            width: parseInt(width.replace(/[^0-9]/g, '')) || 800,
            height: parseInt(height.replace(/[^0-9]/g, '')) || 500,
            representation: mapRepresentationTypeToChimeraX(initialRepresentation),
            colorScheme: mapColorSchemeToChimeraX(initialColorScheme),
            backgroundColor,
            quality
          };
          
          const result = await renderStructure(structureId, options);
          
          if (result.imageUrl) {
            setImageUrl(result.imageUrl);
            setError(null);
            
            if (result.usedFallback) {
              setStatusMessage({
                text: 'ChimeraX rendering unavailable. Using fallback image.',
                type: 'warning'
              });
            }
            
            if (onRenderComplete) {
              onRenderComplete(true);
            }
          } else {
            setError(result.error || 'Failed to render structure');
            setStatusMessage({
              text: `Rendering error: ${result.error}`,
              type: 'error'
            });
            
            if (onRenderComplete) {
              onRenderComplete(false);
            }
          }
        }
      } catch (err) {
        console.error('Structure rendering failed:', err);
        setError((err as Error).message || 'An error occurred during rendering');
        setStatusMessage({
          text: `Rendering error: ${(err as Error).message}`,
          type: 'error'
        });
        
        if (onRenderComplete) {
          onRenderComplete(false);
        }
      } finally {
        setLoading(false);
      }
    };

    if (structureId) {
      fetchImage();
    }
  }, [structureId, renderMode, width, height, initialRepresentation, 
      initialColorScheme, backgroundColor, quality, onRenderComplete,
      renderStructure]);

  // Mapping from RepresentationType to ChimeraX representation
  const mapRepresentationTypeToChimeraX = (representation: RepresentationType): string => {
    switch (representation) {
      case RepresentationType.BALL_AND_STICK:
        return 'ball+stick';
      case RepresentationType.STICK:
        return 'stick';
      case RepresentationType.SPHERE:
        return 'sphere';
      case RepresentationType.CARTOON:
        return 'cartoon';
      case RepresentationType.RIBBON:
        return 'ribbon';
      default:
        return 'ball+stick';
    }
  };

  // Mapping from ColorScheme to ChimeraX color scheme
  const mapColorSchemeToChimeraX = (colorScheme: ColorScheme): string => {
    switch (colorScheme) {
      case ColorScheme.ELEMENT:
        return 'element';
      case ColorScheme.CHAIN:
        return 'chain';
      case ColorScheme.RESIDUE_TYPE:
        return 'bfactor';
      case ColorScheme.B_FACTOR:
        return 'bfactor';
      default:
        return 'element';
    }
  };

  const handleRetry = () => {
    // Try ChimeraX first, unless static is preferred
    if (preferStaticImage) {
      setRenderMode('static');
    } else if (capabilities.offscreenRendering) {
      setRenderMode('chimerax');
    } else if (useThreeDFallback && capabilities.webGLSupport) {
      setRenderMode('three');
    } else {
      setRenderMode('static');
    }
    
    setError(null);
    setStatusMessage(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingIndicator
          size="medium"
          message="Loading molecular structure..."
        />
      );
    }

    if (error) {
      return (
        <ErrorContainer>
          <div>
            {error}
          </div>
          <RetryButton onClick={handleRetry}>
            Retry
          </RetryButton>
        </ErrorContainer>
      );
    }

    if (renderMode === 'three') {
      return (
        <MolecularViewer
          structureId={structureId}
          width="100%"
          height="100%"
          initialRepresentation={initialRepresentation}
          initialColorScheme={initialColorScheme}
          backgroundColor={backgroundColor}
          showHydrogens={showHydrogens}
          showLabels={showLabels}
          quality={quality}
        />
      );
    } else {
      // ChimeraX or static image rendering
      return imageUrl ? (
        <StaticImageContainer width={width} height={height}>
          <StaticImage src={imageUrl} alt={`Structure ${structureId}`} />
        </StaticImageContainer>
      ) : null;
    }
  };

  return (
    <RendererContainer width={width} height={height}>
      {renderContent()}
      {statusMessage && (
        <StatusOverlay type={statusMessage.type}>
          {statusMessage.text}
        </StatusOverlay>
      )}
    </RendererContainer>
  );
};

export default StructureRenderer;