import type { LayoutArea, LayoutConfig } from "../../stores/useLayoutStore";

export function areasFromLayout(layout: LayoutConfig): LayoutArea[] {
  return layout.areas || layout.items?.map(item => ({
    id: item.id,
    name: typeof item.component === 'string' ? item.component : item.component.name,
    title: typeof item.component === 'string' ? item.component : item.component.name,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    component: typeof item.component === 'string' ? item.component : null,
    props: item.props
  })) || [];
}

export function itemsFromAreas(areas: LayoutArea[]): LayoutConfig['items'] {
  return areas.map((area) => ({
    id: area.id,
    x: area.x,
    y: area.y,
    w: area.w,
    h: area.h,
    component: area.component || 'EmptyWidget',
    props: area.props || {}
  }));
}

export function createCustomLayoutConfig(
  areas: LayoutArea[],
  config: { cols: number; name: string; description: string }
): LayoutConfig {
  return {
    id: "layout-" + Date.now(),
    name: config.name,
    description: config.description,
    items: itemsFromAreas(areas),
    cols: config.cols,
    rowHeight: 100,
    gap: 16,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    areas,
    thumbnail: "🎨",
    category: "custom"
  };
}

export function createUpdatedLayoutConfig(
  selectedLayout: LayoutConfig,
  layoutAreas: LayoutArea[]
): LayoutConfig {
  return {
    ...selectedLayout,
    items: itemsFromAreas(layoutAreas),
    areas: layoutAreas,
    updatedAt: new Date().toISOString()
  };
}
