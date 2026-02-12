import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { FocusCone } from './Cone';
import { useStore } from './store';

const UI = () => {
  const xp = useStore((state) => state.xp);
  
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: 'white',
      fontFamily: 'monospace',
      zIndex: 10,
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      <h1 style={{ margin: 0 }}>LIFE ACCELERATOR</h1>
      <h2 style={{ margin: 0, color: '#00a1e0' }}>XP: {xp}</h2>
    </div>
  );
}

function App() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#111' }}>
      <UI />
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars />
        <FocusCone />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;