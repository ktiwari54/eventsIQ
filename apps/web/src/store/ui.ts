import { create } from "zustand";

// Lightweight global UI state (sidebar, active filters). Server data lives in
// React Query — Zustand holds only ephemeral client UI state.
interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  leadFilter: { grade?: string; heat?: string };
  setLeadFilter: (f: Partial<UiState["leadFilter"]>) => void;
}

export const useUi = create<UiState>((set) => ({
  // Mobile drawer state (desktop sidebar is always visible via CSS).
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  leadFilter: {},
  setLeadFilter: (f) => set((s) => ({ leadFilter: { ...s.leadFilter, ...f } })),
}));
