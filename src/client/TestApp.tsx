import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';

// Styled components for UI
const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  height: calc(100vh - 40px);
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  color: #333;
`;

const StatusBox = styled.div<{ status: 'loading' | 'success' | 'error' }>`
  padding: 15px;
  margin: 15px 0;
  border-radius: 4px;
  background-color: ${props => 
    props.status === 'success' ? '#d4edda' : 
    props.status === 'error' ? '#f8d7da' : '#cce5ff'};
  border: 1px solid ${props => 
    props.status === 'success' ? '#c3e6cb' : 
    props.status === 'error' ? '#f5c6cb' : '#b8daff'};
  color: ${props => 
    props.status === 'success' ? '#155724' : 
    props.status === 'error' ? '#721c24' : '#004085'};
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-y: auto;
`;

const ViewerContainer = styled.div`
  flex: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-color: #121212;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ViewerControls = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  background-color: rgba(0,0,0,0.7);
  padding: 10px;
  border-radius: 5px;
`;

const MoleculeImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const LoadingMessage = styled.div`
  color: white;
  font-size: 18px;
  text-align: center;
`;

const Button = styled.button<{ variant?: string; disabled?: boolean }>`
  padding: 8px 16px;
  background-color: ${props => {
    if (props.disabled) return '#6c757d';
    switch (props.variant) {
      case 'success': return '#28a745';
      case 'danger': return '#dc3545';
      case 'info': return '#17a2b8';
      default: return '#007bff';
    }
  }};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin-right: 10px;
  margin-bottom: 10px;
  font-size: 14px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-sizing: border-box;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
`;

const MoleculeInfo = styled.div`
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px;
`;

// Interface definitions
interface ChimeraXStatus {
  running: boolean;
  pid: number | null;
  chimeraxPath: string;
  status: string;
}

interface SnapshotInfo {
  imageUrl: string;
  width: number;
  height: number;
}

// Main component
const TestApp: React.FC = () => {
  // State
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Checking connection...');
  const [chimeraxStatus, setChimeraxStatus] = useState<ChimeraXStatus | null>(null);
  const [pdbId, setPdbId] = useState('1ubq');
  const [representation, setRepresentation] = useState('ball-and-stick');
  const [colorScheme, setColorScheme] = useState('element');
  const [showHydrogens, setShowHydrogens] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [moleculeInfo, setMoleculeInfo] = useState({
    name: 'No structure loaded',
    type: '',
    description: ''
  });
  
  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Server connection constants
  const SERVER_URL = 'http://localhost:9876';
  
  // Initialize connection on load
  useEffect(() => {
    checkConnection();
  }, []);

  // Get an updated snapshot when the visualization settings change
  useEffect(() => {
    if (chimeraxStatus?.running) {
      takeSnapshot();
    }
  }, [chimeraxStatus, representation, colorScheme, showHydrogens]);

  // Take a snapshot when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (chimeraxStatus?.running && containerRef.current) {
        takeSnapshot();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chimeraxStatus?.running]);

  // Event handlers
  const checkConnection = async () => {
    try {
      setStatus('loading');
      setMessage('Checking connection to standalone server...');
      
      const response = await axios.get(`${SERVER_URL}/api/health`);
      
      if (response.data.status === 'success') {
        setStatus('success');
        setMessage(`Connected to server: ${response.data.message}`);
        getChimeraxStatus();
      } else {
        setStatus('error');
        setMessage('Server returned unexpected response');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
      setMessage(`Failed to connect to server at ${SERVER_URL}`);
    }
  };

  const getChimeraxStatus = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/chimerax/status`);
      setChimeraxStatus(response.data);
    } catch (error) {
      console.error('Failed to get ChimeraX status:', error);
    }
  };

  const startChimeraX = async () => {
    try {
      const response = await axios.post(`${SERVER_URL}/api/chimerax/start`);
      console.log('ChimeraX start response:', response.data);
      getChimeraxStatus();
    } catch (error) {
      console.error('Failed to start ChimeraX:', error);
      alert('Failed to start ChimeraX');
    }
  };

  const stopChimeraX = async () => {
    try {
      const response = await axios.post(`${SERVER_URL}/api/chimerax/stop`);
      console.log('ChimeraX stop response:', response.data);
      getChimeraxStatus();
    } catch (error) {
      console.error('Failed to stop ChimeraX:', error);
      alert('Failed to stop ChimeraX');
    }
  };

  const loadStructure = async () => {
    try {
      if (!pdbId.trim()) {
        alert('Please enter a PDB ID');
        return;
      }
      
      setIsLoading(true);
      setMoleculeInfo({
        name: `Loading ${pdbId}...`,
        type: '',
        description: ''
      });
      
      try {
        // Send command to open the structure
        const command = `open ${pdbId}`;
        await axios.post(`${SERVER_URL}/api/chimerax/command`, { command });
        
        // Wait a moment for ChimeraX to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set style based on current selections
        await applyStyle();
        
        // Take a snapshot of the structure
        await takeSnapshot();
        
        // Update molecule info
        setMoleculeInfo({
          name: pdbId,
          type: 'PDB Structure',
          description: `Structure ${pdbId} loaded successfully`
        });
      } catch (loadError) {
        console.error('Error in ChimeraX:', loadError);
        
        // Use fallback image anyway
        await takeSnapshot();
        
        setMoleculeInfo({
          name: pdbId,
          type: 'PDB Structure',
          description: 'Note: Using fallback rendering'
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load structure:', error);
      setIsLoading(false);
      setMoleculeInfo({
        name: 'Error',
        type: '',
        description: 'Failed to load structure'
      });
      alert('Failed to load structure');
    }
  };
  
  const takeSnapshot = async () => {
    try {
      if (!containerRef.current || !chimeraxStatus?.running) return;
      
      setIsLoading(true);
      
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      try {
        // Request a snapshot from the server
        const response = await axios.post(`${SERVER_URL}/api/chimerax/snapshot`, {
          width,
          height
        });
        
        // Update the snapshot state with the image URL
        setSnapshot({
          imageUrl: `${SERVER_URL}${response.data.imageUrl}`,
          width: response.data.width,
          height: response.data.height
        });
      } catch (snapshotError) {
        console.error('Failed to generate snapshot, using fallback:', snapshotError);
        
        // Fallback: Use a placeholder image for this demo
        setSnapshot({
          imageUrl: 'https://cdn.rcsb.org/images/structures/ub/1ubq/1ubq_assembly-1.jpeg',
          width,
          height
        });

        // Show a notification
        alert('Note: ChimeraX rendering is unavailable. Using placeholder image instead.');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to take snapshot:', error);
      setIsLoading(false);
    }
  };
  
  const applyStyle = async () => {
    try {
      // Apply representation
      let representationCommand = '';
      switch (representation) {
        case 'ball-and-stick':
          representationCommand = 'style ball';
          break;
        case 'stick':
          representationCommand = 'style stick';
          break;
        case 'sphere':
          representationCommand = 'style sphere';
          break;
        case 'cartoon':
          representationCommand = 'style cartoon';
          break;
        case 'ribbon':
          representationCommand = 'style ribbon';
          break;
      }
      
      if (representationCommand) {
        await axios.post(`${SERVER_URL}/api/chimerax/command`, { 
          command: representationCommand 
        });
      }
      
      // Apply color scheme
      let colorCommand = '';
      switch (colorScheme) {
        case 'element':
          colorCommand = 'color byelement';
          break;
        case 'chain':
          colorCommand = 'color bychain';
          break;
        case 'residue':
          colorCommand = 'color byamino';
          break;
      }
      
      if (colorCommand) {
        await axios.post(`${SERVER_URL}/api/chimerax/command`, { 
          command: colorCommand 
        });
      }
      
      // Handle hydrogens
      const hydrogenCommand = showHydrogens ? 'show H' : 'hide H';
      await axios.post(`${SERVER_URL}/api/chimerax/command`, { 
        command: hydrogenCommand 
      });
      
      console.log('Style applied successfully');
    } catch (error) {
      console.error('Failed to apply style:', error);
    }
  };
  
  const resetView = async () => {
    try {
      // Send view reset command to ChimeraX
      const command = 'view initial';
      await axios.post(`${SERVER_URL}/api/chimerax/command`, { command });
      
      // Take a new snapshot
      await takeSnapshot();
    } catch (error) {
      console.error('Failed to reset view:', error);
    }
  };
  
  const updateMoleculeView = async () => {
    await applyStyle();
    await takeSnapshot();
  };

  return (
    <Container>
      <Header>
        <Title>Hashi Molecular Viewer</Title>
        <StatusBox status={status}>
          {message}
        </StatusBox>
        <Button onClick={checkConnection}>Refresh Connection</Button>
      </Header>
      
      <MainContent>
        <Sidebar>
          {chimeraxStatus ? (
            <>
              <h2>ChimeraX Status</h2>
              <p><strong>Running:</strong> {chimeraxStatus.running ? 'Yes' : 'No'}</p>
              {chimeraxStatus.running && <p><strong>PID:</strong> {chimeraxStatus.pid}</p>}
              <p><strong>Path:</strong> {chimeraxStatus.chimeraxPath}</p>
              
              <h2>ChimeraX Controls</h2>
              <Button 
                variant="success" 
                onClick={startChimeraX} 
                disabled={chimeraxStatus.running}
              >
                Start ChimeraX
              </Button>
              <Button 
                variant="danger" 
                onClick={stopChimeraX} 
                disabled={!chimeraxStatus.running}
              >
                Stop ChimeraX
              </Button>
              
              <h2>Structure Loading</h2>
              <FormGroup>
                <Label htmlFor="pdbId">PDB ID:</Label>
                <div style={{ display: 'flex' }}>
                  <Select 
                    id="pdbId"
                    value={pdbId}
                    onChange={(e) => setPdbId(e.target.value)}
                    style={{ flexGrow: 1 }}
                  >
                    <option value="1ubq">1ubq - Ubiquitin</option>
                    <option value="4hhb">4hhb - Hemoglobin</option>
                    <option value="1bna">1bna - DNA</option>
                    <option value="6lu7">6lu7 - SARS-CoV-2 Protease</option>
                    <option value="3pqr">3pqr - Photosystem I</option>
                  </Select>
                  <Button 
                    variant="info" 
                    onClick={loadStructure}
                    disabled={!chimeraxStatus.running}
                    style={{ marginLeft: '5px' }}
                  >
                    Load
                  </Button>
                </div>
                <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                  Note: For this demo, valid PDB IDs are pre-selected.
                </small>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="representation">Representation:</Label>
                <Select 
                  id="representation"
                  value={representation}
                  onChange={(e) => {
                    setRepresentation(e.target.value);
                    updateMoleculeView();
                  }}
                >
                  <option value="ball-and-stick">Ball and Stick</option>
                  <option value="stick">Stick</option>
                  <option value="sphere">Sphere</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="ribbon">Ribbon</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="colorScheme">Color Scheme:</Label>
                <Select 
                  id="colorScheme"
                  value={colorScheme}
                  onChange={(e) => {
                    setColorScheme(e.target.value);
                    updateMoleculeView();
                  }}
                >
                  <option value="element">Element</option>
                  <option value="chain">Chain</option>
                  <option value="residue">Residue</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <div>
                  <input 
                    type="checkbox" 
                    id="showHydrogens" 
                    checked={showHydrogens}
                    onChange={(e) => {
                      setShowHydrogens(e.target.checked);
                      updateMoleculeView();
                    }}
                  />
                  <Label htmlFor="showHydrogens" style={{ display: 'inline', marginLeft: '5px' }}>
                    Show Hydrogens
                  </Label>
                </div>
              </FormGroup>
              
              <MoleculeInfo>
                <h2>Molecule Information</h2>
                <p><strong>Name:</strong> {moleculeInfo.name}</p>
                {moleculeInfo.type && <p><strong>Type:</strong> {moleculeInfo.type}</p>}
                {moleculeInfo.description && <p>{moleculeInfo.description}</p>}
              </MoleculeInfo>
            </>
          ) : (
            <p>Connect to the server to view controls.</p>
          )}
        </Sidebar>
        
        <ViewerContainer ref={containerRef}>
          {isLoading ? (
            <LoadingMessage>Loading...</LoadingMessage>
          ) : snapshot ? (
            <MoleculeImage src={snapshot.imageUrl} alt="Molecular structure" />
          ) : (
            <LoadingMessage>
              {chimeraxStatus?.running 
                ? "No structure loaded. Use the controls to load a structure." 
                : "Start ChimeraX to view structures"}
            </LoadingMessage>
          )}
          <ViewerControls>
            <Button onClick={resetView}>Reset View</Button>
          </ViewerControls>
        </ViewerContainer>
      </MainContent>
    </Container>
  );
};

export default TestApp;