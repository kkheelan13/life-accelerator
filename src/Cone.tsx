import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';

interface TaskBeadProps {
  id: number;
  color: string;
  title: string;
  index: number;
}

const TaskBead: React.FC<TaskBeadProps> = ({ id, color, title, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const completeTask = useStore((state) => state.completeTask);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      if (hovered) {
        meshRef.current.rotation.y += delta * 2;
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });
  
  const angle = index * 2.5; 
  const radius = 2 - (index * 0.5); 
  const y = index * 1.5;

  return (
    <group position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          completeTask(id);
        }}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
            color={hovered ? "white" : color}
            emissive={color} 
            emissiveIntensity={hovered ? 1 : 0.5} 
            roughness={0.1}
            metalness={0.8}
        />
      </mesh>
      <Text 
        position={[0.6, 0, 0]} 
        fontSize={0.3} 
        color="white" 
        anchorX="left"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {title}
      </Text>
    </group>
  );
};

export const FocusCone = () => {
  const tasks = useStore((state) => 
    state.tasks.filter((t) => t.category === state.activeCategory)
  );

  return (
    <group position={[0, -2, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 2.5, 6, 32]} />
        <meshStandardMaterial color="#333" transparent opacity={0.3} wireframe />
      </mesh>

      {tasks.map((task, index) => (
        <TaskBead 
            key={task.id} 
            id={task.id}
            color={task.color} 
            title={task.title} 
            index={index} 
        />
      ))}
    </group>
  );
};