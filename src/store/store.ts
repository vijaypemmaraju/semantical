import create from "zustand";
import { persist } from "zustand/middleware";
import {
  type ForceGraphInstance,
  type NodeObject,
  type LinkObject,
} from "force-graph";
import { intervalToDuration } from "date-fns";

type Store = {
  graph: ForceGraphInstance | null;
  nodes: NodeObject[];
  links: LinkObject[];
  won: boolean;
  start: string;
  current: string;
  goal: string;
  capturing: boolean;
  lock: boolean;
  clicks: number;
  imageDataUrl: string;
  dailyStreak: number;
  totalPlayed: number;
  maxDailyStreak: number;
  lastCompletedDay: string | null;
  path: string[];
  pathIndex: number;
  hintsLeft: number;
  win: () => void;
  resetDaily: () => void;
  resetFull: () => void;
};

export const useStore = create<Store>(
  persist(
    (set, get) => ({
      graph: null,
      nodes: [],
      links: [],
      won: false,
      start: "",
      current: "",
      goal: "",
      capturing: false,
      lock: false,
      clicks: 0,
      imageDataUrl: "",
      dailyStreak: 0,
      totalPlayed: 0,
      maxDailyStreak: 0,
      lastCompletedDay: null,
      path: [],
      pathIndex: 0,
      hintsLeft: 3,
      win: () => {
        set((state) => ({
          won: true,
          clicks: state.clicks + 1,
          dailyStreak: state.dailyStreak + 1,
          lastCompletedDay: new Date().toLocaleDateString(),
          totalPlayed: state.totalPlayed + 1,
          maxDailyStreak: Math.max(state.maxDailyStreak, state.dailyStreak + 1),
        }));
      },
      resetDaily: () => {
        set((state) => ({
          won: false,
          clicks: 0,
          imageDataUrl: "",
          path: [],
          pathIndex: 0,
          hintsLeft: 3,
        }));
      },
      resetFull: () => {
        set((state) => ({
          won: false,
          clicks: 0,
          imageDataUrl: "",
          path: [],
          pathIndex: 0,
          hintsLeft: 3,
          dailyStreak: 0,
          lastCompletedDay: null,
          totalPlayed: 0,
          maxDailyStreak: 0,
        }));
      },
    }),
    {
      name: "store",
      whitelist: [
        "dailyStreak",
        "totalPlayed",
        "maxDailyStreak",
        "lastCompletedDay",
        "won",
        "clicks",
        "imageDataUrl",
      ],
    }
  )
);

const lastCompletedDay = useStore.getState().lastCompletedDay;
if (lastCompletedDay && lastCompletedDay !== new Date().toLocaleDateString()) {
  useStore.getState().resetDaily();
  const currentDay = new Date().toLocaleDateString();
  const lastCompletedDay = useStore.getState().lastCompletedDay;
  // use date-fns to calculate the difference between the two dates
  const duration = intervalToDuration({
    start: new Date(lastCompletedDay!),
    end: new Date(currentDay),
  });

  // if the difference is more than one day, reset the full streak
  if (duration.days && duration.days > 1) {
    useStore.setState({ dailyStreak: 0 });
  }
} else if (
  lastCompletedDay === new Date().toLocaleDateString() &&
  !useStore.getState().won
) {
  useStore.getState().resetDaily();
}

(window as any).useStore = useStore;

useStore.subscribe((state) => {
  // console.log("New state", state);
});
