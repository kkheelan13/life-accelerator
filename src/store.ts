import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export type Gear = 1 | 2 | 3;

export interface Tile {
  id: string;
  title: string;
  category: string;
  color: string;
  gear: Gear;
  parentId?: string;
  isCompleted: boolean;
  isChopped: boolean;
  isSidetracked: boolean;
  createdAt: number;
}

interface AppState {
  tiles: Tile[];
  xp: number;
  view: 'world' | 'focus';
  activeCategory: string | null;
  zenMode: boolean;
  
  // The Cloud Functions
  fetchTiles: () => Promise<void>;
  receiveRealtimeTile: (newTile: Tile) => void;
  
  // UI Navigation
  setCategory: (category: string) => void;
  exitPillar: () => void;
  toggleZenMode: () => void;
  
  // The Data Mutations (The updated contract!)
  addTile: (title: string, gear: Gear, color: string) => void;
  completeTile: (id: string) => void;
  toggleSidetrack: (id: string) => void;
  chopTile: (parentId: string, childTitles: string[]) => void;
  editTile: (id: string, newTitle: string) => void;
  deleteTile: (id: string) => void;
}

// Notice the (set, get) here! This fixes the 'get' error.
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tiles: [],
      xp: 0,
      view: 'world',
      activeCategory: null,
      zenMode: false,

      setCategory: (category) => set({ view: 'focus', activeCategory: category }),
      exitPillar: () => set({ view: 'world', activeCategory: null }),
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),

      // --- CLOUD FETCHING ---
      fetchTiles: async () => {
        const { data, error } = await supabase.from('tiles').select('*');
        if (!error && data) {
          set({ tiles: data as Tile[] });
        } else if (error) {
          console.error("Supabase fetch error:", error);
        }
      },

      receiveRealtimeTile: (newTile) => set((state) => {
        if (state.tiles.some(t => t.id === newTile.id)) return state;
        return { tiles: [...state.tiles, newTile] };
      }),

      // --- TILE MUTATIONS ---
      addTile: async (title, gear, color) => {
        const state = get();
        if (!state.activeCategory) return;

        const newTile: Tile = {
          id: `tile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title, category: state.activeCategory, color, gear,
          isCompleted: false, isChopped: false, isSidetracked: false,
          createdAt: Date.now()
        };

        // Optimistic UI update
        set({ tiles: [...state.tiles, newTile] });

        // Cloud sync with console logs
        console.log("🚀 Attempting to save to Supabase:", newTile);
        const { data, error } = await supabase.from('tiles').insert([newTile]).select();
        
        if (error) {
          console.error("❌ SUPABASE INSERT ERROR:", error.message, error.details);
        } else {
          console.log("✅ Successfully saved to Supabase:", data);
        }
      },

      completeTile: async (id) => {
        const state = get();
        const tile = state.tiles.find(t => t.id === id);
        if (!tile || tile.isCompleted) return;

        set({ 
          tiles: state.tiles.map(t => t.id === id ? { ...t, isCompleted: true } : t),
          xp: state.xp + (tile.gear * 10) 
        });
        await supabase.from('tiles').update({ isCompleted: true }).eq('id', id);
      },

      toggleSidetrack: async (id) => {
        const state = get();
        const targetTile = state.tiles.find(t => t.id === id);
        if (!targetTile) return;

        const newSidetrackState = !targetTile.isSidetracked;
        const getRootId = (tileId: string): string => {
          const t = state.tiles.find(t => t.id === tileId);
          if (!t || !t.parentId) return tileId;
          return getRootId(t.parentId);
        };
        const targetRootId = getRootId(id);

        const familyIds: string[] = [];
        const updatedTiles = state.tiles.map(t => {
          if (getRootId(t.id) === targetRootId) {
            familyIds.push(t.id);
            return { ...t, isSidetracked: newSidetrackState };
          }
          return t;
        });

        set({ tiles: updatedTiles });
        await supabase.from('tiles').update({ isSidetracked: newSidetrackState }).in('id', familyIds);
      },

      chopTile: async (parentId, childTitles) => {
        const state = get();
        const parent = state.tiles.find(t => t.id === parentId);
        if (!parent || parent.gear <= 1) return;

        const childGear = (parent.gear - 1) as Gear;
        const spacing = childGear === 2 ? 0.001 : 0.000001;

        const children: Tile[] = childTitles.map((title, index) => ({
          id: `child-${Date.now()}-${index}`,
          title, category: parent.category, color: parent.color, 
          gear: childGear, parentId: parent.id, 
          isCompleted: false, isChopped: false,
          isSidetracked: parent.isSidetracked, 
          createdAt: parent.createdAt + ((index + 1) * spacing), 
        }));

        const updatedTiles = state.tiles.map(t => 
          t.id === parentId ? { ...t, isChopped: true } : t
        );

        set({ tiles: [...updatedTiles, ...children] });
        await supabase.from('tiles').update({ isChopped: true }).eq('id', parentId);
        await supabase.from('tiles').insert(children);
      },

      editTile: async (id, newTitle) => {
        set((state) => ({
          tiles: state.tiles.map(t => t.id === id ? { ...t, title: newTitle } : t)
        }));
        await supabase.from('tiles').update({ title: newTitle }).eq('id', id);
      },

      deleteTile: async (id) => {
        const state = get();
        const getDescendants = (parentId: string): string[] => {
          const children = state.tiles.filter(t => t.parentId === parentId).map(t => t.id);
          return [...children, ...children.flatMap(getDescendants)];
        };
        
        const hitList = Array.from(new Set([id, ...getDescendants(id)]));
        
        set({ tiles: state.tiles.filter(t => !hitList.includes(t.id)) });
        await supabase.from('tiles').delete().in('id', hitList);
      },
    }),
    {
      name: 'orbital-command-storage',
      partialize: (state) => ({ 
        xp: state.xp, 
        view: state.view, 
        activeCategory: state.activeCategory, 
        zenMode: state.zenMode 
      }),
    }
  )
);