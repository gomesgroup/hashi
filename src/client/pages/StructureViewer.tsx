import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { RepresentationType, ColorScheme } from '../types';
import { useSession } from '../hooks/useSession';
import { useChimeraX } from '../hooks/useChimeraX';
import StructureRenderer from '../components/StructureRenderer';
import EnhancedViewerControls from '../components/EnhancedViewerControls';
import StructurePlaceholder from '../components/StructurePlaceholder';
import LoadingIndicator from '../components/LoadingIndicator';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin-bottom: 20px;
  color: var(--text-color);
`;

const ViewerContent = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MainViewer = styled.div`
  flex: 1;
  min-width: 500px;
  
  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const ControlsPanel = styled.div`
  width: 300px;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const InfoPanel = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ErrorContainer = styled.div`
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #b91c1c;
`;

const InfoItem = styled.div`
  margin-bottom: 12px;
`;

const InfoLabel = styled.span`
  font-weight: 600;
  margin-right: 8px;
`;

const InfoValue = styled.span`
  color: var(--text-color-light);
`;

const StructureViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const structureId = searchParams.get('structureId') || '';
  const { activeSession } = useSession();
  const { 
    connectionStatus, 
    capabilities, 
    renderStructure 
  } = useChimeraX();
  
  const [title, setTitle] = useState<string>('Structure Viewer');
  const [renderMode, setRenderMode] = useState<'chimerax' | 'three' | 'static'>('chimerax');
  const [representation, setRepresentation] = useState<RepresentationType>(RepresentationType.BALL_AND_STICK);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(ColorScheme.ELEMENT);
  const [backgroundColor, setBackgroundColor] = useState<string>('#121212');
  const [showHydrogens, setShowHydrogens] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [renderKey, setRenderKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [structureInfo, setStructureInfo] = useState<{
    atoms?: number;
    bonds?: number;
    residues?: number;
    chains?: number;
    pdbId?: string;
    format?: string;
  } | null>(null);
  
  // Initialize based on capabilities
  useEffect(() => {
    if (capabilities) {
      if (capabilities.offscreenRendering) {
        setRenderMode('chimerax');
      } else if (capabilities.webGLSupport) {
        setRenderMode('three');
      } else {
        setRenderMode('static');
      }
    }
  }, [capabilities]);
  
  // When structure ID changes, update the title and reset state
  useEffect(() => {
    if (structureId) {
      setTitle(`Structure Viewer - ${structureId}`);
      setLoading(true);
      setError(null);
      
      // You could load structure metadata here
      // For now, we'll just simulate it
      setTimeout(() => {
        setStructureInfo({
          atoms: 1243,
          bonds: 1289,
          residues: 124,
          chains: 2,
          pdbId: structureId.includes('_') ? structureId.split('_')[1] : structureId,
          format: 'PDB'
        });
        setLoading(false);
      }, 500);
    } else {
      setTitle('Structure Viewer');
      setStructureInfo(null);
      setError('No structure ID provided');
    }
  }, [structureId]);
  
  const handleRefresh = () => {
    setRenderKey(prevKey => prevKey + 1);
  };
  
  const handleRenderComplete = (success: boolean) => {
    if (!success) {
      if (renderMode === 'chimerax') {
        // If ChimeraX rendering failed, try Three.js
        if (capabilities.webGLSupport) {
          setRenderMode('three');
        } else {
          setRenderMode('static');
        }
      } else if (renderMode === 'three') {
        // If Three.js rendering fails, fall back to static image
        setRenderMode('static');
      }
    }
  };
  
  if (!activeSession) {
    return (
      <ViewerContainer>
        <ErrorContainer>
          No active session. Please create or select a session first.
        </ErrorContainer>
      </ViewerContainer>
    );
  }
  
  if (!structureId) {
    return (
      <ViewerContainer>
        <Title>{title}</Title>
        <ErrorContainer>
          No structure ID provided. Please select a structure to view.
        </ErrorContainer>
      </ViewerContainer>
    );
  }
  
  return (
    <ViewerContainer>
      <Title>{title}</Title>
      
      <ViewerContent>
        <MainViewer>
          {loading ? (
            <LoadingIndicator size="large" message="Loading structure..." />
          ) : error ? (
            <StructurePlaceholder 
              message={error}
              width="100%"
              height="600px"
              backgroundColor={backgroundColor}
            />
          ) : (
            <StructureRenderer
              key={renderKey}
              structureId={structureId}
              width="100%"
              height="600px"
              initialRepresentation={representation}
              initialColorScheme={colorScheme}
              backgroundColor={backgroundColor}
              showHydrogens={showHydrogens}
              showLabels={showLabels}
              quality={quality}
              useThreeDFallback={renderMode === 'three'}
              preferStaticImage={renderMode === 'static'}
              onRenderComplete={handleRenderComplete}
            />
          )}
        </MainViewer>
        
        <ControlsPanel>
          <EnhancedViewerControls
            representation={representation}
            colorScheme={colorScheme}
            backgroundColor={backgroundColor}
            showHydrogens={showHydrogens}
            showLabels={showLabels}
            quality={quality}
            renderMode={renderMode}
            capabilities={capabilities}
            connectionStatus={connectionStatus}
            onRepresentationChange={setRepresentation}
            onColorSchemeChange={setColorScheme}
            onBackgroundColorChange={setBackgroundColor}
            onShowHydrogensChange={setShowHydrogens}
            onShowLabelsChange={setShowLabels}
            onQualityChange={setQuality}
            onRenderModeChange={setRenderMode}
            onRefresh={handleRefresh}
          />
        </ControlsPanel>
      </ViewerContent>
      
      {structureInfo && (
        <InfoPanel>
          <h2>Structure Information</h2>
          <InfoItem>
            <InfoLabel>ID:</InfoLabel>
            <InfoValue>{structureId}</InfoValue>
          </InfoItem>
          {structureInfo.pdbId && (
            <InfoItem>
              <InfoLabel>PDB ID:</InfoLabel>
              <InfoValue>{structureInfo.pdbId}</InfoValue>
            </InfoItem>
          )}
          {structureInfo.format && (
            <InfoItem>
              <InfoLabel>Format:</InfoLabel>
              <InfoValue>{structureInfo.format}</InfoValue>
            </InfoItem>
          )}
          {structureInfo.atoms && (
            <InfoItem>
              <InfoLabel>Atoms:</InfoLabel>
              <InfoValue>{structureInfo.atoms.toLocaleString()}</InfoValue>
            </InfoItem>
          )}
          {structureInfo.bonds && (
            <InfoItem>
              <InfoLabel>Bonds:</InfoLabel>
              <InfoValue>{structureInfo.bonds.toLocaleString()}</InfoValue>
            </InfoItem>
          )}
          {structureInfo.residues && (
            <InfoItem>
              <InfoLabel>Residues:</InfoLabel>
              <InfoValue>{structureInfo.residues.toLocaleString()}</InfoValue>
            </InfoItem>
          )}
          {structureInfo.chains && (
            <InfoItem>
              <InfoLabel>Chains:</InfoLabel>
              <InfoValue>{structureInfo.chains}</InfoValue>
            </InfoItem>
          )}
          
          {/* Display links to external resources */}
          {structureInfo.pdbId && structureInfo.pdbId.length === 4 && (
            <div style={{ marginTop: '20px' }}>
              <h3>External Resources</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <a 
                  href={`https://www.rcsb.org/structure/${structureInfo.pdbId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#3498db', 
                    color: 'white', 
                    borderRadius: '4px',
                    textDecoration: 'none'
                  }}
                >
                  View on RCSB PDB
                </a>
                <a 
                  href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${structureInfo.pdbId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#2ecc71', 
                    color: 'white', 
                    borderRadius: '4px',
                    textDecoration: 'none'
                  }}
                >
                  View on PDBe
                </a>
              </div>
            </div>
          )}
        </InfoPanel>
      )}
    </ViewerContainer>
  );
};

export default StructureViewer;