import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  useHelper,
  Html, 
  Text,
  Stats
} from '@react-three/drei';
import * as THREE from 'three';
import styled from 'styled-components';
import { Atom, Bond, RepresentationType, ColorScheme, Structure, Residue, Chain } from '../types';
import { useSession } from '../hooks/useSession';
import { useStructure } from '../hooks/useStructure';
import LoadingIndicator from './LoadingIndicator';

interface MolecularViewerProps {
  structureId?: string;
  atoms?: Atom[];  // Add atoms property
  bonds?: Bond[];  // Add bonds property
  initialRepresentation?: RepresentationType;
  representation?: RepresentationType;  // Add representation property
  initialColorScheme?: ColorScheme;
  colorScheme?: ColorScheme;  // Add colorScheme property
  showHydrogens?: boolean;
  showLabels?: boolean;
  showStats?: boolean;
  backgroundColor?: string;
  width?: string;
  height?: string;
  quality?: 'low' | 'medium' | 'high';
  readOnly?: boolean;
  onModelLoaded?: (structureData: any) => void;
}

const ViewerContainer = styled.div<{width?: string, height?: string}>`
  position: relative;
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '500px'};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
`;

const ViewerOverlay = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
`;

// Element colors for the 'element' color scheme
const elementColors: Record<string, string> = {
  H: '#FFFFFF',
  C: '#909090',
  N: '#3050F8',
  O: '#FF0D0D',
  F: '#90E050',
  P: '#FF8000',
  S: '#FFFF30',
  Cl: '#1FF01F',
  Br: '#A62929',
  I: '#940094',
  Fe: '#E06633',
  Ca: '#808090',
  Mg: '#8AFF00',
  Na: '#AB5CF2',
  K: '#8F40D4',
  Zn: '#7D80B0',
  default: '#FF69B4',
};

// Residue colors for amino acids
const residueColors: Record<string, string> = {
  ALA: '#C8C8C8', // Alanine
  ARG: '#145AFF', // Arginine
  ASN: '#00DCDC', // Asparagine
  ASP: '#E60A0A', // Aspartic acid
  CYS: '#E6E600', // Cysteine
  GLN: '#00DCDC', // Glutamine
  GLU: '#E60A0A', // Glutamic acid
  GLY: '#EBEBEB', // Glycine
  HIS: '#8282D2', // Histidine
  ILE: '#0F820F', // Isoleucine
  LEU: '#0F820F', // Leucine
  LYS: '#145AFF', // Lysine
  MET: '#E6E600', // Methionine
  PHE: '#3232AA', // Phenylalanine
  PRO: '#DC9682', // Proline
  SER: '#FA9600', // Serine
  THR: '#FA9600', // Threonine
  TRP: '#B45AB4', // Tryptophan
  TYR: '#3232AA', // Tyrosine
  VAL: '#0F820F', // Valine
  default: '#BBBBBB',
};

// Chain colors
const chainColors = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC05', // Yellow
  '#34A853', // Green
  '#8F44AD', // Purple
  '#F39C12', // Orange
  '#1ABC9C', // Turquoise
  '#D35400', // Dark Orange
  '#3498DB', // Light Blue
  '#2ECC71', // Light Green
  '#E74C3C', // Light Red
  '#9B59B6', // Light Purple
  '#F1C40F', // Light Yellow
  '#16A085', // Dark Turquoise
  '#27AE60', // Dark Green
  '#E67E22', // Amber
];

// Get color for an atom based on the selected color scheme
const getAtomColor = (atom: Atom, colorScheme: ColorScheme, residues?: Map<number, Residue>, chains?: Map<string, Chain>): string => {
  switch (colorScheme) {
    case ColorScheme.ELEMENT:
      return elementColors[atom.element] || elementColors.default;
    case ColorScheme.RESIDUE_TYPE:
      if (residues && atom.residueId) {
        const residue = residues.get(atom.residueId);
        if (residue) {
          return residueColors[residue.name] || residueColors.default;
        }
      }
      return residueColors.default;
    case ColorScheme.CHAIN:
      if (chains && atom.chainId) {
        const chainIndex = atom.chainId.charCodeAt(0) % chainColors.length;
        return chainColors[chainIndex];
      }
      return chainColors[0];
    case ColorScheme.B_FACTOR:
      if (atom.bFactor !== undefined) {
        // Convert bFactor value to a color on a blue-white-red scale
        const normalizedValue = Math.max(0, Math.min(1, (atom.bFactor - 30) / 70));
        if (normalizedValue < 0.5) {
          // Blue to white (low values)
          const intensity = Math.floor(255 * (normalizedValue * 2));
          return `rgb(${intensity}, ${intensity}, 255)`;
        } else {
          // White to red (high values)
          const intensity = Math.floor(255 * (2 - normalizedValue * 2));
          return `rgb(255, ${intensity}, ${intensity})`;
        }
      }
      return elementColors.default;
    default:
      return elementColors[atom.element] || elementColors.default;
  }
};

// Create a sphere to represent an atom
const AtomSphere = ({ 
  atom, 
  radius, 
  colorScheme, 
  residues, 
  chains, 
  showLabel,
  isHovered,
  onClick 
}: { 
  atom: Atom; 
  radius: number; 
  colorScheme: ColorScheme;
  residues?: Map<number, Residue>;
  chains?: Map<string, Chain>;
  showLabel?: boolean;
  isHovered?: boolean;
  onClick?: (atom: Atom) => void;
}) => {
  const color = getAtomColor(atom, colorScheme, residues, chains);
  const [hovered, setHovered] = useState(false);
  
  return (
    <group>
      <mesh 
        position={[atom.x, atom.y, atom.z]}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(atom);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={isHovered || hovered ? '#ffffff' : undefined}
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>
      
      {(showLabel || hovered) && (
        <Html position={[atom.x, atom.y + radius + 0.2, atom.z]} center>
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '2px 4px', 
            borderRadius: '2px', 
            fontSize: '10px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            {atom.element}{atom.id}
          </div>
        </Html>
      )}
    </group>
  );
};

// Create a cylinder to represent a bond
const BondCylinder = ({ 
  atom1, 
  atom2, 
  colorScheme,
  residues,
  chains,
  radius = 0.1,
  bondOrder = 1
}: { 
  atom1: Atom; 
  atom2: Atom; 
  colorScheme: ColorScheme;
  residues?: Map<number, Residue>;
  chains?: Map<string, Chain>;
  radius?: number;
  bondOrder?: number;
}) => {
  // Find the midpoint and length of the bond
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const center = start.clone().add(end).multiplyScalar(0.5);
  
  // Calculate the rotation to align the cylinder with the bond
  const quaternion = new THREE.Quaternion();
  direction.normalize();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  
  // For single bonds
  if (bondOrder === 1) {
    return (
      <mesh position={center} quaternion={quaternion}>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial 
          color={colorScheme === ColorScheme.ELEMENT ? '#909090' : getAtomColor(atom1, colorScheme, residues, chains)} 
          metalness={0.1}
          roughness={0.5}
        />
      </mesh>
    );
  }
  
  // For double and triple bonds, create multiple cylinders
  const offset = radius * 1.4; // Distance between multiple bonds
  
  // Create a right vector perpendicular to the bond
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  
  if (right.length() < 0.1) {
    // Handle case where direction is parallel to up
    right.set(1, 0, 0);
  }
  
  // For displaying multiple bonds
  return (
    <>
      {/* First bond */}
      {bondOrder >= 1 && (
        <mesh 
          position={center.clone().add(right.clone().multiplyScalar(bondOrder === 2 ? offset / 2 : offset))} 
          quaternion={quaternion}
        >
          <cylinderGeometry args={[radius, radius, length, 8]} />
          <meshStandardMaterial 
            color={colorScheme === ColorScheme.ELEMENT ? '#909090' : getAtomColor(atom1, colorScheme, residues, chains)} 
            metalness={0.1}
            roughness={0.5}
          />
        </mesh>
      )}
      
      {/* Second bond */}
      {bondOrder >= 2 && (
        <mesh 
          position={center.clone().add(right.clone().multiplyScalar(bondOrder === 2 ? -offset / 2 : 0))} 
          quaternion={quaternion}
        >
          <cylinderGeometry args={[radius, radius, length, 8]} />
          <meshStandardMaterial 
            color={colorScheme === ColorScheme.ELEMENT ? '#909090' : getAtomColor(atom2, colorScheme, residues, chains)} 
            metalness={0.1}
            roughness={0.5}
          />
        </mesh>
      )}
      
      {/* Third bond */}
      {bondOrder >= 3 && (
        <mesh 
          position={center.clone().add(right.clone().multiplyScalar(-offset))} 
          quaternion={quaternion}
        >
          <cylinderGeometry args={[radius, radius, length, 8]} />
          <meshStandardMaterial 
            color={colorScheme === ColorScheme.ELEMENT ? '#909090' : getAtomColor(atom1, colorScheme, residues, chains)} 
            metalness={0.1}
            roughness={0.5}
          />
        </mesh>
      )}
    </>
  );
};

// Setup lighting for the scene
const Lighting = ({ quality = 'medium' }: { quality?: 'low' | 'medium' | 'high' }) => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  // Show light helper in high quality mode
  // Fix type compatibility issue with useHelper
  // @ts-ignore - DirectionalLight is compatible with Object3D
  useHelper(quality === 'high' ? directionalLightRef : null, THREE.DirectionalLightHelper, 1);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        ref={directionalLightRef}
        position={[10, 10, 10]} 
        intensity={1} 
        castShadow={quality !== 'low'}
      />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      
      {quality === 'high' && (
        <pointLight position={[0, 5, 5]} intensity={0.5} distance={20} />
      )}
    </>
  );
};

// Calculate the center and size of a molecule to position the camera
const useMoleculeMetrics = (atoms: Atom[]) => {
  const { camera } = useThree();
  
  useEffect(() => {
    if (atoms.length > 0) {
      const box = new THREE.Box3();
      
      atoms.forEach(atom => {
        const point = new THREE.Vector3(atom.x, atom.y, atom.z);
        box.expandByPoint(point);
      });
      
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const maxDimension = Math.max(size.x, size.y, size.z);
      const distance = maxDimension * 2.5;
      
      // Update camera
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.position.set(center.x, center.y, center.z + distance);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
      }
      
      return () => {
        // Cleanup
      };
    }
  }, [atoms, camera]);
};

// The main molecular model component
const MolecularModel = ({ 
  atoms, 
  bonds, 
  residues,
  chains,
  representation, 
  colorScheme,
  showHydrogens,
  showLabels,
  quality = 'medium',
  onAtomClick
}: { 
  atoms: Atom[]; 
  bonds: Bond[];
  residues?: Map<number, Residue>;
  chains?: Map<string, Chain>;
  representation: RepresentationType;
  colorScheme: ColorScheme;
  showHydrogens: boolean;
  showLabels: boolean;
  quality?: 'low' | 'medium' | 'high';
  onAtomClick?: (atom: Atom) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  
  // Gentle rotation animation when enabled
  useFrame(({ clock }) => {
    if (groupRef.current && rotationEnabled) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  // Use molecule metrics to position camera
  useMoleculeMetrics(atoms);

  // Create residue and chain maps for efficient lookup
  const residueMap = residues || new Map<number, Residue>();
  const chainMap = chains || new Map<string, Chain>();
  
  // Create atom map for bond lookup
  const atomMap = new Map<number, Atom>();
  atoms.forEach(atom => {
    atomMap.set(atom.id, atom);
  });

  // Filter atoms and bonds if needed
  const filteredAtoms = showHydrogens 
    ? atoms
    : atoms.filter(atom => atom.element !== 'H');
    
  const filteredBonds = showHydrogens
    ? bonds
    : bonds.filter(bond => {
        const atom1 = atomMap.get(bond.atomId1);
        const atom2 = atomMap.get(bond.atomId2);
        return atom1 && atom2 && atom1.element !== 'H' && atom2.element !== 'H';
      });

  // Calculate atom and bond radius based on representation
  const getAtomRadius = (atom: Atom) => {
    switch (representation) {
      case RepresentationType.BALL_AND_STICK:
        return 0.3;
      case RepresentationType.SPHERE:
        return 0.8;
      case RepresentationType.STICK:
        return 0.2;
      case RepresentationType.CARTOON:
      case RepresentationType.RIBBON:
        return 0.1;
      default:
        return 0.3;
    }
  };

  const getBondRadius = () => {
    switch (representation) {
      case RepresentationType.BALL_AND_STICK:
        return 0.1;
      case RepresentationType.STICK:
        return 0.2;
      case RepresentationType.CARTOON:
      case RepresentationType.RIBBON:
        return 0.08;
      default:
        return 0.1;
    }
  };

  // Handle atom click
  const handleAtomClick = (atom: Atom) => {
    setSelectedAtom(atom === selectedAtom ? null : atom);
    if (onAtomClick) onAtomClick(atom);
    setRotationEnabled(false);
  };

  return (
    <group ref={groupRef}>
      {/* Render atoms based on representation */}
      {(representation === RepresentationType.BALL_AND_STICK || 
        representation === RepresentationType.SPHERE) && 
        filteredAtoms.map((atom) => (
          <AtomSphere 
            key={`atom-${atom.id}`} 
            atom={atom} 
            radius={getAtomRadius(atom)} 
            colorScheme={colorScheme}
            residues={residueMap}
            chains={chainMap}
            showLabel={showLabels}
            isHovered={selectedAtom?.id === atom.id}
            onClick={handleAtomClick}
          />
        ))
      }
      
      {/* Render bonds if representation includes bonds */}
      {(representation === RepresentationType.BALL_AND_STICK || 
        representation === RepresentationType.STICK) && 
        filteredBonds.map((bond) => {
          const atom1 = atomMap.get(bond.atomId1);
          const atom2 = atomMap.get(bond.atomId2);
          
          if (!atom1 || !atom2) return null;
          
          return (
            <BondCylinder 
              key={`bond-${bond.atomId1}-${bond.atomId2}`} 
              atom1={atom1} 
              atom2={atom2} 
              colorScheme={colorScheme}
              residues={residueMap}
              chains={chainMap}
              radius={getBondRadius()}
              bondOrder={bond.order || 1}
            />
          );
        })
      }
      
      {/* Add environment lighting based on quality */}
      {quality === 'high' && <Environment preset="studio" />}
    </group>
  );
};

// The MolecularViewer component
const MolecularViewer: React.FC<MolecularViewerProps> = ({ 
  structureId,
  initialRepresentation = RepresentationType.BALL_AND_STICK,
  initialColorScheme = ColorScheme.ELEMENT,
  showHydrogens = false,
  showLabels = false,
  showStats = false,
  backgroundColor = '#121212',
  width,
  height,
  quality = 'medium',
  readOnly = false,
  onModelLoaded,
}) => {
  const { activeSession } = useSession();
  const { 
    structure, 
    atoms, 
    bonds, 
    residues,
    chains, 
    loading, 
    error, 
    fetchStructure 
  } = useStructure();
  
  const [representation, setRepresentation] = useState<RepresentationType>(initialRepresentation);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialColorScheme);
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  
  // Load structure data when component mounts or structureId changes
  useEffect(() => {
    if (structureId && activeSession) {
      fetchStructure(structureId);
    }
  }, [structureId, activeSession, fetchStructure]);
  
  // Notify parent when model is loaded
  useEffect(() => {
    if (structure && atoms.length > 0 && onModelLoaded) {
      onModelLoaded({
        structure,
        atoms: atoms.length,
        bonds: bonds.length,
        residues: residues.size,
        chains: chains.size
      });
    }
  }, [structure, atoms, bonds, residues, chains, onModelLoaded]);
  
  const handleAtomClick = (atom: Atom) => {
    setSelectedAtom(atom === selectedAtom ? null : atom);
  };

  if (error) {
    return (
      <ViewerContainer width={width} height={height}>
        <div style={{ padding: '20px', color: 'red' }}>
          Error: {error}
        </div>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer width={width} height={height}>
      {loading && (
        <LoadingContainer>
          <LoadingIndicator />
        </LoadingContainer>
      )}
      
      <Canvas shadows={quality !== 'low'}>
        <color attach="background" args={[backgroundColor]} />
        <Lighting quality={quality} />
        
        <Suspense fallback={null}>
          {atoms.length > 0 && (
            <MolecularModel 
              atoms={atoms} 
              bonds={bonds}
              residues={residues}
              chains={chains}
              representation={representation}
              colorScheme={colorScheme}
              showHydrogens={showHydrogens}
              showLabels={showLabels}
              quality={quality}
              onAtomClick={handleAtomClick}
            />
          )}
        </Suspense>
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          makeDefault
        />
        
        {showStats && <Stats />}
      </Canvas>
      
      {selectedAtom && (
        <ViewerOverlay>
          {selectedAtom.element}{selectedAtom.id} - 
          Pos: ({selectedAtom.x.toFixed(2)}, {selectedAtom.y.toFixed(2)}, {selectedAtom.z.toFixed(2)})
        </ViewerOverlay>
      )}
    </ViewerContainer>
  );
};

export default MolecularViewer;