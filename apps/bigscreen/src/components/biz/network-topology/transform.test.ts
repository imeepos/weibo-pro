import { describe, expect, it } from 'vitest';
import {
  buildEdgesArray,
  buildNodesArray,
  createEmptyStatistics,
  getMockTopologyData,
  getNodeLevel,
  normalizeTopologyData
} from './transform';
import type { TopologyData } from './types';

describe('getNodeLevel', () => {
  it('returns 10 for nodeSize >= 60 (MainHub)', () => {
    expect(getNodeLevel(60)).toBe(10);
    expect(getNodeLevel(260)).toBe(10);
  });

  it('returns 8 for nodeSize >= 40', () => {
    expect(getNodeLevel(40)).toBe(8);
    expect(getNodeLevel(59)).toBe(8);
  });

  it('returns 6 for nodeSize >= 25', () => {
    expect(getNodeLevel(25)).toBe(6);
    expect(getNodeLevel(39)).toBe(6);
  });

  it('returns 4 for small nodes', () => {
    expect(getNodeLevel(24)).toBe(4);
    expect(getNodeLevel(0)).toBe(4);
  });
});

describe('createEmptyStatistics', () => {
  it('returns all-zero statistics', () => {
    expect(createEmptyStatistics()).toEqual({
      efdTotal: 0,
      appTotal: 0,
      iotTotal: 0,
      cloudTotal: 0
    });
  });
});

describe('normalizeTopologyData', () => {
  it('wraps an array into { data }', () => {
    const raw = [{ Source: 'A', target: 'B' }];
    expect(normalizeTopologyData(raw)).toEqual({ data: raw });
  });

  it('passes through an object unchanged', () => {
    const data: TopologyData = { data: [{ Source: 'A', target: 'B' }] };
    expect(normalizeTopologyData(data)).toEqual(data);
  });

  it('returns empty structure for null/undefined', () => {
    expect(normalizeTopologyData(null)).toEqual({ data: [] });
    expect(normalizeTopologyData(undefined)).toEqual({ data: [] });
  });
});

describe('buildNodesArray', () => {
  it('returns empty array for empty data', () => {
    expect(buildNodesArray({ data: [] })).toEqual([]);
  });

  it('creates nodes for both Source and target', () => {
    const nodes = buildNodesArray({ data: [{ Source: 'A', target: 'B', size: 0.2 }] });
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toEqual(['A', 'B']);
  });

  it('deduplicates repeated Source/target ids', () => {
    const nodes = buildNodesArray({
      data: [
        { Source: 'A', target: 'B', size: 0.2 },
        { Source: 'A', target: 'C', size: 0.2 }
      ]
    });
    expect(nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
  });

  it('gives Pompeo the special large size of 260', () => {
    const nodes = buildNodesArray({ data: [{ Source: 'Pompeo', target: 'Hub', size: 0.1 }] });
    const pompeo = nodes.find((n) => n.id === 'Pompeo');
    expect(pompeo?.size).toBe(260);
    expect(pompeo?.level).toBe(10);
  });

  it('defaults size to 0.1 when missing and clamps minimum node size to 15', () => {
    const nodes = buildNodesArray({ data: [{ Source: 'A', target: 'B' }] });
    const nodeA = nodes.find((n) => n.id === 'A');
    expect(nodeA?.size).toBe(15);
    expect(nodeA?.level).toBe(4);
  });
});

describe('buildEdgesArray', () => {
  it('returns empty array for empty data', () => {
    expect(buildEdgesArray({ data: [] })).toEqual([]);
  });

  it('creates edges for valid Source->target pairs', () => {
    const edges = buildEdgesArray({ data: [{ Source: 'A', target: 'B', size: 0.2 }] });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: 'A', to: 'B', width: 1, smooth: false });
  });

  it('skips items missing Source or target', () => {
    const edges = buildEdgesArray({
      data: [
        { Source: 'A', target: 'B' },
        { Source: 'A', target: '' },
        { Source: '', target: 'C' }
      ]
    });
    expect(edges).toHaveLength(1);
  });
});

describe('getMockTopologyData', () => {
  it('returns a non-empty mock data set with expected shape', () => {
    const data = getMockTopologyData();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data[0]).toMatchObject({ Source: expect.any(String), target: expect.any(String) });
  });
});
