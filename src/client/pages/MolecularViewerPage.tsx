import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';
import { structureService } from '../services/structureService';
import MolecularViewer from '../components/MolecularViewer';
import LoadingIndicator from '../components/LoadingIndicator';
import { Atom, Bond, RepresentationType, ColorScheme, Structure } from '../types';

const ViewerPageContainer = styled.div`
  padding: 20px;
`;

const Title = styled.h1`
  margin-bottom: 20px;
  color: var(--text-color);
`;

const ControlPanel = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 200px;
`;

const Label = styled.label`
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 8px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background-color: white;
`;

const Checkbox = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  
  input {
    margin-right: 8px;
  }
`;

const StructureSelector = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  margin-bottom: 20px;
`;

const StructureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
`;

const StructureCard = styled.div<{ isSelected: boolean }>`
  padding: 15px;
  border-radius: var(--border-radius);
  border: 2px solid ${props => props.isSelected ? 'var(--primary-color)' : 'var(--border-color)'};
  cursor: pointer;
  transition: all 0.2s;
  background-color: ${props => props.isSelected ? 'rgba(52, 152, 219, 0.1)' : 'transparent'};
  
  &:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
`;

const StructureName = styled.h3`
  font-size: 16px;
  margin-bottom: 5px;
  color: var(--text-color);
`;

const StructureInfo = styled.div`
  font-size: 12px;
  color: #666;
`;

const ErrorMessage = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--error-color);
  padding: 15px;
  border-radius: var(--border-radius);
  margin-bottom: 20px;
`;

const ColorBlock = styled.span<{ color: string }>`
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  background-color: ${props => props.color};
  margin-right: 5px;
  vertical-align: middle;
`;

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const MolecularViewerPage: React.FC = () => {
  const { session } = useSession();
  const query = useQuery();
  const structureIdParam = query.get('structureId');
  
  const [structures, setStructures] = useState<Structure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(structureIdParam);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [representation, setRepresentation] = useState<RepresentationType>(RepresentationType.BALL_AND_STICK);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(ColorScheme.ELEMENT);
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all structures
  useEffect(() => {
    const fetchStructures = async () => {
      if (!session) return;
      
      try {
        setLoading(true);
        const data = await structureService.getStructures(session.id);
        setStructures(data);
        
        // If no structure is selected but we have structures, select the first one
        if (!selectedStructureId && data.length > 0) {
          setSelectedStructureId(data[0].id);
        }
        
      } catch (err: any) {
        console.error('Error fetching structures:', err);
        setError(err.message || 'Failed to load structures');
      } finally {
        setLoading(false);
      }
    };

    fetchStructures();
  }, [session, selectedStructureId]);
  
  // Fetch atom and bond data for the selected structure
  useEffect(() => {
    const fetchMolecularData = async () => {
      if (!session || !selectedStructureId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch atoms and bonds in parallel
        const [atomData, bondData] = await Promise.all([
          structureService.getAtoms(session.id, selectedStructureId),
          structureService.getBonds(session.id, selectedStructureId)
        ]);
        
        setAtoms(atomData);
        setBonds(bondData);
      } catch (err: any) {
        console.error('Error fetching molecular data:', err);
        setError(err.message || 'Failed to load molecular data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMolecularData();
  }, [session, selectedStructureId]);
  
  const handleStructureSelect = (structureId: string) => {
    setSelectedStructureId(structureId);
  };
  
  const getSelectedStructure = () => {
    return structures.find(s => s.id === selectedStructureId) || null;
  };
  
  if (!session) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <ViewerPageContainer>
      <Title>Molecular Viewer</Title>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {/* Structure Selector */}
      <StructureSelector>
        <h2>Select Structure</h2>
        {loading && structures.length === 0 ? (
          <LoadingIndicator size="small" message="Loading structures..." />
        ) : structures.length === 0 ? (
          <p>No structures available. Please upload a molecular structure first.</p>
        ) : (
          <StructureGrid>
            {structures.map(structure => (
              <StructureCard
                key={structure.id}
                isSelected={selectedStructureId === structure.id}
                onClick={() => handleStructureSelect(structure.id)}
              >
                <StructureName>{structure.name}</StructureName>
                <StructureInfo>
                  <div>Format: {structure.format.toUpperCase()}</div>
                  <div>Atoms: {structure.metadata.atomCount}</div>
                </StructureInfo>
              </StructureCard>
            ))}
          </StructureGrid>
        )}
      </StructureSelector>
      
      {/* Visualization Controls */}
      <ControlPanel>
        <ControlGroup>
          <Label>Representation</Label>
          <Select 
            value={representation} 
            onChange={(e) => setRepresentation(e.target.value as RepresentationType)}
          >
            <option value={RepresentationType.BALL_AND_STICK}>Ball and Stick</option>
            <option value={RepresentationType.STICK}>Stick</option>
            <option value={RepresentationType.SPHERE}>Sphere</option>
          </Select>
        </ControlGroup>
        
        <ControlGroup>
          <Label>Color Scheme</Label>
          <Select 
            value={colorScheme} 
            onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
          >
            <option value={ColorScheme.ELEMENT}>Element</option>
            <option value={ColorScheme.CHAIN}>Chain</option>
            <option value={ColorScheme.RESIDUE_TYPE}>Residue Type</option>
          </Select>
        </ControlGroup>
        
        <ControlGroup>
          <Label>Background Color</Label>
          <Select 
            value={backgroundColor} 
            onChange={(e) => setBackgroundColor(e.target.value)}
          >
            <option value="#000000"><ColorBlock color="#000000" />Black</option>
            <option value="#FFFFFF"><ColorBlock color="#FFFFFF" />White</option>
            <option value="#F5F5F5"><ColorBlock color="#F5F5F5" />Light Gray</option>
            <option value="#2C3E50"><ColorBlock color="#2C3E50" />Dark Blue</option>
          </Select>
        </ControlGroup>
        
        <ControlGroup>
          <Label>Options</Label>
          <Checkbox>
            <input 
              type="checkbox" 
              checked={showHydrogens} 
              onChange={(e) => setShowHydrogens(e.target.checked)} 
            />
            <span>Show Hydrogens</span>
          </Checkbox>
          <Checkbox>
            <input 
              type="checkbox" 
              checked={showLabels} 
              onChange={(e) => setShowLabels(e.target.checked)} 
            />
            <span>Show Labels</span>
          </Checkbox>
        </ControlGroup>
      </ControlPanel>
      
      {/* Molecular Viewer */}
      {loading ? (
        <LoadingIndicator message="Loading molecular data..." />
      ) : selectedStructureId && atoms.length > 0 ? (
        <>
          <h2>{getSelectedStructure()?.name || 'Structure'}</h2>
          <MolecularViewer 
            atoms={atoms} 
            bonds={bonds} 
            representation={representation}
            colorScheme={colorScheme}
            showHydrogens={showHydrogens}
            showLabels={showLabels}
            backgroundColor={backgroundColor}
          />
        </>
      ) : (
        <p>No structure selected or no atom data available.</p>
      )}
    </ViewerPageContainer>
  );
};

export default MolecularViewerPage;