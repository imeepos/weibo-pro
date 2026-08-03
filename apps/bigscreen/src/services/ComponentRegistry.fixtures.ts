import React from 'react';
import type { ComponentConfig } from '../types/layout';

export function createTestComponent(label = 'Test'): React.FC {
  const Comp: React.FC = () => React.createElement('div', null, label);
  Comp.displayName = label;
  return Comp;
}

export function createConfig(overrides: Partial<ComponentConfig> = {}): ComponentConfig {
  return {
    displayName: 'Test Component',
    category: 'test',
    description: 'A test component',
    icon: '🧪',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 8, h: 6 },
    defaultProps: {},
    ...overrides,
  };
}

export const createConfig1 = () => createConfig({
  displayName: 'Test Component 1',
  description: 'First test component',
  icon: '1️⃣',
});

export const createConfig2 = () => createConfig({
  displayName: 'Test Component 2',
  category: 'analytics',
  description: 'Second test component',
  icon: '2️⃣',
});

export const analyticsConfig = () => createConfig({
  displayName: 'Analytics Component',
  category: 'analytics',
  description: 'Analytics component',
  icon: '📊',
});
