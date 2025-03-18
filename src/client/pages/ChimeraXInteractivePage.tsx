import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ChimeraXInteractiveViewer from '../components/ChimeraXInteractiveViewer';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.header`
  margin-bottom: 20px;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 10px;
`;

const Description = styled.p`
  color: #34495e;
  line-height: 1.5;
`;

const ControlPanel = styled.div`
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
  margin-right: 10px;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  background-color: ${props => 
    props.type === 'success' ? '#d4edda' : 
    props.type === 'error' ? '#f8d7da' : '#d1ecf1'};
  color: ${props => 
    props.type === 'success' ? '#155724' : 
    props.type === 'error' ? '#721c24' : '#0c5460'};
`;

// Create a standalone version of the page that doesn't require authentication
const StandaloneContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const NavBar = styled.nav`
  display: flex;
  background-color: #2c3e50;
  padding: 10px 20px;
  color: white;
  margin-bottom: 20px;
  border-radius: 4px;
`;

const NavTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ChimeraXInteractivePage: React.FC = () => {
  const [structureId, setStructureId] = useState('');
  const [serverUrl, setServerUrl] = useState('http://localhost:9876');
  const [currentStructureId, setCurrentStructureId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Auto-redirect to fallback if ChimeraX server is unreachable
  useEffect(() => {
    const checkChimeraXServer = async () => {
      try {
        const response = await fetch(`${serverUrl}/api/health`);
        if (!response.ok) {
          throw new Error('Server returned error status');
        }
        setUseFallback(false);
      } catch (err) {
        console.error('Failed to connect to ChimeraX server:', err);
        setStatus({
          message: 'Unable to connect to ChimeraX server. Using RCSB fallback.',
          type: 'error'
        });
        setUseFallback(true);
      }
    };

    checkChimeraXServer();
  }, [serverUrl]);

  const handleLoadStructure = () => {
    if (!structureId.trim()) {
      setStatus({
        message: 'Please enter a structure ID',
        type: 'error'
      });
      return;
    }

    setCurrentStructureId(structureId);
    setStatus({
      message: `Loading structure: ${structureId}`,
      type: 'info'
    });
  };

  const handleQuickLoad = (pdbId: string) => {
    setStructureId(pdbId);
    setCurrentStructureId(pdbId);
    setStatus({
      message: `Loading structure: ${pdbId}`,
      type: 'info'
    });
  };

  const handleViewerLoad = () => {
    setStatus({
      message: 'ChimeraX Interactive UI loaded successfully',
      type: 'success'
    });
  };

  const handleViewerError = (error: string) => {
    setStatus({
      message: `Error: ${error}`,
      type: 'error'
    });
  };

  // Use standalone layout because of session issues
  return (
    <StandaloneContainer>
      <NavBar>
        <NavTitle>Hashi - ChimeraX Interactive</NavTitle>
      </NavBar>
      
      <ContentArea>
        <Header>
          <Title>ChimeraX Interactive Interface</Title>
          <Description>
            This page embeds the full interactive ChimeraX UI directly in the web application.
            You can use all the native ChimeraX features including command execution, visualization controls, and snapshot generation.
          </Description>
        </Header>

        <ControlPanel>
          <FormGroup>
            <Label htmlFor="serverUrl">ChimeraX Server URL:</Label>
            <Input
              type="text"
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:9876"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="structureId">Structure ID or PDB ID:</Label>
            <Input
              type="text"
              id="structureId"
              value={structureId}
              onChange={(e) => setStructureId(e.target.value)}
              placeholder="e.g., 1abc"
            />
          </FormGroup>

          <Button onClick={handleLoadStructure}>Load Structure</Button>
          <Button onClick={() => handleQuickLoad('1abc')}>Load 1ABC</Button>
          <Button onClick={() => handleQuickLoad('2vaa')}>Load 2VAA</Button>
          <Button onClick={() => handleQuickLoad('3j3q')}>Load 3J3Q</Button>

          {status && (
            <StatusMessage type={status.type}>
              {status.message}
            </StatusMessage>
          )}
        </ControlPanel>

        <ChimeraXInteractiveViewer
          structureId={currentStructureId}
          serverUrl={serverUrl}
          height="700px"
          onLoad={handleViewerLoad}
          onError={handleViewerError}
        />
      </ContentArea>
    </StandaloneContainer>
  );
};

export default ChimeraXInteractivePage;