import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FileUpload from '../components/FileUpload';
import { useSession } from '../contexts/SessionContext';

const PageContainer = styled.div`
  padding: 20px;
`;

const Title = styled.h1`
  margin-bottom: 10px;
  color: var(--text-color);
`;

const Description = styled.p`
  color: var(--text-color);
  margin-bottom: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  margin-bottom: 20px;
`;

const FormatInfo = styled.div`
  margin-top: 20px;
  background-color: var(--background-color);
  padding: 15px;
  border-radius: var(--border-radius);
`;

const FormatTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableHead = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid var(--border-color);
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: rgba(0, 0, 0, 0.03);
  }
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
`;

const SuccessMessage = styled.div`
  background-color: rgba(46, 204, 113, 0.1);
  color: var(--success-color);
  padding: 15px;
  border-radius: var(--border-radius);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ViewButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: 8px 16px;
  cursor: pointer;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedStructureId, setUploadedStructureId] = useState<string | null>(null);
  const [uploadedStructureName, setUploadedStructureName] = useState<string | null>(null);
  
  const handleUploadSuccess = (data: any) => {
    setUploadSuccess(true);
    setUploadedStructureId(data.structureId);
    setUploadedStructureName(data.name || 'Structure');
    
    // Scroll to success message
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleViewStructure = () => {
    if (uploadedStructureId) {
      navigate(`/viewer?structureId=${uploadedStructureId}`);
    }
  };
  
  return (
    <PageContainer>
      <Title>Upload Molecular Structure</Title>
      <Description>
        Upload molecular structure files to visualize and manipulate them in the browser.
        Files are processed by ChimeraX on the server side.
      </Description>
      
      {uploadSuccess && (
        <SuccessMessage>
          <span>
            <strong>{uploadedStructureName}</strong> uploaded successfully!
          </span>
          <ViewButton onClick={handleViewStructure}>
            View Structure
          </ViewButton>
        </SuccessMessage>
      )}
      
      <Card>
        <h2>Upload Structure</h2>
        <FileUpload 
          onUploadSuccess={handleUploadSuccess}
          supportedFormats={['.pdb', '.mol2', '.sdf', '.mol', '.cif', '.xyz']}
          maxSize={10}
        />
      </Card>
      
      <Card>
        <h2>Supported File Formats</h2>
        <p>
          Hashi supports various molecular structure file formats through ChimeraX.
          Here's information about the most commonly used formats:
        </p>
        
        <FormatInfo>
          <FormatTable>
            <thead>
              <tr>
                <TableHead>Format</TableHead>
                <TableHead>Extension</TableHead>
                <TableHead>Description</TableHead>
              </tr>
            </thead>
            <tbody>
              <TableRow>
                <TableCell>PDB</TableCell>
                <TableCell>.pdb</TableCell>
                <TableCell>
                  Protein Data Bank format. Widely used for protein and nucleic acid structures.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>MOL2</TableCell>
                <TableCell>.mol2</TableCell>
                <TableCell>
                  Tripos Mol2 format. Contains atom types, charges, and detailed bonding information.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>SDF</TableCell>
                <TableCell>.sdf</TableCell>
                <TableCell>
                  Structure Data File. Can store multiple molecules with associated data.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>MOL</TableCell>
                <TableCell>.mol</TableCell>
                <TableCell>
                  MDL Molfile. Standard format for representing molecules.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>mmCIF</TableCell>
                <TableCell>.cif</TableCell>
                <TableCell>
                  Macromolecular Crystallographic Information File. Modern alternative to PDB format.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>XYZ</TableCell>
                <TableCell>.xyz</TableCell>
                <TableCell>
                  Simple format specifying atom types and 3D coordinates.
                </TableCell>
              </TableRow>
            </tbody>
          </FormatTable>
        </FormatInfo>
      </Card>
    </PageContainer>
  );
};

export default UploadPage;