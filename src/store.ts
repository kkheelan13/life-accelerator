import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Category = 'Work' | 'Health' | 'Fitness' | 'Study' | 'Hobbies' | 'Admin';

interface Tile {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Task {
  id: number;
  title: string;
  color: string;
  category: Category;
  tiles: Tile[]; 
}

interface AppState {
  tasks: Task[];
  xp: number;
  view: 'world' | 'focus';
  activeCategory: Category | null;
  completeTile: (taskId: number, tileId: string) => void;
  addTiles: (taskId: number, newTitles: string[]) => void; // NEW: The Brain Dump
  enterPillar: (category: Category) => void;
  exitPillar: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Replace JUST the tasks array inside your store.ts with this:
      tasks: [
        { 
          id: 1, title: "LWC Project", category: 'Work', color: '#00a1e0',
          tiles: [
            { id: 'w1', title: 'Setup Repo', isCompleted: false },
          ]
        },
        { 
          id: 2, title: "Administrative", category: 'Admin', color: 'orange',
          tiles: [
            { id: 'a1', title: 'Email Filter', isCompleted: false },
          ]
        },
        { 
          id: 3, title: "Health Routine", category: 'Health', color: 'indigo',
          tiles: [
            { id: 'h1', title: 'Hydrate 1L', isCompleted: false },
          ]
        },
        // NEW: Empty base projects for your other pillars!
        { 
          id: 4, title: "Current Book", category: 'Study', color: '#4ecdc4',
          tiles: [] 
        },
        { 
          id: 5, title: "Guitar Practice", category: 'Hobbies', color: '#ff6b6b',
          tiles: [] 
        },
        { 
          id: 6, title: "Workout Plan", category: 'Fitness', color: 'gold',
          tiles: [] 
        }
      ],
      xp: 0,
      view: 'world',
      activeCategory: null,
      
      completeTile: (taskId, tileId) => set((state) => {
        const updatedTasks = state.tasks.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              tiles: task.tiles.map(tile => 
                tile.id === tileId ? { ...tile, isCompleted: true } : tile
              )
            };
          }
          return task;
        });
        return { tasks: updatedTasks, xp: state.xp + 25 };
      }),

      // NEW: Takes lines of text and turns them into 3D Tiles
      addTiles: (taskId, newTitles) => set((state) => {
        const newTileObjects = newTitles.map((title, index) => ({
          id: `tile-${Date.now()}-${index}`, // Unique ID
          title: title,
          isCompleted: false
        }));

        const updatedTasks = state.tasks.map(task => 
          task.id === taskId 
            ? { ...task, tiles: [...task.tiles, ...newTileObjects] } 
            : task
        );
        return { tasks: updatedTasks };
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