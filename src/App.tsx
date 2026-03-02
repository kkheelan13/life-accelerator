import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { useStore } from './store';
import type { Category } from './store';
import { WorldMap } from './World'; 
import { FocusIsland } from './FocusIsland';

// Helper for category colors
const categoryColors: Record<Category, string> = {
  Work: '#00a1e0', Health: 'indigo', Fitness: 'gold', 
  Study: '#4ecdc4', Hobbies: '#ff6b6b', Admin: 'orange'
};

const BrainDumpInput = ({ activeCategory }: { activeCategory: Category }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const addTiles = useStore((state) => state.addTiles);
  const activeColor = categoryColors[activeCategory];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) {
      // NEW PARAMS: titles, category, color, gear (default 2), parentId (default null)
      addTiles(lines, activeCategory, activeColor, 2, null); 
      setText('');
      setIsOpen(false); 
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,20,20,0.8)', color: 'white', border: `1px solid ${activeColor}`,
          padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer',
          pointerEvents: 'auto', zIndex: 100, backdropFilter: 'blur(5px)'
        }}
      >
        + ADD TILES TO MASTER BELT
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: '600px', pointerEvents: 'auto', zIndex: 100,
      background: 'rgba(10, 10, 10, 0.95)', padding: '15px', borderRadius: '12px',
      border: `1px solid ${activeColor}`, backdropFilter: 'blur(10px)'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: activeColor, fontWeight: 'bold' }}>MASTER BELT INPUT</div>
          <button type="button" onClick={() => setIsOpen(false)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>CLOSE</button>
        </div>
        <textarea 
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="1 Line = 1 Tile on the Master Belt" rows={3}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontFamily: 'monospace', fontSize: '1rem', resize: 'none', outline: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e); }} autoFocus 
        />
        <button type="submit" style={{ background: activeColor, color: '#000', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          DEPLOY TO BELT
        </button>
      </form>
    </div>
  );
};

const UI = () => {
  const { xp, view, exitPillar, activeCategory } = useStore();

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '30px', pointerEvents: 'none', zIndex: 50, display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ color: 'white', fontFamily: '"Geist", monospace' }}>
          <h1 style={{ margin: 0, letterSpacing: '-1px' }}>
            {view === 'world' ? 'ORBITAL COMMAND' : activeCategory?.toUpperCase()}
          </h1>
          <div style={{ color: '#00a1e0', fontWeight: 'bold' }}>XP: {xp}</div>
        </div>
        {view === 'focus' && (
          <button onClick={exitPillar} style={{ pointerEvents: 'auto', padding: '12px 24px', background: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: 'fit-content' }}>
            BACK TO MAP
          </button>
        )}
      </div>
      {view === 'focus' && activeCategory && <BrainDumpInput activeCategory={activeCategory} />}
    </>
  );
};

export default function App() {
  const view = useStore((state) => state.view);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} camera={{ position: [0, 4, 12], fov: 45 }}>
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          {view === 'world' ? <WorldMap /> : <FocusIsland />}
          <OrbitControls enablePan={false} minDistance={3} maxDistance={20} makeDefault />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
}