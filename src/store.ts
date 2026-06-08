import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export type Gear = 1 | 2 | 3;

// --- Streak helpers (module scope, pure functions) ---
// Store completion as a LOCAL day string ('YYYY-MM-DD'), never a raw timestamp,
// to avoid DST/timezone off-by-one bugs in day-gap math.
export const localDayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Whole-day difference (bKey - aKey) computed at LOCAL midnight.
export const dayGap = (aKey: string, bKey: string): number => {
  const a = new Date(`${aKey}T00:00:00`); // local midnight (no 'Z')
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};

export interface Streak {
  category: string;
  currentStreak: number;
  lastCompletedDate: string | null; // 'YYYY-MM-DD' local, null until first completion
}

// On completion: gap 0 = no change (already counted today); gap 1 or 2 = increment
// (grace forgives a single missed day); gap >= 3 = reset to 1; no prior date = 1.
export const nextStreak = (prev: { currentStreak: number; lastCompletedDate: string | null }) => {
  const today = localDayKey();
  if (!prev.lastCompletedDate) return { currentStreak: 1, lastCompletedDate: today };
  const gap = dayGap(prev.lastCompletedDate, today);
  if (gap === 0) return prev;
  if (gap <= 2) return { currentStreak: prev.currentStreak + 1, lastCompletedDate: today };
  return { currentStreak: 1, lastCompletedDate: today };
};

// Derived display value: a streak gone stale (gap >= 3) shows as 0 without
// mutating the DB. The stored value is corrected on the next completion.
export const liveStreak = (s: { currentStreak: number; lastCompletedDate: string | null } | undefined): number => {
  if (!s?.lastCompletedDate) return 0;
  return dayGap(s.lastCompletedDate, localDayKey()) <= 2 ? s.currentStreak : 0;
};

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
  section: string; // <-- Routing property: 'admin' | 'active' | 'someday'
  sortIndex?: number; // <-- NEW: manual priority order on the 2D board (lower = higher priority)
}

// Spotlight is "what I'm focusing on today" — it resets each local day and is
// capped so the board nudges toward a couple of tasks at a time.
export const SPOTLIGHT_CAP = 3;

interface AppState {
  tiles: Tile[];
  xp: number;
  view: 'world' | 'focus' | 'admin'; // <-- NEW: 'admin' view added
  activeCategory: string | null;
  zenMode: boolean;
  streaks: Record<string, Streak>; // <-- per-category streaks, keyed by category

  // --- 2D board state ---
  spotlightIds: string[];   // tile ids spotlighted for today (rest blur out)
  spotlightDay: string;     // local day key the spotlight belongs to; clears on a new day

  fetchTiles: () => Promise<void>;
  fetchStreaks: () => Promise<void>;
  receiveRealtimeTile: (newTile: Tile) => void;

  setCategory: (category: string) => void;
  exitPillar: () => void;
  openAdmin: () => void;
  toggleZenMode: () => void;

  addTile: (title: string, gear: Gear, color: string) => void;
  completeTile: (id: string) => void;
  toggleSidetrack: (id: string) => void;
  chopTile: (parentId: string, childTitles: string[]) => void;
  editTile: (id: string, newTitle: string) => void;
  deleteTile: (id: string) => void;
  routeTile: (id: string, newSection: string) => void;

  // --- 2D board actions ---
  reorderTiles: (orderedIds: string[]) => void; // persist a new top-to-bottom priority order
  toggleSpotlight: (id: string) => void;         // add/remove a tile from today's focus set
  clearSpotlight: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tiles: [],
      xp: 0,
      view: 'admin', // Default to admin for triage
      activeCategory: null,
      zenMode: false,
      streaks: {},
      spotlightIds: [],
      spotlightDay: localDayKey(),

      setCategory: (category) => set({ view: 'focus', activeCategory: category }),
      exitPillar: () => set({ view: 'world', activeCategory: null }),
      openAdmin: () => set({ view: 'admin', activeCategory: null }),
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),

      fetchTiles: async () => {
        const { data, error } = await supabase.from('tiles').select('*');
        if (error) {
          console.error('[fetchTiles] error:', error.message, '| code:', error.code);
        } else {
          set({ tiles: data as Tile[] });
        }
      },

      fetchStreaks: async () => {
        const { data, error } = await supabase.from('streaks').select('*');
        if (!error && data) {
          const map: Record<string, Streak> = {};
          for (const row of data as Streak[]) map[row.category] = row;
          set({ streaks: map });
        } else if (error) {
          console.error("Supabase streaks fetch error:", error);
        }
      },

      receiveRealtimeTile: (newTile) => set((state) => {
        if (state.tiles.some(t => t.id === newTile.id)) return state;
        return { tiles: [...state.tiles, newTile] };
      }),

      addTile: async (title, gear, color) => {
        const state = get();
        // Even if added from a category, default section to admin unless we change that logic later
        const createdAt = Date.now();
        const newTile: Tile = {
          id: `tile-${createdAt}-${Math.random().toString(36).substring(2, 9)}`,
          title, category: state.activeCategory || 'Inbox', color, gear,
          isCompleted: false, isChopped: false, isSidetracked: false,
          createdAt,
          section: 'admin', // Force all new tiles to the inbox first
          sortIndex: createdAt, // sort to the bottom until manually reordered
        };

        set({ tiles: [...state.tiles, newTile] });
        const { error } = await supabase.from('tiles').insert([newTile]).select();
        if (error) {
          console.error('[addTile] Supabase insert failed:', error.message, '| code:', error.code, '| hint:', error.hint);
        }
      },

      routeTile: async (id, newSection) => {
        // Optimistic UI Update
        set((state) => ({
          tiles: state.tiles.map(t => t.id === id ? { ...t, section: newSection } : t)
        }));
        // Cloud Update
        const { error } = await supabase.from('tiles').update({ section: newSection }).eq('id', id);
        if (error) console.error("Routing failed:", error);
      },

      // Persist a new top-to-bottom priority order. `orderedIds` is the visible
      // board order after a drag; we stamp each tile's sortIndex to match.
      reorderTiles: async (orderedIds) => {
        const state = get();
        const rank = new Map(orderedIds.map((id, i) => [id, i]));
        set({
          tiles: state.tiles.map(t =>
            rank.has(t.id) ? { ...t, sortIndex: rank.get(t.id)! } : t
          ),
        });
        // Push each changed index to the cloud (best-effort, fire-and-forget).
        await Promise.all(
          orderedIds.map((id, i) =>
            supabase.from('tiles').update({ sortIndex: i }).eq('id', id)
          )
        );
      },

      // Toggle a tile in/out of today's spotlight. Rolls the set over to a fresh
      // day if needed, and enforces the soft cap (oldest pick drops off).
      toggleSpotlight: (id) => set((state) => {
        const today = localDayKey();
        const base = state.spotlightDay === today ? state.spotlightIds : [];
        if (base.includes(id)) {
          return { spotlightIds: base.filter(x => x !== id), spotlightDay: today };
        }
        const next = [...base, id];
        // Drop the oldest pick once we exceed the cap.
        const capped = next.length > SPOTLIGHT_CAP ? next.slice(next.length - SPOTLIGHT_CAP) : next;
        return { spotlightIds: capped, spotlightDay: today };
      }),

      clearSpotlight: () => set({ spotlightIds: [], spotlightDay: localDayKey() }),

      completeTile: async (id) => {
        const state = get();
        const tile = state.tiles.find(t => t.id === id);
        if (!tile || tile.isCompleted) return; // guard prevents double-counting the streak

        // Compute the new per-category streak (grace period handled in nextStreak)
        const prev = state.streaks[tile.category] ?? { category: tile.category, currentStreak: 0, lastCompletedDate: null };
        const newStreak: Streak = { category: tile.category, ...nextStreak(prev) };

        set({
          tiles: state.tiles.map(t => t.id === id ? { ...t, isCompleted: true } : t),
          xp: state.xp + (tile.gear * 10),
          streaks: { ...state.streaks, [tile.category]: newStreak }, // optimistic
        });
        await supabase.from('tiles').update({ isCompleted: true }).eq('id', id);
        // upsert keyed on the category PK: insert-or-update in one call
        await supabase.from('streaks').upsert(newStreak, { onConflict: 'category' });
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
          section: parent.section // Inherit the section of the parent
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
        zenMode: state.zenMode,
        spotlightIds: state.spotlightIds,
        spotlightDay: state.spotlightDay,
      }),
    }
  )
);