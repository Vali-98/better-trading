import { create } from "zustand";
export const enhancerIds = [
  "equivalent-pricings",
  "highlight-stat-filters",
  "maximum-sockets",
  "regroup-similars",
] as const;
export interface PinnedItem {
  id: string;
  pinnedAt: string;
  node: HTMLElement;
}
export const useResultsStore = create<{
  pinned: PinnedItem[];
  disabled: string[];
  setPinned: (pinned: PinnedItem[]) => void;
  toggle: (id: string) => void;
}>((set) => ({
  pinned: [],
  disabled: (localStorage.getItem("bt-disabled-enhancers") ?? "")
    .split(",")
    .filter(Boolean),
  setPinned: (pinned) => set({ pinned }),
  toggle: (id) =>
    set((state) => {
      const disabled = state.disabled.includes(id)
        ? state.disabled.filter((value) => value !== id)
        : [...state.disabled, id];
      localStorage.setItem("bt-disabled-enhancers", disabled.join(","));
      return { disabled };
    }),
}));
