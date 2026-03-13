import React, { useState } from 'react';
import { Text, Float } from '@react-three/drei';
import { useStore } from './store';

interface PillarProps {
  position: [number, number, number];
  category: string;
  color: string;
}

const Pillar = ({ position, category, color }: PillarProps) => {
  const { setCategory } = useStore();
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
        <mesh 
          onClick={(e) => { 
            e.stopPropagation(); 
            setCategory(category); 
            document.body.style.cursor = 'default';
          }}
          onPointerOver={(e) => { 
            e.stopPropagation(); 
            setHovered(true); 
            document.body.style.cursor = 'pointer'; 
          }}
          onPointerOut={(e) => { 
            e.stopPropagation(); 
            setHovered(false); 
            document.body.style.cursor = 'default'; 
          }}
        >
          {/* A sleek, sci-fi hexagonal pillar */}
          <cylinderGeometry args={[1.2, 1.5, 4, 6]} />
          <meshStandardMaterial 
            color="#111" 
            metalness={0.8} 
            roughness={0.2} 
            emissive={color}
            emissiveIntensity={hovered ? 0.6 : 0.15}
            transparent 
            opacity={0.9} 
          />
        </mesh>
        
        {/* Floating Category Title */}
        {/* Floating Category Title */}
        <Text 
          position={[0, 3, 0]} 
          fontSize={0.6} 
          color="white" 
          outlineWidth={0.02} 
          outlineColor="#000"
        >
          {category}
        </Text>
      </Float>
    </group>
  );
};

export const WorldSpace = () => {
  return (
    <group position={[0, -1, 0]}>
      {/* The Map Floor */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* The 3 Main Category Pillars */}
      <Pillar position={[-6, 0, 0]} category="WORK" color="#00e6ff" />
      <Pillar position={[0, 0, -5]} category="PERSONAL" color="#4ade80" />
      <Pillar position={[6, 0, 0]} category="PROJECTS" color="#ff0055" />
    </group>
  );
};