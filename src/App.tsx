import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { FocusCone } from './Cone';
import { WorldMap } from './World'; // Import the new component
import { useStore } from './store';

const UI = () => {
  const { xp, view, exitPillar, activeCategory } = useStore();
  
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', padding: '20px',
      pointerEvents: 'none', zIndex: 10, display: 'flex', justifyContent: 'space-between'
    }}>
      <div>
        <h1 style={{ margin: 0, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {view === 'world' ? 'MY WORLD' : activeCategory?.toUpperCase()}
        </h1>
        <h3 style={{ margin: 0, color: '#00a1e0' }}>XP: {xp}</h3>
      </div>
      
      {/* Back Button (Only visible in Focus Mode) */}
      {view === 'focus' && (
        <button 
          onClick={exitPillar}
          style={{
            pointerEvents: 'auto', padding: '10px 20px', background: 'white', 
            border: 'none', borderRadius: '20px', fontWeight: 'bold'
          }}
        >
          BACK TO MAP
        </button>
      )}
    </div>
  );
}

function App() {
  const view = useStore((state) => state.view);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#111' }}>
      <UI />
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars />
        
        {/* CONDITIONAL RENDERING */}
        {view === 'world' ? <WorldMap /> : <FocusCone />}
        
        <OrbitControls 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2} // Don't go below the floor
        />
      </Canvas>
    </div>
  );
}

export default App;