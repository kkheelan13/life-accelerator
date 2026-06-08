import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { useStore, liveStreak, type Tile } from './store';
import { WorldMap } from './World';
import { TileBoard } from './components/TileBoard';
import { supabase } from './supabase';

const categoryColors: Record<string, string> = {
  WORK: '#00e6ff', PERSONAL: '#4ade80', PROJECTS: '#ff0055',
  Work: '#00a1e0', Health: 'indigo', Running: 'gold',
  Study: '#4ecdc4', Hobbies: '#ff6b6b', Admin: 'orange'
};

// --- 2D BOARD OVERLAY ---
// Floats a flat HTML board on top of the (dimmed/blurred) live 3D scene, so
// sub-pages feel like a console panel hovering in orbit while staying usable.
const BoardOverlay = () => {
  const { view, activeCategory, tiles, routeTile } = useStore();

  if (view === 'admin') {
    // Inbox triage: any un-triaged task. A tile counts as "in the inbox" when its
    // section is 'admin' OR missing entirely — externally-inserted rows (MacroDroid)
    // and legacy rows predating the section column have a null/empty section.
    const inboxTiles = tiles.filter(t => !t.section || t.section === 'admin');
    return (
      <div className="board-overlay">
        <div className="board-overlay__inner">
          <p className="board-overlay__hint">
            Drag to prioritise · route to deploy · ⌘E edit · ⌘D delete (hover a tile)
          </p>
          <TileBoard
            tiles={inboxTiles}
            onRoute={routeTile}
            emptyMessage="No raw data. Inbox zero achieved."
          />
        </div>
      </div>
    );
  }

  // Focus board for a single category — only its active-grid (deployed) tasks.
  const focusTiles = tiles.filter(
    t => t.category === activeCategory && t.section !== 'admin' && !t.isChopped,
  );
  return (
    <div className="board-overlay">
      <div className="board-overlay__inner">
        <p className="board-overlay__hint">
          Click to complete · right-click to chop · ⌘E edit · ⌘D delete · drag to prioritise · ☆ spotlight
        </p>
        <TileBoard
          tiles={focusTiles}
          emptyMessage="No active tasks here. Route some from the Inbox."
        />
      </div>
    </div>
  );
};

const BrainDumpInput = ({ activeCategory }: { activeCategory: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const addTile = useStore((state) => state.addTile); 
  const activeColor = categoryColors[activeCategory] || '#00e6ff'; 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      lines.forEach(line => addTile(line, 3, activeColor)); 
      setText('');
      setIsOpen(false); 
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,20,0.8)', color: 'white', border: `1px solid ${activeColor}`, padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', pointerEvents: 'auto', zIndex: 100, backdropFilter: 'blur(5px)' }}>
        + ADD RAW DATA
      </button>
    );
  }

  return (
    <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '600px', pointerEvents: 'auto', zIndex: 100, background: 'rgba(10, 10, 10, 0.95)', padding: '15px', borderRadius: '12px', border: `1px solid ${activeColor}`, backdropFilter: 'blur(10px)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: activeColor, fontWeight: 'bold', fontFamily: '"Geist", monospace' }}>FAST CAPTURE</div>
          <button type="button" onClick={() => setIsOpen(false)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>CLOSE</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Drops directly into Admin Inbox" rows={3} style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontFamily: 'monospace', fontSize: '1rem', resize: 'none', outline: 'none' }} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e); }} autoFocus />
        <button type="submit" style={{ background: activeColor, color: '#000', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Geist", monospace' }}>SEND TO CLOUD</button>
      </form>
    </div>
  );
};

const UI = () => {
  const { xp, view, exitPillar, openAdmin, activeCategory, streaks } = useStore();

  // Live (decay-aware) streak for the area currently in focus
  const live = view === 'focus' && activeCategory ? liveStreak(streaks[activeCategory]) : 0;

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '30px', pointerEvents: 'none', zIndex: 50, display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        
        {/* LEFT SIDE */}
        <div style={{ color: 'white', fontFamily: '"Geist", monospace', pointerEvents: 'auto' }}>
          <h1 style={{ margin: 0, letterSpacing: '-1px', cursor: 'pointer' }} onClick={exitPillar}>
            {view === 'admin' ? 'SYSTEM TRIAGE' : view === 'world' ? 'ORBITAL COMMAND' : activeCategory?.toUpperCase()}
          </h1>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px', letterSpacing: '1px' }}>v0.5.0 (2D Boards)</div>
          <div style={{ color: '#00a1e0', fontWeight: 'bold', marginTop: '8px' }}>XP: {xp}</div>
          {view === 'focus' && live > 0 && (
            <div style={{ color: '#ff9900', fontWeight: 'bold', marginTop: '4px' }}>
              🔥 STREAK: {live} {live === 1 ? 'DAY' : 'DAYS'}
            </div>
          )}
        </div>
        
        {/* RIGHT SIDE NAV */}
        <div style={{ display: 'flex', gap: '15px', pointerEvents: 'auto', alignItems: 'flex-start' }}>
          {view !== 'admin' && (
            <button onClick={openAdmin} style={{ padding: '12px 24px', background: 'transparent', color: '#4ecdc4', border: '1px solid #4ecdc4', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Geist", monospace' }}>
              📥 INBOX
            </button>
          )}
          {view === 'focus' && (
            <button onClick={exitPillar} style={{ padding: '12px 24px', background: 'white', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Geist", monospace' }}>MAP</button>
          )}
          {view === 'admin' && (
             <button onClick={exitPillar} style={{ padding: '12px 24px', background: 'white', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Geist", monospace' }}>LAUNCH 3D GRID</button>
          )}
        </div>
      </div>
      {view === 'focus' && activeCategory && <BrainDumpInput activeCategory={activeCategory} />}
    </>
  );
};

export default function App() {
  const { view, fetchTiles, fetchStreaks, receiveRealtimeTile } = useStore();

  useEffect(() => {
    fetchTiles();
    fetchStreaks();
    const subscription = supabase
      .channel('public:tiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tiles' }, (payload) => {
        receiveRealtimeTile(payload.new as Tile);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [fetchTiles, fetchStreaks, receiveRealtimeTile]);

  // The 3D world is the always-on "shell". On sub-pages it stays rendered as a
  // live, dimmed/blurred backdrop behind the floating 2D board.
  const onBoard = view !== 'world';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          transition: 'filter 0.6s ease, opacity 0.6s ease',
          filter: onBoard ? 'blur(6px) brightness(0.45)' : 'none',
          opacity: onBoard ? 0.6 : 1,
          pointerEvents: onBoard ? 'none' : 'auto',
        }}
      >
        <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 4, 12], fov: 45 }}>
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
            <WorldMap />
            <OrbitControls enablePan={false} minDistance={3} maxDistance={20} makeDefault />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      {/* 2D board floats over the live 3D backdrop on sub-pages */}
      {onBoard && <BoardOverlay />}

      <UI />
    </div>
  );
}