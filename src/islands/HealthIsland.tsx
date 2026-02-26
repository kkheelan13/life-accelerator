import React from 'react';
import { Sphere, Cylinder } from '@react-three/drei';

export const HealthIsland = ({ xp }: { xp: number }) => {
  // Logic: Level 1 = 0 XP, Level 2 = 500 XP, etc.
  const level = Math.floor(xp / 500) + 1;

  return (
    <group>
      {/* The Ground */}
      <Cylinder args={[1.5, 1.5, 0.2, 32]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#3a5a40" />
      </Cylinder>

      {/* The Trunk */}
      <Cylinder args={[0.2, 0.3, 1, 8]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#582f0e" />
      </Cylinder>

      {/* The Leaves - Scale grows with Level */}
      <group position={[0, 1.2, 0]}>
        <Sphere args={[0.5 * level, 16, 16]}>
          <meshStandardMaterial color="#a3b18a" transparent opacity={0.8} />
        </Sphere>
      </group>
      
      {/* Add "Fruits" for every 1000 XP */}
      {xp > 1000 && (
        <Sphere args={[0.1]} position={[0.4, 1.5, 0.4]}>
          <meshStandardMaterial color="red" emissive="red" />
        </Sphere>
      )}
    </group>
  );
};