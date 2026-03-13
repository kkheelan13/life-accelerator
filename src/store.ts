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
  zenMode: boolean;
  
  
  // The Pure Focus Actions
  toggleZenMode: () => void;
  addTiles: (titles: string[], category: Category, color: string, gear: Gear, parentId?: string | null) => void;
  completeTile: (id: string) => void;
  toggleSidetrack: (id: string) => void;
  chopTile: (parentId: string, childTitles: string[]) => void;
  deleteTile: (id: string) => void;
  editTile: (id: string, newTitle: string) => void;

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
      zenMode: false,
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
      
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
      // 3. SIDETRACK TILE: Moves the ENTIRE family tree between belts
      toggleSidetrack: (id) => set((state) => {
        const targetTile = state.tiles.find(t => t.id === id);
        if (!targetTile) return state;

        // Are we parking it, or bringing it back to the main belt?
        const newSidetrackState = !targetTile.isSidetracked;

        // Recursive helper to find the absolute Gear 3 Monolith of a family
        const getRootId = (tileId: string): string => {
          const tile = state.tiles.find(t => t.id === tileId);
          if (!tile || !tile.parentId) return tileId;
          return getRootId(tile.parentId);
        };

        const targetRootId = getRootId(id);

        // Map over ALL tiles. If they share the same Root Ancestor, they move together!
        const updatedTiles = state.tiles.map(tile => {
          if (getRootId(tile.id) === targetRootId) {
            return { ...tile, isSidetracked: newSidetrackState };
          }
          return tile;
        });

        return { tiles: updatedTiles };
      }),

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

      // 5. EDIT TILE: Renames a tile in place
      editTile: (id, newTitle) => set((state) => ({
        tiles: state.tiles.map(t => t.id === id ? { ...t, title: newTitle } : t)
      })),

      // 6. DELETE TILE: Vaporizes the tile and its entire family tree (No XP awarded)
      deleteTile: (id) => set((state) => {
        // Recursive hunter to find all descendants
        const getDescendants = (parentId: string): string[] => {
          const children = state.tiles.filter(t => t.parentId === parentId).map(t => t.id);
          return [...children, ...children.flatMap(getDescendants)];
        };
        
        // Build a hit-list of the target and every child beneath it
        const hitList = new Set([id, ...getDescendants(id)]);
        
        return { tiles: state.tiles.filter(t => !hitList.has(t.id)) };
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