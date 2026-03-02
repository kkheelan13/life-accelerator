import React, { useRef, useState } from 'react';
import { Text, Float, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from './store';
import type { Tile } from './store';

interface TileCardProps {
  tile: Tile;
  targetZ: number;
  isSidecar?: boolean;
}

const TileCard = ({ tile, targetZ, isSidecar = false }: TileCardProps) => {
  const { completeTile, toggleSidetrack, chopTile, tiles } = useStore();
  const physicsRef = useRef<THREE.Group>(null);
  
  // Timers for double clicks
  const leftClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isChopping, setIsChopping] = useState(false);
  const [chopText, setChopText] = useState('');

  // The Gear Visuals (Size & Brightness)
  const height = tile.gear === 3 ? 1.2 : tile.gear === 1 ? 0.4 : 0.8;
  const opacity = tile.gear === 3 ? 1 : tile.gear === 1 ? 0.8 : 0.9;
  
  // Color coding the Gear Material
  // Gear 3 = Darker/Heavier, Gear 1 = Brighter/More Emissive
  const emissiveIntensity = tile.gear === 3 ? 0.05 : tile.gear === 2 ? 0.15 : 0.4;

  // Find Ancestry!
  const parent = tile.parentId ? tiles.find(t => t.id === tile.parentId) : null;
  const grandparent = parent?.parentId ? tiles.find(t => t.id === parent.parentId) : null;

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

  // --- LEFT CLICK (Complete / Chop / Sidecar) ---
  const handleLeftClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (tile.isCompleted || isChopping) return;

    // THE NEW STEALTH TRIGGER: Hold Shift or Cmd (Mac) + Click to Chop!
    if ((e.shiftKey || e.metaKey) && tile.gear > 1) {
      setIsChopping(true);
      return; // Stop the rest of the click logic
    }

    // Normal single-click logic (Complete)
    if (leftClickTimer.current) clearTimeout(leftClickTimer.current);
    leftClickTimer.current = setTimeout(() => {
      completeTile(tile.id);
    }, 300); 
  };

  const handleDoubleLeftClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (tile.isCompleted || isChopping) return;

    if (leftClickTimer.current) clearTimeout(leftClickTimer.current);
    toggleSidetrack(tile.id);
  };

  // We completely delete the handleRightClick function!

  // --- RIGHT CLICK (The Stealth Chop) ---
  const handleRightClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Prevent default browser right-click menu
    if (typeof document !== 'undefined') document.addEventListener('contextmenu', event => event.preventDefault(), { once: true });
    
    if (tile.isCompleted || isChopping || tile.gear === 1) return;

    if (rightClickTimer.current) {
      // Second right click! Trigger Chop Menu
      clearTimeout(rightClickTimer.current);
      rightClickTimer.current = null;
      setIsChopping(true);
    } else {
      // First right click! Set timer
      rightClickTimer.current = setTimeout(() => {
        rightClickTimer.current = null;
      }, 300);
    }
  };

  const handleChopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = chopText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) chopTile(tile.id, lines);
    setIsChopping(false);
    setChopText('');
  };

  return (
    <group>
      <group ref={physicsRef}>
        <Float speed={tile.isCompleted ? 0 : 2} rotationIntensity={tile.isCompleted ? 0 : 0.05} floatIntensity={tile.isCompleted ? 0 : 0.1}>

          <mesh 
            onClick={handleLeftClick} 
            onDoubleClick={handleDoubleLeftClick}
            onContextMenu={handleRightClick} // Triggers on right click!
          >
            <boxGeometry args={[2.2, height, 0.1]} />
            <meshStandardMaterial 
              color={tile.isCompleted ? "#1a472a" : (isSidecar ? "#2b4059" : "#222")} 
              emissive={tile.isCompleted ? "#4ade80" : tile.color}
              emissiveIntensity={tile.isCompleted ? 0.1 : emissiveIntensity}
              metalness={0.8} roughness={0.2} transparent opacity={opacity}
            />
          </mesh>

          {/* THE NEW ANCESTRY HEADER (Carved inside the top of the tile) */}
          {!tile.isCompleted && (
            <group position={[0, height / 2 - 0.15, 0.06]}>
              {grandparent ? (
                // Three layers deep: Render Grandparent (Orange) > Parent (Cyan)
                <>
                  <Text position={[-0.05, 0, 0]} fontSize={0.07} color="#ff9900" anchorX="right">
                    {grandparent.title.toUpperCase()} &gt;
                  </Text>
                  <Text position={[0.05, 0, 0]} fontSize={0.07} color="#00e6ff" anchorX="left">
                    {parent?.title.toUpperCase()}
                  </Text>
                </>
              ) : parent ? (
                // Two layers deep: Render Parent (Cyan) centered
                <Text position={[0, 0, 0]} fontSize={0.07} color="#00e6ff" anchorX="center">
                  {parent.title.toUpperCase()}
                </Text>
              ) : null}
            </group>
          )}

          {/* MAIN TITLE (Shifted down slightly to make room for the Ancestry header) */}
          <Text position={[0, -0.05, 0.06]} fontSize={0.16} maxWidth={2} textAlign="center" color={tile.isCompleted ? "#888" : "white"}>
            {tile.title}
          </Text>

          {/* THE CHOPPING TERMINAL */}
          {isChopping && (
            <Html position={[0, height + 0.5, 0.5]} center zIndexRange={[100, 0]}>
              <div onClick={(e) => e.stopPropagation()} style={{
                background: 'rgba(15, 15, 15, 0.95)', padding: '15px', borderRadius: '12px',
                border: `1px solid ${tile.color}`, width: '250px', backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
              }}>
                <form onSubmit={handleChopSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: tile.color, fontSize: '12px', fontWeight: 'bold' }}>
                    CHOP INTO GEAR {tile.gear - 1}:
                  </div>
                  <textarea 
                    autoFocus
                    value={chopText} onChange={(e) => setChopText(e.target.value)}
                    placeholder="Sub-task 1&#10;Sub-task 2" rows={3}
                    style={{ background: '#000', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', resize: 'none', outline: 'none' }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleChopSubmit(e); }}
                  />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button type="submit" style={{ flex: 1, background: tile.color, color: '#000', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>CHOP</button>
                    <button type="button" onClick={() => setIsChopping(false)} style={{ background: '#444', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                  </div>
                </form>
              </div>
            </Html>
          )}

        </Float>
      </group>
    </group>
  );
};

export const FocusIsland = () => {
  const { activeCategory, tiles } = useStore();
  const activeTiles = tiles
    .filter(t => t.category === activeCategory && !t.isChopped)
    .sort((a, b) => a.createdAt - b.createdAt);
  
  const mainBelt = activeTiles.filter(t => !t.isSidetracked);
  const sidecarBelt = activeTiles.filter(t => t.isSidetracked);

  if (activeTiles.length === 0) return null;

  return (
    <group position={[0, -1, 2]}>
      {/* PLATFORMS */}
      <mesh position={[-1, -1.6, -4]}>
        <boxGeometry args={[2.8, 0.1, 15]} />
        <meshStandardMaterial color="#111" metalness={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[-1, -1.5, 3]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.4} color="#333" outlineWidth={0.01}>MASTER BELT</Text>

      <mesh position={[3, -1.6, -4]}>
        <boxGeometry args={[2.5, 0.1, 15]} />
        <meshStandardMaterial color="#0a1526" metalness={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[3, -1.5, 3]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.4} color="#2b4059" outlineWidth={0.01}>SIDECAR</Text>

      {/* BELTS */}
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