import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { useStore } from './store';
import { WorldMap } from './World'; 
import { FocusIsland } from './FocusIsland';

// Updated: Now accepts all tasks in the category to populate a dropdown
// Updated BrainDumpInput with a Toggle Button
const BrainDumpInput = ({ categoryTasks }: { categoryTasks: any[] }) => {
  const [isOpen, setIsOpen] = useState(false); // Toggle state
  const [text, setText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(categoryTasks[0]?.id);
  const addTiles = useStore((state) => state.addTiles);

  useEffect(() => {
    if (categoryTasks.length > 0) setSelectedTaskId(categoryTasks[0].id);
  }, [categoryTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0 && selectedTaskId) {
      addTiles(selectedTaskId, lines);
      setText('');
      setIsOpen(false); // Auto-close after deploying
    }
  };

  const activeColor = categoryTasks.find(t => t.id === selectedTaskId)?.color || '#fff';

  // If closed, just show a floating "+" button
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,20,20,0.8)', color: 'white', border: `1px solid ${activeColor}`,
          padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer',
          pointerEvents: 'auto', zIndex: 100, backdropFilter: 'blur(5px)',
          boxShadow: `0 0 10px ${activeColor}40`
        }}
      >
        + ADD TILES
      </button>
    );
  }

  // If open, show the full terminal
  return (
    <div style={{
      position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: '600px', pointerEvents: 'auto', zIndex: 100,
      background: 'rgba(10, 10, 10, 0.95)', padding: '15px', borderRadius: '12px',
      border: `1px solid ${activeColor}`, backdropFilter: 'blur(10px)',
      boxShadow: `0 10px 30px rgba(0,0,0,0.5)`
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: activeColor, fontSize: '0.8rem', fontWeight: 'bold' }}>
            BRAIN DUMP TERMINAL
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={selectedTaskId} 
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              style={{ 
                background: '#222', color: 'white', border: 'none', padding: '4px 8px', 
                borderRadius: '4px', outline: 'none', fontFamily: 'monospace'
              }}
            >
              {categoryTasks.map(task => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
            {/* Close Button */}
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        </div>

        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste tasks here...&#10;1 Line = 1 Tile on the belt"
          rows={3}
          style={{
            width: '100%', background: 'transparent', border: 'none', color: 'white',
            fontFamily: 'monospace', fontSize: '1rem', resize: 'none', outline: 'none',
            boxSizing: 'border-box'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
          }}
          autoFocus // Automatically highlights the text box so you can start typing
        />
        <button type="submit" style={{
          background: activeColor, color: '#000', border: 'none', 
          padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
        }}>
          DEPLOY TO BELT
        </button>
      </form>
    </div>
  );
};

const UI = () => {
  const { xp, view, exitPillar, activeCategory, tasks } = useStore();
  
  // Get ALL tasks for the current island
  const categoryTasks = tasks.filter(t => t.category === activeCategory);

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', padding: '30px',
        pointerEvents: 'none', zIndex: 50, display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box'
      }}>

        <div style={{ color: 'white', fontFamily: '"Geist", monospace' }}>
          <h1 style={{ margin: 0, letterSpacing: '-1px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            {view === 'world' ? 'ORBITAL COMMAND' : activeCategory?.toUpperCase()}
            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>v0.1.0-alpha</span>
          </h1>
          <div style={{ color: '#00a1e0', fontWeight: 'bold' }}>XP: {xp}</div>
        </div>
        {view === 'focus' && (
          <button onClick={exitPillar} style={{
            pointerEvents: 'auto', padding: '12px 24px', background: 'white', 
            border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: 'fit-content'
          }}>
            BACK TO MAP
          </button>
        )}
      </div>

      {view === 'focus' && categoryTasks.length > 0 && (
        <BrainDumpInput categoryTasks={categoryTasks} />
      )}
    </>
  );
};

// ... keep your default App() export exactly the same ...
export default function App() {
  const view = useStore((state) => state.view);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} camera={{ position: [0, 2, 8], fov: 45 }}>
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