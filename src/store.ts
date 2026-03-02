import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Category = 'Work' | 'Health' | 'Fitness' | 'Study' | 'Hobbies' | 'Admin';
export type Gear = 1 | 2 | 3;

export interface Tile {
  id: string;
  title: string;
  category: Category;
  color: string;
  gear: Gear;             // 1 (Micro), 2 (Standard), 3 (Monolith)
  parentId: string | null; // Null if it's a top-level task
  isCompleted: boolean;   // True = on the Trophy Floor
  isSidetracked: boolean; // True = parked in the Sidecar
  isChopped: boolean;     // True = broken down (hidden from active belt)
  createdAt: number;      // Keeps the conveyor belt strictly ordered
}

interface AppState {
  tiles: Tile[];
  xp: number;
  view: 'world' | 'focus';
  activeCategory: Category | null;
  
  // The Pure Focus Actions
  addTiles: (titles: string[], category: Category, color: string, gear: Gear, parentId?: string | null) => void;
  completeTile: (id: string) => void;
  toggleSidetrack: (id: string) => void;
  chopTile: (parentId: string, childTitles: string[]) => void;
  
  // Navigation
  enterPillar: (category: Category) => void;
  exitPillar: () => void;
}

// Helper for default colors
const categoryColors: Record<Category, string> = {
  Work: '#00a1e0', Health: 'indigo', Fitness: 'gold', 
  Study: '#4ecdc4', Hobbies: '#ff6b6b', Admin: 'orange'
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // We start with a completely empty Master Queue
      tiles: [],
      xp: 0,
      view: 'world',
      activeCategory: null,
      
      // 1. ADD TILES: Injects new tasks into the end of the Master Belt
      addTiles: (titles, category, color, gear = 2, parentId = null) => set((state) => {
        const newTiles: Tile[] = titles.map((title, index) => ({
          id: `tile-${Date.now()}-${index}`,
          title, category, color, gear, parentId,
          isCompleted: false, isSidetracked: false, isChopped: false,
          createdAt: Date.now() + index,
        }));
        return { tiles: [...state.tiles, ...newTiles] };
      }),

      // 2. COMPLETE TILE: Drops it to the Trophy Floor and grants XP based on Gear
      completeTile: (id) => set((state) => {
        const updatedTiles = state.tiles.map(tile => 
          tile.id === id ? { ...tile, isCompleted: true, isSidetracked: false } : tile
        );
        const completedTile = state.tiles.find(t => t.id === id);
        const xpReward = completedTile ? (completedTile.gear * 25) : 0; // Gear 1 = 25XP, Gear 3 = 75XP
        
        return { tiles: updatedTiles, xp: state.xp + xpReward };
      }),

      // 3. SIDETRACK TILE: Moves it between the Master Belt and the Sidecar
      toggleSidetrack: (id) => set((state) => ({
        tiles: state.tiles.map(tile => 
          tile.id === id ? { ...tile, isSidetracked: !tile.isSidetracked } : tile
        )
      })),

      // 4. CHOP TILE: Decrements Gear, inherits Sidecar status, and micro-slots into the timeline
      // 4. CHOP TILE: Decrements Gear, inherits Sidecar status, and micro-slots into the timeline
      chopTile: (parentId, childTitles) => set((state) => {
        const parent = state.tiles.find(t => t.id === parentId);
        if (!parent || parent.gear <= 1) return state;

        const updatedTiles = state.tiles.map(t => 
          t.id === parentId ? { ...t, isChopped: true } : t
        );

        const childGear = (parent.gear - 1) as Gear;

        // THE FIX: Exponentially smaller decimals prevent collisions!
        // Gear 2 children get spaced by .001. Gear 1 children get spaced by .000001.
        const spacing = childGear === 2 ? 0.001 : 0.000001;

        const children: Tile[] = childTitles.map((title, index) => ({
          id: `child-${Date.now()}-${index}`,
          title, category: parent.category, color: parent.color, 
          gear: childGear, parentId: parent.id, 
          isCompleted: false, isChopped: false,
          isSidetracked: parent.isSidetracked, 
          
          // Micro-slotting ensures children stay physically "inside" their parent's spot
          createdAt: parent.createdAt + ((index + 1) * spacing), 
        }));

        return { tiles: [...updatedTiles, ...children] };
      }),

      enterPillar: (category) => set({ view: 'focus', activeCategory: category }),
      exitPillar: () => set({ view: 'world', activeCategory: null }),
    }),
    {
      name: 'life-accelerator-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);