import React from 'react';
import styled from 'styled-components';

interface StructurePlaceholderProps {
  message?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
}

const PlaceholderContainer = styled.div<{ width?: string; height?: string; backgroundColor?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '500px'};
  background-color: ${props => props.backgroundColor || '#121212'};
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`;

const IconContainer = styled.div`
  margin-bottom: 20px;
`;

// SVG for molecule icon
const MoleculeIcon = () => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="2" />
    <circle cx="6" cy="8" r="2" />
    <circle cx="18" cy="8" r="2" />
    <circle cx="6" cy="16" r="2" />
    <circle cx="18" cy="16" r="2" />
    <line x1="6" y1="8" x2="12" y2="12" />
    <line x1="12" y1="12" x2="18" y2="8" />
    <line x1="6" y1="16" x2="12" y2="12" />
    <line x1="12" y1="12" x2="18" y2="16" />
  </svg>
);

const Message = styled.div`
  font-size: 16px;
  text-align: center;
  max-width: 80%;
`;

const AttributionText = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: 10px;
  opacity: 0.5;
`;

/**
 * Placeholder component for when a molecular structure cannot be rendered
 */
const StructurePlaceholder: React.FC<StructurePlaceholderProps> = ({
  message = 'Molecular structure visualization unavailable',
  width,
  height,
  backgroundColor
}) => {
  return (
    <PlaceholderContainer width={width} height={height} backgroundColor={backgroundColor}>
      <IconContainer>
        <MoleculeIcon />
      </IconContainer>
      <Message>{message}</Message>
      <AttributionText>Hashi - ChimeraX Web Integration</AttributionText>
    </PlaceholderContainer>
  );
};

export default StructurePlaceholder;