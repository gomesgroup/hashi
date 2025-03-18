import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';
import { structureService } from '../services/structureService';
import LoadingIndicator from '../components/LoadingIndicator';
import { Structure } from '../types';
import axios from 'axios';

const DashboardContainer = styled.div`
  padding: 20px;
`;

const WelcomeSection = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: var(--box-shadow);
`;

const Title = styled.h1`
  margin-bottom: 10px;
  color: var(--text-color);
`;

const Subtitle = styled.p`
  color: var(--text-color);
  margin-bottom: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const CardTitle = styled.h2`
  font-size: 1.2em;
  margin-bottom: 10px;
  color: var(--primary-color);
`;

const ActionButton = styled(Link)`
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 10px 15px;
  border-radius: var(--border-radius);
  text-decoration: none;
  margin-right: 10px;
  margin-top: 15px;

  &:hover {
    background-color: #2980b9;
    text-decoration: none;
  }
`;

const StandaloneButton = styled.button`
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 10px 15px;
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  margin-right: 10px;
  margin-top: 15px;
  font-size: 1em;

  &:hover {
    background-color: #2980b9;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const StructureList = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--box-shadow);
  margin-top: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 10px;
  border-bottom: 2px solid var(--border-color);
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: var(--background-color);
  }
`;

const TableCell = styled.td`
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #888;
`;

const ErrorText = styled.div`
  color: var(--error-color);
  padding: 20px;
  text-align: center;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: var(--border-radius);
  margin-top: 20px;
`;

const StatusBox = styled.div<{ status: 'success' | 'error' | 'loading' }>`
  padding: 15px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: ${props => 
    props.status === 'success' ? 'rgba(46, 204, 113, 0.1)' : 
    props.status === 'error' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)'};
  border: 1px solid ${props => 
    props.status === 'success' ? 'rgba(46, 204, 113, 0.5)' : 
    props.status === 'error' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)'};
  color: ${props => 
    props.status === 'success' ? '#27ae60' : 
    props.status === 'error' ? '#c0392b' : '#2980b9'};
`;

const TestSection = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  padding: 20px;
  margin: 20px 0;
  box-shadow: var(--box-shadow);
`;

const Dashboard: React.FC = () => {
  const { session } = useSession();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Standalone server status
  const [backendStatus, setBackendStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [statusMessage, setStatusMessage] = useState('Checking standalone server connection...');
  const [chimeraxStatus, setChimeraxStatus] = useState<any>(null);
  
  const STANDALONE_URL = 'http://localhost:9876/api';
  
  useEffect(() => {
    const fetchStructures = async () => {
      if (!session) return;
      
      try {
        setLoading(true);
        const data = await structureService.getStructures(session.id);
        setStructures(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching structures:', err);
        setError(err.message || 'Failed to load structures');
      } finally {
        setLoading(false);
      }
    };

    fetchStructures();
    checkStandaloneConnection();
  }, [session]);
  
  const checkStandaloneConnection = async () => {
    try {
      setBackendStatus('loading');
      setStatusMessage('Checking standalone server connection...');
      
      const response = await axios.get(`${STANDALONE_URL}/health`);
      
      if (response.data.status === 'success') {
        setBackendStatus('success');
        setStatusMessage(`Connected to standalone server: ${response.data.message}`);
        
        // Also check ChimeraX status
        getChimeraxStatus();
      } else {
        setBackendStatus('error');
        setStatusMessage('Standalone server returned unexpected response');
      }
    } catch (error) {
      console.error('Standalone server connection error:', error);
      setBackendStatus('error');
      setStatusMessage('Failed to connect to standalone server. Make sure it\'s running on http://localhost:9876');
    }
  };
  
  const getChimeraxStatus = async () => {
    try {
      const response = await axios.get(`${STANDALONE_URL}/chimerax/status`);
      setChimeraxStatus(response.data);
    } catch (error) {
      console.error('Failed to get ChimeraX status:', error);
    }
  };
  
  const startChimeraX = async () => {
    try {
      const response = await axios.post(`${STANDALONE_URL}/chimerax/start`);
      console.log('ChimeraX start response:', response.data);
      getChimeraxStatus();
    } catch (error) {
      console.error('Failed to start ChimeraX:', error);
    }
  };
  
  const stopChimeraX = async () => {
    try {
      const response = await axios.post(`${STANDALONE_URL}/chimerax/stop`);
      console.log('ChimeraX stop response:', response.data);
      getChimeraxStatus();
    } catch (error) {
      console.error('Failed to stop ChimeraX:', error);
    }
  };
  
  const executeCommand = async () => {
    try {
      const command = 'open 1abc';
      const response = await axios.post(`${STANDALONE_URL}/chimerax/command`, { command });
      console.log('ChimeraX command response:', response.data);
      alert(`Command sent to ChimeraX: ${command}`);
    } catch (error) {
      console.error('Failed to execute ChimeraX command:', error);
      alert(`Failed to execute command: ${(error as any).message}`);
    }
  };

  if (!session) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <DashboardContainer>
      <WelcomeSection>
        <Title>Welcome to Hashi</Title>
        <Subtitle>
          Your ChimeraX integration dashboard. Begin working with molecular structures.
        </Subtitle>

        <Grid>
          <Card>
            <CardTitle>Upload Structure</CardTitle>
            <p>Import molecular structures from various file formats (PDB, mmCIF, MOL2, etc.)</p>
            <ActionButton to="/upload">Upload</ActionButton>
          </Card>
          
          <Card>
            <CardTitle>Molecular Viewer</CardTitle>
            <p>Visualize and interact with 3D molecular structures with WebGL</p>
            <ActionButton to="/viewer">View</ActionButton>
          </Card>
          
          <Card>
            <CardTitle>Modify Structures</CardTitle>
            <p>Edit, manipulate, and modify molecular structures</p>
            <ActionButton to="/manipulation">Modify</ActionButton>
          </Card>
        </Grid>
      </WelcomeSection>
      
      <TestSection>
        <Title>Standalone Server Test</Title>
        <Subtitle>Test connection to the standalone server running on port 9876</Subtitle>
        
        <StatusBox status={backendStatus}>
          {statusMessage}
        </StatusBox>
        
        <StandaloneButton onClick={checkStandaloneConnection}>Refresh Status</StandaloneButton>
        
        {backendStatus === 'success' && (
          <>
            <h2>ChimeraX Status</h2>
            {chimeraxStatus ? (
              <div>
                <p><strong>Running:</strong> {chimeraxStatus.running ? 'Yes' : 'No'}</p>
                {chimeraxStatus.running && <p><strong>PID:</strong> {chimeraxStatus.pid}</p>}
                <p><strong>Path:</strong> {chimeraxStatus.chimeraxPath}</p>
              </div>
            ) : (
              <p>Loading ChimeraX status...</p>
            )}
            
            <h2>ChimeraX Controls</h2>
            <StandaloneButton 
              onClick={startChimeraX} 
              disabled={chimeraxStatus?.running}
            >
              Start ChimeraX
            </StandaloneButton>
            
            <StandaloneButton 
              onClick={stopChimeraX} 
              disabled={!chimeraxStatus?.running}
            >
              Stop ChimeraX
            </StandaloneButton>
            
            <StandaloneButton 
              onClick={executeCommand} 
              disabled={!chimeraxStatus?.running}
            >
              Open PDB 1abc (Test Command)
            </StandaloneButton>
          </>
        )}
      </TestSection>

      <StructureList>
        <Title>Your Structures</Title>
        
        {loading ? (
          <LoadingIndicator size="medium" message="Loading structures..." />
        ) : error ? (
          <ErrorText>{error}</ErrorText>
        ) : structures.length === 0 ? (
          <EmptyState>
            <p>No structures found. Upload a structure to get started.</p>
            <ActionButton to="/upload">Upload Structure</ActionButton>
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHeader>Name</TableHeader>
                <TableHeader>Format</TableHeader>
                <TableHeader>Atoms</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            <tbody>
              {structures.map((structure) => (
                <TableRow key={structure.id}>
                  <TableCell>{structure.name}</TableCell>
                  <TableCell>{structure.format.toUpperCase()}</TableCell>
                  <TableCell>{structure.metadata.atomCount}</TableCell>
                  <TableCell>
                    <ActionButton to={`/viewer?structureId=${structure.id}`}>View</ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </StructureList>
    </DashboardContainer>
  );
};

export default Dashboard;