import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { LayoutAPI, LayoutConfiguration, CreateLayoutPayload, UpdateLayoutPayload } from '@/services/api/layout';

interface LayoutConfigState {
  serverLayouts: LayoutConfiguration[];
  defaultLayout: LayoutConfiguration | null;
  selectedLayout: LayoutConfiguration | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchServerLayouts: (type?: 'bigscreen' | 'frontend' | 'admin') => Promise<void>;
  fetchDefaultLayout: (type?: 'bigscreen' | 'frontend' | 'admin') => Promise<void>;
  setSelectedLayout: (layout: LayoutConfiguration | null) => void;
  createServerLayout: (payload: CreateLayoutPayload) => Promise<LayoutConfiguration | null>;
  updateServerLayout: (id: string, payload: UpdateLayoutPayload) => Promise<LayoutConfiguration | null>;
  deleteServerLayout: (id: string) => Promise<boolean>;
  setAsDefaultLayout: (id: string, type?: 'bigscreen' | 'frontend' | 'admin') => Promise<boolean>;
  reset: () => void;
}

export const useLayoutConfigStore = create<LayoutConfigState>()(
  subscribeWithSelector((set, get) => ({
    serverLayouts: [],
    defaultLayout: null,
    selectedLayout: null,
    loading: false,
    error: null,

    fetchServerLayouts: async (type = 'bigscreen') => {
      set({ loading: true, error: null });
      try {
        const layouts = await LayoutAPI.getLayouts(type);
        set({ serverLayouts: layouts, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '获取服务端布局列表失败',
          loading: false,
        });
      }
    },

    fetchDefaultLayout: async (type = 'bigscreen') => {
      set({ loading: true, error: null });
      try {
        const defaultLayout = await LayoutAPI.getDefault(type);
        set({
          defaultLayout,
          selectedLayout: defaultLayout || get().selectedLayout,
          loading: false
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '获取默认布局失败',
          loading: false,
        });
      }
    },

    setSelectedLayout: (layout) => {
      set({ selectedLayout: layout });
    },

    createServerLayout: async (payload) => {
      set({ loading: true, error: null });
      try {
        const newLayout = await LayoutAPI.create(payload);
        const { serverLayouts } = get();
        set({
          serverLayouts: [newLayout, ...serverLayouts],
          loading: false,
        });
        return newLayout;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '创建服务端布局失败',
          loading: false,
        });
        return null;
      }
    },

    updateServerLayout: async (id, payload) => {
      set({ loading: true, error: null });
      try {
        const updatedLayout = await LayoutAPI.update(id, payload);
        const { serverLayouts, selectedLayout } = get();
        set({
          serverLayouts: serverLayouts.map(l => l.id === id ? updatedLayout : l),
          selectedLayout: selectedLayout?.id === id ? updatedLayout : selectedLayout,
          loading: false,
        });
        return updatedLayout;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '更新服务端布局失败',
          loading: false,
        });
        return null;
      }
    },

    deleteServerLayout: async (id) => {
      set({ loading: true, error: null });
      try {
        await LayoutAPI.delete(id);
        const { serverLayouts, selectedLayout } = get();
        set({
          serverLayouts: serverLayouts.filter(l => l.id !== id),
          selectedLayout: selectedLayout?.id === id ? null : selectedLayout,
          loading: false,
        });
        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '删除服务端布局失败',
          loading: false,
        });
        return false;
      }
    },

    setAsDefaultLayout: async (id, type = 'bigscreen') => {
      set({ loading: true, error: null });
      try {
        const updatedLayout = await LayoutAPI.setAsDefault(id, type);
        const { serverLayouts } = get();
        set({
          serverLayouts: serverLayouts.map(l => ({
            ...l,
            isDefault: l.id === id,
          })),
          defaultLayout: updatedLayout,
          loading: false,
        });
        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '设置默认布局失败',
          loading: false,
        });
        return false;
      }
    },

    reset: () => {
      set({
        serverLayouts: [],
        defaultLayout: null,
        selectedLayout: null,
        loading: false,
        error: null,
      });
    },
  }))
);
