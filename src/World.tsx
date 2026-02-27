import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import type { Category } from './store';
import { WorkIsland } from './components/WorkIsland';

// 1. The Spatial Layout
const ISLANDS: { id: Category; color: string; shape: string; x: number; z: number }[] = [
  // The Core 5: Arranged in a tight 4-unit radius circle around the center
  { id: 'Work', color: '#00a1e0', shape: 'box', x: 0, z: -4 },
  { id: 'Health', color: 'indigo', shape: 'sphere', x: 3.8, z: -1.2 },
  { id: 'Fitness', color: 'gold', shape: 'capsule', x: 2.3, z: 3.2 },
  { id: 'Study', color: '#4ecdc4', shape: 'cone', x: -2.3, z: 3.2 },
  { id: 'Hobbies', color: '#ff6b6b', shape: 'torus', x: -3.8, z: -1.2 },
  
  // 2. The Admin Island: Banished 15 units away
  { id: 'Admin', color: 'orange', shape: 'octahedron', x: 12, z: -12 },
];

const Island = ({ config }: { config: typeof ISLANDS[0] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const { xp, enterPillar } = useStore();

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation offset by their X coordinate so they don't bounce identically
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + config.x) * 0.2;
    }
  });

  return (
    <group 
      ref={meshRef} 
      position={[config.x, 0, config.z]} 
      onClick={(e) => {
        e.stopPropagation();
        enterPillar(config.id);
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={hovered ? 1.1 : 1}
    >
      {/* If it's Work, render the custom growing tower */}
      {config.id === 'Work' ? (
        <WorkIsland xp={xp} />
      ) : (
        /* Otherwise, render the geometric placeholder */
        <mesh position={[0, 1, 0]}>
          {config.shape === 'sphere' && <sphereGeometry args={[1.5, 32, 32]} />}
          {config.shape === 'capsule' && <capsuleGeometry args={[1, 1.5, 4, 16]} />}
          {config.shape === 'cone' && <coneGeometry args={[1.5, 2.5, 32]} />}
          {config.shape === 'torus' && <torusGeometry args={[1, 0.4, 16, 100]} />}
          {config.shape === 'octahedron' && <octahedronGeometry args={[1.5]} />}
          
          <meshStandardMaterial 
            color={config.color} 
            emissive={config.color}
            emissiveIntensity={hovered ? 0.6 : 0.2}
            wireframe={config.id !== 'Admin'} // Make core ones wireframe, Admin solid
          />
        </mesh>
      )}

      {/* Floating Label */}
      <Text position={[0, 3.5, 0]} fontSize={0.6} color="white" outlineWidth={0.02} outlineColor="#000">
        {config.id.toUpperCase()}
      </Text>
    </group>
  );
};

export const WorldMap = () => {
  return (
    <group>
      {ISLANDS.map((island) => (
        <Island key={island.id} config={island} />
      ))}
      
      {/* Base Grid/Platform to ground the center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#111" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};