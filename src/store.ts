import { create } from 'zustand';

interface Task {
  id: number;
  title: string;
  color: string;
  category: string;
}

interface AppState {
  tasks: Task[];
  xp: number;
  completeTask: (id: number) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [
    { id: 1, title: "Sudarshan Kriya", color: "gold", category: 'Fitness' },
    { id: 2, title: "LWC Study", color: "#00a1e0", category: 'Work' },
    { id: 3, title: "8 Hours Sleep", color: "indigo", category: 'Health' },
  ],
  xp: 0,
  completeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
    xp: state.xp + 100
  })),
}));