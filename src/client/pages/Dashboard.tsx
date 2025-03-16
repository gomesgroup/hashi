import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';
import { structureService } from '../services/structureService';
import LoadingIndicator from '../components/LoadingIndicator';
import { Structure } from '../types';

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

const Dashboard: React.FC = () => {
  const { session } = useSession();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [session]);

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