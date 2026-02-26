import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Category = 'Work' | 'Health' | 'Fitness' | 'Study' | 'Hobbies';

interface Task {
  id: number;
  title: string;
  category: Category;
  color: string;
}

interface AppState {
  tasks: Task[];
  xp: number;
  view: 'world' | 'focus'; // NEW: Track where we are
  activeCategory: Category | null; // NEW: Track which island is selected
  
  completeTask: (id: number) => void;
  enterPillar: (category: Category) => void; // NEW: Action to zoom in
  exitPillar: () => void; // NEW: Action to zoom out
  resetDay: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: [
        { id: 1, title: "Sudarshan Kriya", category: 'Fitness', color: 'gold' },
        { id: 2, title: "LWC Study", category: 'Work', color: '#00a1e0' },
        { id: 3, title: "8 Hours Sleep", category: 'Health', color: 'indigo' },
        { id: 4, title: "Guitar Practice", category: 'Hobbies', color: '#ff6b6b' },
        { id: 5, title: "Read 10 Pages", category: 'Study', color: '#4ecdc4' },
      ],
      xp: 0,
      view: 'world', // Start in World view
      activeCategory: null,

      completeTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        xp: state.xp + 100
      })),

      enterPillar: (category) => set({ view: 'focus', activeCategory: category }),
      exitPillar: () => set({ view: 'world', activeCategory: null }),

      resetDay: () => set({ 
        /* ... same reset logic ... */ 
      })
    }),
    {
      name: 'life-accelerator-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);