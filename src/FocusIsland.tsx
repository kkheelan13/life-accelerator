import React from 'react';
import { Text, Float } from '@react-three/drei';
import { useStore } from './store';

const TileCard = ({ tile, taskId, color, position }: any) => {
  const completeTile = useStore((state) => state.completeTile);

  return (
    <Float speed={2} rotationIntensity={0.05} floatIntensity={0.1}>
      <group position={position}>
        <mesh 
          onClick={(e) => {
            e.stopPropagation();
            if (!tile.isCompleted) completeTile(taskId, tile.id);
          }}
        >
          {/* Slightly angled back so you can read it down the belt */}
          <boxGeometry args={[1.6, 0.8, 0.1]} />
          <meshStandardMaterial 
            color={tile.isCompleted ? "#4ade80" : "#222"} 
            emissive={tile.isCompleted ? "#4ade80" : color}
            emissiveIntensity={tile.isCompleted ? 0.3 : 0.1}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.15}
          maxWidth={1.4}
          textAlign="center"
          color="white"
        >
          {tile.title}
        </Text>
      </group>
    </Float>
  );
};

export const FocusIsland = () => {
  const { activeCategory, tasks } = useStore();
  
  // Get ALL Work Items (Projects) for this specific Island
  const categoryTasks = tasks.filter((t) => t.category === activeCategory);

  if (categoryTasks.length === 0) return null;

  return (
    <group position={[0, -1, 2]}>
      {categoryTasks.map((task, taskIndex) => {
        // 1. LANES (X-Axis): Spread projects left and right
        const laneX = (taskIndex - (categoryTasks.length - 1) / 2) * 2.5;

        return (
          <group key={task.id} position={[laneX, 0, 0]}>
            
            {/* Lane Header (The Work Item Name) */}
            <Text position={[0, 1.2, 0]} fontSize={0.3} color={task.color} outlineWidth={0.02} outlineColor="#000">
              {task.title.toUpperCase()}
            </Text>

            {/* The Lane "Base/Platform" */}
            <mesh position={[0, -0.5, -4]}>
              <boxGeometry args={[2, 0.1, 10]} />
              <meshStandardMaterial color="#111" metalness={0.5} transparent opacity={0.8} />
            </mesh>

            {/* 2. CONVEYOR BELT (Z-Axis): Tiles go backwards into the screen */}
            {task.tiles.map((tile, tileIndex) => {
              // Z Offset moves them backwards. Y Offset slightly drops completed ones.
              const zOffset = -1 - (tileIndex * 1.5); 
              const yOffset = tile.isCompleted ? -0.2 : 0; 
              
              return (
                <TileCard 
                  key={tile.id}
                  tile={tile}
                  taskId={task.id}
                  color={task.color}
                  position={[0, yOffset, zOffset]}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
};