import { create } from 'zustand';
import { type ForceGraphInstance, type NodeObject, type LinkObject } from 'force-graph';

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
}

export const useStore = create<Store>((set) => ({
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
}));

useStore.subscribe(
  (state) => {
    console.log("New state", state);
  });
