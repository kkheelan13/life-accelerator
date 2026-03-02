import React, { useRef } from 'react';
import { Text, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';
import type { Tile } from './store';

interface TileCardProps {
  tile: Tile;
  targetZ: number;
  isSidecar?: boolean;
}

const TileCard = ({ tile, targetZ, isSidecar = false }: TileCardProps) => {
  const { completeTile, toggleSidetrack, tiles } = useStore();
  const physicsRef = useRef<THREE.Group>(null);
  
  // A ref to hold our click timer so we can cancel it if you double-click
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const height = tile.gear === 3 ? 1.2 : tile.gear === 1 ? 0.4 : 0.8;
  const opacity = tile.gear === 3 ? 1 : tile.gear === 1 ? 0.8 : 0.9;
  const parentName = tile.parentId ? tiles.find(t => t.id === tile.parentId)?.title : null;

  useFrame((_, delta) => {
    if (!physicsRef.current) return;
    const targetY = tile.isCompleted ? -1.5 : 0; 
    const targetRotX = tile.isCompleted ? -Math.PI / 2 : 0; 
    const targetX = isSidecar ? 3 : -1; 

    physicsRef.current.position.y = THREE.MathUtils.lerp(physicsRef.current.position.y, targetY, delta * 6);
    physicsRef.current.position.z = THREE.MathUtils.lerp(physicsRef.current.position.z, targetZ, delta * 5);
    physicsRef.current.position.x = THREE.MathUtils.lerp(physicsRef.current.position.x, targetX, delta * 5);
    physicsRef.current.rotation.x = THREE.MathUtils.lerp(physicsRef.current.rotation.x, targetRotX, delta * 6);
  });

  // --- INTERACTION LOGIC ---
  const handleSingleClick = (e: any) => {
    e.stopPropagation();
    if (tile.isCompleted) return;

    // THE FIX: Clear any existing timer so the first click of a double-click doesn't "leak"
    if (clickTimer.current) clearTimeout(clickTimer.current);

    // Set a new timer. 300ms is a standard, comfortable double-click window.
    clickTimer.current = setTimeout(() => {
      completeTile(tile.id);
    }, 300); 
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    if (tile.isCompleted) return;

    // Cancel the single-click timer entirely
    if (clickTimer.current) clearTimeout(clickTimer.current);
    
    // Slide it to the Sidecar
    toggleSidetrack(tile.id);
  };

  return (
    <group>
      <group ref={physicsRef}>
        <Float speed={tile.isCompleted ? 0 : 2} rotationIntensity={tile.isCompleted ? 0 : 0.05} floatIntensity={tile.isCompleted ? 0 : 0.1}>
          
          {parentName && !tile.isCompleted && (
            <Text position={[0, height / 2 + 0.2, 0]} fontSize={0.12} color="#aaa" maxWidth={2} textAlign="center">
              [ {parentName} ]
            </Text>
          )}

          {/* Added onClick and onDoubleClick to the Mesh directly */}
          <mesh 
            onClick={handleSingleClick}
            onDoubleClick={handleDoubleClick}
          >
            <boxGeometry args={[2.2, height, 0.1]} />
            <meshStandardMaterial 
              color={tile.isCompleted ? "#1a472a" : (isSidecar ? "#2b4059" : "#222")} 
              emissive={tile.isCompleted ? "#4ade80" : tile.color}
              emissiveIntensity={tile.isCompleted ? 0.1 : 0.15}
              metalness={0.8} roughness={0.2} transparent opacity={opacity}
            />
          </mesh>

          <Text position={[0, 0, 0.06]} fontSize={0.18} maxWidth={2} textAlign="center" color={tile.isCompleted ? "#888" : "white"}>
            {tile.title}
          </Text>

        </Float>
      </group>
    </group>
  );
};

export const FocusIsland = () => {
  const { activeCategory, tiles } = useStore();
  const activeTiles = tiles.filter(t => t.category === activeCategory && !t.isChopped);
  
  const mainBelt = activeTiles.filter(t => !t.isSidetracked);
  const sidecarBelt = activeTiles.filter(t => t.isSidetracked);

  if (activeTiles.length === 0) return null;

  return (
    <group position={[0, -1, 2]}>
      
      {/* MASTER BELT */}
      <mesh position={[-1, -1.6, -4]}>
        <boxGeometry args={[2.8, 0.1, 15]} />
        <meshStandardMaterial color="#111" metalness={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[-1, -1.5, 3]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.4} color="#333" outlineWidth={0.01}>MASTER BELT</Text>

      {/* SIDECAR */}
      <mesh position={[3, -1.6, -4]}>
        <boxGeometry args={[2.5, 0.1, 15]} />
        <meshStandardMaterial color="#0a1526" metalness={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[3, -1.5, 3]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.4} color="#2b4059" outlineWidth={0.01}>SIDECAR</Text>

      {mainBelt.map((tile, index) => {
        const completedAhead = mainBelt.slice(0, index).filter(t => t.isCompleted).length;
        const activeAhead = mainBelt.slice(0, index).filter(t => !t.isCompleted).length;
        const targetZ = tile.isCompleted ? -1 - (completedAhead * 1.5) : -1 - (activeAhead * 1.5);
        return <TileCard key={tile.id} tile={tile} targetZ={targetZ} isSidecar={false} />;
      })}

      {sidecarBelt.map((tile, index) => {
        const completedAhead = sidecarBelt.slice(0, index).filter(t => t.isCompleted).length;
        const activeAhead = sidecarBelt.slice(0, index).filter(t => !t.isCompleted).length;
        const targetZ = tile.isCompleted ? -1 - (completedAhead * 1.5) : -1 - (activeAhead * 1.5);
        return <TileCard key={tile.id} tile={tile} targetZ={targetZ} isSidecar={true} />;
      })}

    </group>
  );
};