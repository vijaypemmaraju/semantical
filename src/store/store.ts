import create from "zustand";
import { persist } from "zustand/middleware";
import {
  type ForceGraphInstance,
  type NodeObject,
  type LinkObject,
} from "force-graph";

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
      ],
    }
  )
);

useStore.subscribe((state) => {
  console.log("New state", state);
});
