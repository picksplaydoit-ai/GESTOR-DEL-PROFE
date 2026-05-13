import { create } from 'zustand';
import { Group, Student } from './types';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: any) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ user: null, profile: null }),
}));

export type View = 'dashboard' | 'groups' | 'group-detail' | 'students' | 'teams' | 'activities' | 'attendance' | 'rubrics' | 'analytics' | 'settings' | 'planning' | 'material-viewer';

interface AppState {
  view: View;
  activeGroup: Group | null;
  groups: Group[];
  activeMaterialId: string | null;
  setView: (view: View) => void;
  setActiveGroup: (group: Group | null) => void;
  setGroups: (groups: Group[]) => void;
  setActiveMaterialId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  activeGroup: null,
  groups: [],
  activeMaterialId: null,
  setView: (view) => set({ view }),
  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setGroups: (groups) => set({ groups }),
  setActiveMaterialId: (activeMaterialId) => set({ activeMaterialId }),
}));
