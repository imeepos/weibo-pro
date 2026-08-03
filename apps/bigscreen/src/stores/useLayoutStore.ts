import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type GridItem } from '../components/layout/index';
import {
  defaultLayout,
  defaultWidgets,
} from './useLayoutStore.defaults';
import type {
  LayoutConfig,
  LayoutStore,
} from './useLayoutStore.types';

export type {
  LayoutArea,
  LayoutConfig,
  LayoutTemplate,
  WidgetConfig,
  LayoutStore,
} from './useLayoutStore.types';

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      currentLayout: defaultLayout,
      savedLayouts: [defaultLayout],
      availableWidgets: defaultWidgets,
      isEditMode: false,

      setCurrentLayout: (layout) => {
        set({ currentLayout: layout });
      },

      updateCurrentLayout: (updates) => {
        const current = get().currentLayout;
        if (current) {
          const updated = {
            ...current,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          set({ currentLayout: updated });
        }
      },

      saveLayout: (layout) => {
        const { savedLayouts } = get();
        const existingIndex = savedLayouts.findIndex(l => l.id === layout.id);
        const updated = {
          ...layout,
          updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          const newLayouts = [...savedLayouts];
          newLayouts[existingIndex] = updated;
          set({ savedLayouts: newLayouts });
        } else {
          set({ savedLayouts: [...savedLayouts, updated] });
        }
      },

      deleteLayout: (layoutId) => {
        const { savedLayouts } = get();
        set({
          savedLayouts: savedLayouts.filter(l => l.id !== layoutId)
        });
      },

      loadLayout: (layoutId) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find(l => l.id === layoutId);
        if (layout) {
          set({ currentLayout: layout });
        }
      },

      addWidget: (widget) => {
        const { availableWidgets } = get();
        set({
          availableWidgets: [...availableWidgets, widget]
        });
      },

      removeWidget: (widgetId) => {
        const { availableWidgets } = get();
        set({
          availableWidgets: availableWidgets.filter(w => w.id !== widgetId)
        });
      },

      addGridItem: (item) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const newItem: GridItem = {
            ...item,
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };

          const updatedLayout = {
            ...currentLayout,
            items: [...currentLayout.items, newItem],
            updatedAt: new Date().toISOString()
          };

          set({ currentLayout: updatedLayout });
        }
      },

      updateGridItem: (itemId, updates) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedItems = currentLayout.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );

          const updatedLayout = {
            ...currentLayout,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };

          set({ currentLayout: updatedLayout });
        }
      },

      removeGridItem: (itemId) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedItems = currentLayout.items.filter(item => item.id !== itemId);

          const updatedLayout = {
            ...currentLayout,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };

          set({ currentLayout: updatedLayout });
        }
      },

      updateGridItems: (items) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedLayout = {
            ...currentLayout,
            items,
            updatedAt: new Date().toISOString()
          };

          set({ currentLayout: updatedLayout });
        }
      },

      toggleEditMode: () => {
        set((state) => ({ isEditMode: !state.isEditMode }));
      },

      setEditMode: (isEdit) => {
        set({ isEditMode: isEdit });
      },

      exportLayout: (layoutId) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find(l => l.id === layoutId);
        return layout ? JSON.stringify(layout, null, 2) : '';
      },

      importLayout: (layoutData) => {
        try {
          const layout: LayoutConfig = JSON.parse(layoutData);
          // 验证数据结构
          if (layout.id && layout.name && Array.isArray(layout.items)) {
            const { savedLayouts } = get();
            set({
              savedLayouts: [...savedLayouts, {
                ...layout,
                id: `imported-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }]
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      resetToDefault: () => {
        set({
          currentLayout: defaultLayout,
          savedLayouts: [defaultLayout],
          availableWidgets: defaultWidgets,
          isEditMode: false
        });
      }
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        currentLayout: state.currentLayout,
        savedLayouts: state.savedLayouts,
        availableWidgets: state.availableWidgets
      })
    }
  )
);
