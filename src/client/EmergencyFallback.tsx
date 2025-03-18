import React from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Header = styled.header`
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0;
`;

const ErrorBox = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const ViewerContainer = styled.div`
  width: 100%;
  height: 600px;
  background-color: white;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const EmergencyFallback: React.FC = () => {
  const [pdbId, setPdbId] = React.useState('1ubq');
  
  const handleLoadStructure = () => {
    const iframe = document.getElementById('rcsbViewer') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = `https://www.rcsb.org/3d-view/${pdbId}?preset=default`;
    }
  };
  
  return (
    <Container>
      <Header>
        <Title>Hashi - Emergency Fallback Viewer</Title>
      </Header>
      
      <ErrorBox>
        <h3>ChimeraX Integration Unavailable</h3>
        <p>
          The ChimeraX integration is currently experiencing OpenGL compatibility issues on this system.
          This emergency fallback page uses the RCSB Molecular Viewer instead.
        </p>
      </ErrorBox>
      
      <Controls>
        <Input 
          type="text" 
          value={pdbId} 
          onChange={(e) => setPdbId(e.target.value)}
          placeholder="Enter PDB ID" 
        />
        <Button onClick={handleLoadStructure}>Load Structure</Button>
        <Button onClick={() => setPdbId('1ubq')}>1UBQ</Button>
        <Button onClick={() => setPdbId('2vaa')}>2VAA</Button>
        <Button onClick={() => setPdbId('3j3q')}>3J3Q</Button>
      </Controls>
      
      <ViewerContainer>
        <iframe 
          id="rcsbViewer"
          src={`https://www.rcsb.org/3d-view/${pdbId}?preset=default`}
          width="100%" 
          height="100%" 
          style={{ border: 'none' }}
          title="RCSB Molecular Viewer"
        />
      </ViewerContainer>
    </Container>
  );
};

// Render directly to the DOM for emergency use
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <EmergencyFallback />
    </React.StrictMode>
  );
}

export default EmergencyFallback;