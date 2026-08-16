import { create } from "zustand";
import { getHaloFile, repairSideStoneForBand, type Metal } from "./ring-config";
import type { RingSize } from "./ringSize";

export type RingState = {
  metal: Metal;
  band: string | null;
  shape: string | null;
  setting: string | null;
  halo: string | null;
  sideStone: string | null;
  carat: number;
  setMetal: (m: Metal) => void;
  setBand: (b: string) => void;
  setShape: (s: string) => void;
  setSetting: (s: string) => void;
  setHalo: (h: string | null) => void;
  setSideStone: (s: string | null) => void;
  setCarat: (c: number) => void;
  reset: () => void;

  // AR & sizer
  arOpen: boolean;
  setArOpen: (v: boolean) => void;
  sizerOpen: boolean;
  setSizerOpen: (v: boolean) => void;
  ringSize: RingSize | null;
  setRingSize: (s: RingSize | null) => void;

  // Guided client demo
  demoActive: boolean;
  demoStep: number; // 0..5 (metal, band, shape, setting, sizer, ar)
  demoLabel: string;
  startDemo: () => void;
  stopDemo: () => void;
  setDemoStep: (n: number, label?: string) => void;
};

const initial = {
  metal: "Platinum" as Metal,
  band: "Standard ring" as string | null,
  shape: "Round" as string | null,
  setting: "4 Prong" as string | null,
  halo: null as string | null,
  sideStone: null as string | null,
  carat: 1,
};

export const useRing = create<RingState>((set) => ({
  ...initial,
  setMetal: (metal) => set({ metal }),
  setBand: (band) =>
    set((state) => ({
      band,
      sideStone: repairSideStoneForBand(band, state.sideStone),
    })),
  setShape: (shape) =>
    set((state) => ({
      shape,
      halo: state.halo && getHaloFile(state.halo, shape) ? state.halo : null,
    })),
  setSetting: (setting) => set({ setting }),
  setHalo: (halo) =>
    set((state) => ({ halo: halo && getHaloFile(halo, state.shape) ? halo : null })),
  setSideStone: (sideStone) =>
    set((state) => ({
      sideStone: repairSideStoneForBand(state.band, sideStone),
    })),
  setCarat: (carat) => set({ carat }),
  reset: () => set({ ...initial, ringSize: null }),

  arOpen: false,
  setArOpen: (arOpen) => set({ arOpen }),
  sizerOpen: false,
  setSizerOpen: (sizerOpen) => set({ sizerOpen }),
  ringSize: null,
  setRingSize: (ringSize) => set({ ringSize }),

  demoActive: false,
  demoStep: 0,
  demoLabel: "",
  startDemo: () => set({ demoActive: true, demoStep: 0, demoLabel: "Starting demo…" }),
  stopDemo: () => set({ demoActive: false, demoStep: 0, demoLabel: "" }),
  setDemoStep: (demoStep, demoLabel) => set({ demoStep, demoLabel: demoLabel ?? "" }),
}));
