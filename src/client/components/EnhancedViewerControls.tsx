import React, { useState } from 'react';
import styled from 'styled-components';
import { RepresentationType, ColorScheme } from '../types';
import { ConnectionStatus, RenderingCapabilities } from '../services/chimeraxService';

interface EnhancedViewerControlsProps {
  representation: RepresentationType;
  colorScheme: ColorScheme;
  backgroundColor: string;
  showHydrogens: boolean;
  showLabels: boolean;
  quality: 'low' | 'medium' | 'high';
  renderMode: 'chimerax' | 'three' | 'static';
  capabilities?: RenderingCapabilities;
  connectionStatus?: ConnectionStatus;
  enabledFeatures?: {
    representation?: boolean;
    colorScheme?: boolean;
    hydrogens?: boolean;
    labels?: boolean;
    background?: boolean;
    quality?: boolean;
    rendering?: boolean;
  };
  onRepresentationChange: (representation: RepresentationType) => void;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
  onBackgroundColorChange: (color: string) => void;
  onShowHydrogensChange: (show: boolean) => void;
  onShowLabelsChange: (show: boolean) => void;
  onQualityChange: (quality: 'low' | 'medium' | 'high') => void;
  onRenderModeChange: (mode: 'chimerax' | 'three' | 'static') => void;
  onReset?: () => void;
  onRefresh?: () => void;
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

const Select = styled.select<{ disabled?: boolean }>`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: ${props => props.disabled ? '#eee' : 'white'};
  font-size: 14px;
  opacity: ${props => props.disabled ? 0.7 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: ${props => props.disabled ? 'none' : '0 0 0 2px rgba(66, 153, 225, 0.2)'};
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
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
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

const RefreshButton = styled(Button)`
  background-color: #4299e1;
  
  &:hover {
    background-color: #3182ce;
  }
`;

const SnapshotButton = styled(Button)`
  background-color: #38a169;
  
  &:hover {
    background-color: #2f855a;
  }
`;

const StatusIndicator = styled.div<{ status: ConnectionStatus }>`
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: ${props => {
    switch (props.status) {
      case ConnectionStatus.CONNECTED: return '#2ecc71';
      case ConnectionStatus.CONNECTING: return '#f39c12';
      case ConnectionStatus.ERROR: return '#e74c3c';
      default: return '#7f8c8d';
    }
  }};
`;

const StatusDot = styled.div<{ status: ConnectionStatus }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  background-color: ${props => {
    switch (props.status) {
      case ConnectionStatus.CONNECTED: return '#2ecc71';
      case ConnectionStatus.CONNECTING: return '#f39c12';
      case ConnectionStatus.ERROR: return '#e74c3c';
      default: return '#7f8c8d';
    }
  }};
`;

const NoticeBox = styled.div`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #ebf8ff;
  border-left: 4px solid #4299e1;
  font-size: 12px;
  color: #2c5282;
  line-height: 1.5;
`;

/**
 * Enhanced controls component for molecular viewer with support for different render modes
 * and fallback options.
 */
const EnhancedViewerControls: React.FC<EnhancedViewerControlsProps> = ({
  representation,
  colorScheme,
  backgroundColor,
  showHydrogens,
  showLabels,
  quality,
  renderMode,
  capabilities,
  connectionStatus = ConnectionStatus.DISCONNECTED,
  enabledFeatures = {
    representation: true,
    colorScheme: true,
    hydrogens: true,
    labels: true,
    background: true,
    quality: true,
    rendering: true
  },
  onRepresentationChange,
  onColorSchemeChange,
  onBackgroundColorChange,
  onShowHydrogensChange,
  onShowLabelsChange,
  onQualityChange,
  onRenderModeChange,
  onReset,
  onRefresh,
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

  // Helper to determine if a control should be disabled based on render mode
  const isDisabled = (control: keyof typeof enabledFeatures): boolean => {
    const enabled = enabledFeatures[control] !== false;
    
    if (!enabled) return true;
    
    // Disable certain controls based on render mode
    if (renderMode === 'static') {
      // Static mode only supports switching between different render modes
      return control !== 'rendering';
    }
    
    return false;
  };

  // Get status description for the ChimeraX connection
  const getStatusDescription = (status: ConnectionStatus): string => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'Connected to ChimeraX';
      case ConnectionStatus.CONNECTING: return 'Connecting to ChimeraX...';
      case ConnectionStatus.ERROR: return 'Error connecting to ChimeraX';
      default: return 'Disconnected from ChimeraX';
    }
  };

  // Get rendering mode description
  const getRenderingModeDescription = (): string => {
    switch (renderMode) {
      case 'chimerax': return 'Using ChimeraX server rendering';
      case 'three': return 'Using Three.js browser rendering';
      case 'static': return 'Using static image fallback';
      default: return '';
    }
  };

  // Show a notice if there are limitations with the current render mode
  const renderNotice = () => {
    if (renderMode === 'static') {
      return (
        <NoticeBox>
          Limited interaction available in static image mode. Try Three.js mode for interactive 3D.
        </NoticeBox>
      );
    } else if (renderMode === 'three' && connectionStatus === ConnectionStatus.CONNECTED) {
      return (
        <NoticeBox>
          ChimeraX server is available. Switch to ChimeraX mode for better rendering quality.
        </NoticeBox>
      );
    }
    return null;
  };
  
  return (
    <ControlsContainer>
      <ControlGroup>
        <ControlLabel htmlFor="rendering-mode">Rendering Mode</ControlLabel>
        <Select 
          id="rendering-mode" 
          value={renderMode}
          onChange={(e) => onRenderModeChange(e.target.value as 'chimerax' | 'three' | 'static')}
          disabled={!enabledFeatures.rendering}
        >
          <option 
            value="chimerax" 
            disabled={capabilities ? !capabilities.offscreenRendering : true}
          >
            ChimeraX (Server-side)
          </option>
          <option 
            value="three" 
            disabled={capabilities ? !capabilities.webGLSupport : false}
          >
            Three.js (Browser-side)
          </option>
          <option value="static">
            Static Image
          </option>
        </Select>
      </ControlGroup>
    
      <ControlGroup>
        <ControlLabel htmlFor="representation">Display Style</ControlLabel>
        <Select 
          id="representation" 
          value={representation}
          onChange={(e) => onRepresentationChange(e.target.value as RepresentationType)}
          disabled={isDisabled('representation')}
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
          disabled={isDisabled('colorScheme')}
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
          disabled={isDisabled('background')}
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
            disabled={isDisabled('background')}
          />
        )}
      </ControlGroup>
      
      <ControlGroup>
        <ControlLabel htmlFor="quality">Rendering Quality</ControlLabel>
        <Select 
          id="quality" 
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as 'low' | 'medium' | 'high')}
          disabled={isDisabled('quality')}
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
            disabled={isDisabled('hydrogens')}
          />
          <label htmlFor="showHydrogens">Show Hydrogens</label>
        </Checkbox>
        
        <Checkbox>
          <input 
            type="checkbox" 
            id="showLabels" 
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
            disabled={isDisabled('labels')}
          />
          <label htmlFor="showLabels">Show Atom Labels</label>
        </Checkbox>
      </ControlGroup>
      
      <ButtonGroup>
        {onReset && (
          <ResetButton 
            onClick={onReset}
            disabled={renderMode === 'static'}
          >
            Reset View
          </ResetButton>
        )}
        
        {onRefresh && (
          <RefreshButton onClick={onRefresh}>
            Refresh View
          </RefreshButton>
        )}
        
        {onTakeSnapshot && (
          <SnapshotButton 
            onClick={onTakeSnapshot}
            disabled={renderMode === 'static'}
          >
            Take Snapshot
          </SnapshotButton>
        )}
      </ButtonGroup>
      
      <StatusIndicator status={connectionStatus}>
        <StatusDot status={connectionStatus} />
        {getStatusDescription(connectionStatus)}
      </StatusIndicator>
      
      <div style={{ fontSize: '12px', marginTop: '5px', color: '#718096' }}>
        {getRenderingModeDescription()}
      </div>
      
      {renderNotice()}
    </ControlsContainer>
  );
};

export default EnhancedViewerControls;