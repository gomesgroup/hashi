import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import styled from 'styled-components';
import { Atom, Bond, RepresentationType, ColorScheme } from '../types';

interface MolecularViewerProps {
  atoms: Atom[];
  bonds: Bond[];
  representation: RepresentationType;
  colorScheme: ColorScheme;
  showHydrogens: boolean;
  showLabels: boolean;
  backgroundColor?: string;
}

const ViewerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
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

// Get color for an atom based on element
const getAtomColor = (element: string, colorScheme: ColorScheme): string => {
  if (colorScheme === ColorScheme.ELEMENT) {
    return elementColors[element] || elementColors.default;
  }
  // Add other color schemes here
  return elementColors.default;
};

// Create a sphere to represent an atom
const AtomSphere = ({ atom, radius, colorScheme }: { atom: Atom; radius: number; colorScheme: ColorScheme }) => {
  const color = getAtomColor(atom.element, colorScheme);
  
  return (
    <mesh position={[atom.x, atom.y, atom.z]}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Create a cylinder to represent a bond
const BondCylinder = ({ 
  atom1, 
  atom2, 
  colorScheme,
  radius = 0.1 
}: { 
  atom1: Atom; 
  atom2: Atom; 
  colorScheme: ColorScheme;
  radius?: number;
}) => {
  // Find the midpoint and length of the bond
  const midpoint = new THREE.Vector3(
    (atom1.x + atom2.x) / 2,
    (atom1.y + atom2.y) / 2,
    (atom1.z + atom2.z) / 2
  );
  
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
  const direction = end.clone().sub(start);
  const length = direction.length();
  
  // Calculate the rotation to align the cylinder with the bond
  const cylinderDirection = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  direction.normalize();
  quaternion.setFromUnitVectors(cylinderDirection, direction);
  
  return (
    <mesh position={[midpoint.x, midpoint.y, midpoint.z]} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color="#909090" />
    </mesh>
  );
};

// The main molecular model component
const MolecularModel = ({ 
  atoms, 
  bonds, 
  representation, 
  colorScheme,
  showHydrogens
}: { 
  atoms: Atom[]; 
  bonds: Bond[];
  representation: RepresentationType;
  colorScheme: ColorScheme;
  showHydrogens: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation - gentle rotation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  // Create a mapping from atom ID to atom
  const atomMap = new Map<number, Atom>();
  
  const filteredAtoms = showHydrogens 
    ? atoms
    : atoms.filter(atom => atom.element !== 'H');
    
  // Create atom map for bond lookup
  atoms.forEach(atom => {
    atomMap.set(atom.id, atom);
  });

  // Filter bonds for hydrogens if needed
  const filteredBonds = showHydrogens
    ? bonds
    : bonds.filter(bond => {
        const atom1 = atomMap.get(bond.atomId1);
        const atom2 = atomMap.get(bond.atomId2);
        return atom1 && atom2 && atom1.element !== 'H' && atom2.element !== 'H';
      });

  // Calculate atom radius based on representation
  const getAtomRadius = (atom: Atom) => {
    switch (representation) {
      case RepresentationType.BALL_AND_STICK:
        return 0.3;
      case RepresentationType.SPHERE:
        return 0.8;
      case RepresentationType.STICK:
        return 0.2;
      default:
        return 0.3;
    }
  };

  return (
    <group ref={groupRef}>
      {/* Render atoms */}
      {filteredAtoms.map((atom) => (
        <AtomSphere 
          key={`atom-${atom.id}`} 
          atom={atom} 
          radius={getAtomRadius(atom)} 
          colorScheme={colorScheme}
        />
      ))}
      
      {/* Render bonds if representation includes bonds */}
      {(representation === RepresentationType.BALL_AND_STICK || 
        representation === RepresentationType.STICK) && 
        filteredBonds.map((bond) => {
          const atom1 = atomMap.get(bond.atomId1);
          const atom2 = atomMap.get(bond.atomId2);
          
          if (!atom1 || !atom2) return null;
          
          const bondRadius = representation === RepresentationType.STICK ? 0.15 : 0.1;
          
          return (
            <BondCylinder 
              key={`bond-${bond.atomId1}-${bond.atomId2}`} 
              atom1={atom1} 
              atom2={atom2} 
              colorScheme={colorScheme}
              radius={bondRadius}
            />
          );
        })
      }
    </group>
  );
};

// Calculate the bounding box to center the camera
const calculateBoundingBox = (atoms: Atom[]): THREE.Box3 => {
  const box = new THREE.Box3();
  
  atoms.forEach(atom => {
    const point = new THREE.Vector3(atom.x, atom.y, atom.z);
    box.expandByPoint(point);
  });
  
  return box;
};

const MolecularViewer: React.FC<MolecularViewerProps> = ({ 
  atoms, 
  bonds, 
  representation, 
  colorScheme,
  showHydrogens,
  showLabels,
  backgroundColor = '#000000'
}) => {
  const [boundingBox, setBoundingBox] = useState<THREE.Box3 | null>(null);
  
  useEffect(() => {
    if (atoms.length > 0) {
      setBoundingBox(calculateBoundingBox(atoms));
    }
  }, [atoms]);
  
  // Calculate camera position based on bounding box
  const getCameraPosition = (): [number, number, number] => {
    if (!boundingBox) return [0, 0, 20];
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    const distance = maxDimension * 2;
    
    return [0, 0, distance];
  };

  return (
    <ViewerContainer>
      <Canvas camera={{ position: getCameraPosition(), fov: 50 }}>
        <color attach="background" args={[backgroundColor]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <MolecularModel 
          atoms={atoms} 
          bonds={bonds} 
          representation={representation}
          colorScheme={colorScheme}
          showHydrogens={showHydrogens}
        />
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </ViewerContainer>
  );
};

export default MolecularViewer;