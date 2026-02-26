// src/components/WorkIsland.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const WorkIsland = ({ xp }: { xp: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const height = 1 + (xp / 1000); // Tower grows with XP

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Office Tower */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[1.5, height, 1.5]} />
        <meshStandardMaterial color="#00a1e0" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* The "Training" Crane - Red if behind, Green if active */}
      <mesh position={[1, height - 0.5, 0]}>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial color={xp < 500 ? "red" : "#00ff00"} />
      </mesh>

      {/* Floating Platform base */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[2, 2.2, 0.2, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
};