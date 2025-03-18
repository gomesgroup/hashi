import React, { useState } from 'react';
import styled from 'styled-components';
import { RepresentationType, ColorScheme } from '../types';

interface ViewerControlsProps {
  representation: RepresentationType;
  colorScheme: ColorScheme;
  backgroundColor: string;
  showHydrogens: boolean;
  showLabels: boolean;
  quality: 'low' | 'medium' | 'high';
  onRepresentationChange: (representation: RepresentationType) => void;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
  onBackgroundColorChange: (color: string) => void;
  onShowHydrogensChange: (show: boolean) => void;
  onShowLabelsChange: (show: boolean) => void;
  onQualityChange: (quality: 'low' | 'medium' | 'high') => void;
  onReset?: () => void;
  onTakeSnapshot?: () => void;
}

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ControlLabel = styled.label`
  font-weight: 600;
  font-size: 14px;
  color: #333;
`;

const Select = styled.select`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
  }
`;

const ColorInput = styled.input`
  width: 100%;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  
  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
`;

const Checkbox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  input {
    margin: 0;
    width: 16px;
    height: 16px;
  }
  
  label {
    font-size: 14px;
    font-weight: normal;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const Button = styled.button`
  padding: 8px 12px;
  border-radius: 4px;
  border: none;
  background-color: #4299e1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3182ce;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.4);
  }
  
  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
`;

const ResetButton = styled(Button)`
  background-color: #a0aec0;
  
  &:hover {
    background-color: #718096;
  }
`;

const SnapshotButton = styled(Button)`
  background-color: #38a169;
  
  &:hover {
    background-color: #2f855a;
  }
`;

const ViewerControls: React.FC<ViewerControlsProps> = ({
  representation,
  colorScheme,
  backgroundColor,
  showHydrogens,
  showLabels,
  quality,
  onRepresentationChange,
  onColorSchemeChange,
  onBackgroundColorChange,
  onShowHydrogensChange,
  onShowLabelsChange,
  onQualityChange,
  onReset,
  onTakeSnapshot
}) => {
  // Background color presets
  const backgroundPresets = [
    { name: 'Dark', value: '#121212' },
    { name: 'Light', value: '#f5f5f5' },
    { name: 'Blue', value: '#1a365d' },
    { name: 'Green', value: '#1c4532' },
    { name: 'Transparent', value: 'transparent' },
  ];
  
  const [isCustomBackground, setIsCustomBackground] = useState(!backgroundPresets.some(preset => preset.value === backgroundColor));
  
  const handleBackgroundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustomBackground(true);
    } else {
      setIsCustomBackground(false);
      onBackgroundColorChange(value);
    }
  };
  
  return (
    <ControlsContainer>
      <ControlGroup>
        <ControlLabel htmlFor="representation">Display Style</ControlLabel>
        <Select 
          id="representation" 
          value={representation}
          onChange={(e) => onRepresentationChange(e.target.value as RepresentationType)}
        >
          <option value={RepresentationType.BALL_AND_STICK}>Ball and Stick</option>
          <option value={RepresentationType.STICK}>Stick</option>
          <option value={RepresentationType.SPHERE}>Sphere</option>
          <option value={RepresentationType.CARTOON}>Cartoon</option>
          <option value={RepresentationType.RIBBON}>Ribbon</option>
          <option value={RepresentationType.SURFACE}>Surface</option>
        </Select>
      </ControlGroup>
      
      <ControlGroup>
        <ControlLabel htmlFor="colorScheme">Color Scheme</ControlLabel>
        <Select 
          id="colorScheme" 
          value={colorScheme}
          onChange={(e) => onColorSchemeChange(e.target.value as ColorScheme)}
        >
          <option value={ColorScheme.ELEMENT}>Element</option>
          <option value={ColorScheme.CHAIN}>Chain</option>
          <option value={ColorScheme.RESIDUE}>Residue</option>
          <option value={ColorScheme.RESIDUE_TYPE}>Residue Type</option>
          <option value={ColorScheme.SECONDARY_STRUCTURE}>Secondary Structure</option>
          <option value={ColorScheme.B_FACTOR}>B-Factor</option>
        </Select>
      </ControlGroup>
      
      <ControlGroup>
        <ControlLabel htmlFor="background">Background</ControlLabel>
        <Select 
          id="background" 
          value={isCustomBackground ? 'custom' : backgroundColor}
          onChange={handleBackgroundChange}
        >
          {backgroundPresets.map(preset => (
            <option key={preset.name} value={preset.value}>
              {preset.name}
            </option>
          ))}
          <option value="custom">Custom</option>
        </Select>
        
        {isCustomBackground && (
          <ColorInput 
            type="color" 
            value={backgroundColor} 
            onChange={(e) => onBackgroundColorChange(e.target.value)}
          />
        )}
      </ControlGroup>
      
      <ControlGroup>
        <ControlLabel htmlFor="quality">Rendering Quality</ControlLabel>
        <Select 
          id="quality" 
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as 'low' | 'medium' | 'high')}
        >
          <option value="low">Low (Faster)</option>
          <option value="medium">Medium</option>
          <option value="high">High (Slower)</option>
        </Select>
      </ControlGroup>
      
      <ControlGroup>
        <ControlLabel>Options</ControlLabel>
        <Checkbox>
          <input 
            type="checkbox" 
            id="showHydrogens" 
            checked={showHydrogens}
            onChange={(e) => onShowHydrogensChange(e.target.checked)}
          />
          <label htmlFor="showHydrogens">Show Hydrogens</label>
        </Checkbox>
        
        <Checkbox>
          <input 
            type="checkbox" 
            id="showLabels" 
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
          />
          <label htmlFor="showLabels">Show Atom Labels</label>
        </Checkbox>
      </ControlGroup>
      
      <ButtonGroup>
        {onReset && (
          <ResetButton onClick={onReset}>
            Reset View
          </ResetButton>
        )}
        
        {onTakeSnapshot && (
          <SnapshotButton onClick={onTakeSnapshot}>
            Take Snapshot
          </SnapshotButton>
        )}
      </ButtonGroup>
    </ControlsContainer>
  );
};

export default ViewerControls;