import React from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface TaskRowProps {
  category: string;
  yPosition: number;
  tiles: { id: string; title: string; isCompleted: boolean }[];
}

export const TaskRow = ({ category, yPosition, tiles }: TaskRowProps) => {
  const radius = 5;

  return (
    <group position={[0, yPosition, 0]}>
      <Text
        position={[0, 0.8, -radius + 0.5]}
        fontSize={0.4}
        color="white"
        anchorX="center"
      >
        {category.toUpperCase()}
      </Text>

      {tiles.map((tile, index) => {
        const angle = (index / 8) * Math.PI; // Arrange in a semi-circle
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        return (
          <group key={tile.id} position={[x, 0, z]} rotation={[0, angle + Math.PI / 2, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 0.6, 0.1]} />
              <meshStandardMaterial 
                color={tile.isCompleted ? "#4ade80" : "#222"} 
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.12}
              maxWidth={1}
              textAlign="center"
              color="white"
            >
              {tile.title}
            </Text>
          </group>
        );
      })}
    </group>
  );
};