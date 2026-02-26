import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { useStore } from './store';
import type { Category } from './store';
import * as THREE from 'three';
import { WorkIsland } from './components/WorkIsland';
import { HealthIsland } from './islands/HealthIsland'; // The one we drafted earlier

const Island = ({ config }: { config: any }) => {
  const { xp, enterPillar } = useStore();
  
  return (
    <group position={[config.x, 0, config.z]} onClick={() => enterPillar(config.id)}>
      {config.id === 'Work' && <WorkIsland xp={xp} />}
      {config.id === 'Health' && <HealthIsland xp={xp} />}
      
      {/* Fallback for others until we build them */}
      {['Fitness', 'Study', 'Hobbies'].includes(config.id) && (
        <mesh>
          <sphereGeometry args={[1]} />
          <meshStandardMaterial color={config.color} wireframe />
        </mesh>
      )}

      <Text position={[0, 3, 0]} fontSize={0.5} color="white">{config.id}</Text>
    </group>
  );
};

// Configuration for your 5 Islands
const ISLANDS: { id: Category; color: string; shape: string; x: number; z: number }[] = [
  { id: 'Work', color: '#00a1e0', shape: 'box', x: 0, z: -4 },
  { id: 'Health', color: 'indigo', shape: 'sphere', x: 3.8, z: -1.2 },
  { id: 'Fitness', color: 'gold', shape: 'capsule', x: 2.3, z: 3.2 },
  { id: 'Hobbies', color: '#ff6b6b', shape: 'torus', x: -2.3, z: 3.2 },
  { id: 'Study', color: '#4ecdc4', shape: 'cone', x: -3.8, z: -1.2 },
];

// const Island = ({ config }: { config: typeof ISLANDS[0] }) => {
//   const meshRef = useRef<THREE.Mesh>(null);
//   const [hovered, setHover] = useState(false);
//   const enterPillar = useStore((state) => state.enterPillar);

//   // Gentle floating animation
//   useFrame((state) => {
//     if (meshRef.current) {
//       meshRef.current.position.y = Math.sin(state.clock.elapsedTime + config.x) * 0.2;
//       meshRef.current.rotation.y += 0.01;
//     }
//   });

//   return (
//     <group position={[config.x, 0, config.z]}>
//       <mesh
//         ref={meshRef}
//         onPointerOver={() => setHover(true)}
//         onPointerOut={() => setHover(false)}
//         onClick={() => enterPillar(config.id)} // <--- CLICK TO ENTER
//         scale={hovered ? 1.2 : 1}
//       >
//         {/* Different shapes for different pillars */}
//         {config.shape === 'box' && <boxGeometry args={[1.5, 1.5, 1.5]} />}
//         {config.shape === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
//         {config.shape === 'capsule' && <capsuleGeometry args={[0.8, 2, 4, 8]} />}
//         {config.shape === 'cone' && <coneGeometry args={[1, 2, 32]} />}
//         {config.shape === 'torus' && <torusGeometry args={[0.8, 0.3, 16, 100]} />}

//         <meshStandardMaterial 
//           color={config.color} 
//           emissive={config.color} 
//           emissiveIntensity={hovered ? 0.8 : 0.2} 
//         />
//       </mesh>
      
//       {/* Floating Label */}
//       <Text position={[0, 2, 0]} fontSize={0.5} color="white" anchorX="center">
//         {config.id}
//       </Text>
//     </group>
//   );
// };

export const WorldMap = () => {
  return (
    <group>
      {ISLANDS.map((island) => (
        <Island key={island.id} config={island} />
      ))}
      {/* Floor to ground the world */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#222" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};