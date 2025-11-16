import { describe, it, expect } from 'vitest';
import { calculateCompositeScore } from './NodeSizeCalculator';
import { calculateLinkDistance } from './LinkDistanceCalculator';
import { smartFocusAlgorithm } from './SmartFocusSystem';

describe('UserRelationGraph3D Enhanced Features', () => {
  describe('NodeSizeCalculator', () => {
    it('should calculate composite score correctly', () => {
      const node = {
        followers: 500000,
        influence: 75,
        postCount: 5000
      };
      const connectionCount = 25;
      const weights = {
        followers: 0.4,
        influence: 0.3,
        postCount: 0.2,
        connections: 0.1
      };

      const score = calculateCompositeScore(node, connectionCount, weights);

      // Expected calculation:
      // followers: 500000 / 1000000 = 0.5 * 0.4 = 0.2
      // influence: 75 / 100 = 0.75 * 0.3 = 0.225
      // postCount: 5000 / 10000 = 0.5 * 0.2 = 0.1
      // connections: 25 / 50 = 0.5 * 0.1 = 0.05
      // Total: 0.2 + 0.225 + 0.1 + 0.05 = 0.575
      expect(score).toBeCloseTo(0.575, 3);
    });

    it('should handle missing node properties', () => {
      const node = {};
      const connectionCount = 0;
      const weights = {
        followers: 0.4,
        influence: 0.3,
        postCount: 0.2,
        connections: 0.1
      };

      const score = calculateCompositeScore(node, connectionCount, weights);
      expect(score).toBe(0);
    });
  });

  describe('LinkDistanceCalculator', () => {
    it('should calculate link distance based on weight', () => {
      const edge = { weight: 80 }; // Weight 0-100 scale
      const config = {
        minDistance: 50,
        maxDistance: 200,
        useDynamicDistance: true
      };

      const distance = calculateLinkDistance(edge, config);

      // Expected calculation:
      // normalizedWeight = 80 / 100 = 0.8
      // strengthFactor = 1 - 0.8 = 0.2
      // baseDistance = 50 + 0.2 * (200 - 50) = 50 + 30 = 80
      // type factor (default comprehensive) = 0.7
      // final = 80 * 0.7 = 56
      expect(distance).toBe(56);
    });

    it('should respect min and max distance bounds', () => {
      const edge = { weight: 10, type: 'like' }; // Low weight, like type
      const config = {
        minDistance: 80,
        maxDistance: 120,
        useDynamicDistance: true
      };

      const distance = calculateLinkDistance(edge, config);

      // Expected calculation:
      // normalizedWeight = 10 / 100 = 0.1
      // strengthFactor = 1 - 0.1 = 0.9
      // baseDistance = 80 + 0.9 * (120 - 80) = 80 + 36 = 116
      // type factor (like) = 1.0
      // final = 116 * 1.0 = 116
      expect(distance).toBe(116);
    });
  });

  describe('SmartFocusSystem', () => {
    it('should identify direct connections for focus', () => {
      const selectedNode = { id: 'node1' };
      const graphData = {
        nodes: [
          { id: 'node1' },
          { id: 'node2' },
          { id: 'node3' },
          { id: 'node4' }
        ],
        links: [
          { source: 'node1', target: 'node2' },
          { source: 'node1', target: 'node3' },
          { source: 'node2', target: 'node4' }
        ]
      };

      const result = smartFocusAlgorithm(selectedNode, graphData, 1);

      // Should include node1 (selected) and direct connections (node2, node3)
      expect(result.highlightNodes.has('node1')).toBe(true);
      expect(result.highlightNodes.has('node2')).toBe(true);
      expect(result.highlightNodes.has('node3')).toBe(true);
      expect(result.highlightNodes.has('node4')).toBe(false); // Not direct connection
    });

    it('should calculate camera position for focus area', () => {
      const selectedNode = { id: 'node1' };
      const graphData = {
        nodes: [
          { id: 'node1', x: 0, y: 0, z: 0 },
          { id: 'node2', x: 10, y: 10, z: 10 },
          { id: 'node3', x: -10, y: -10, z: -10 }
        ],
        links: [
          { source: 'node1', target: 'node2' },
          { source: 'node1', target: 'node3' }
        ]
      };

      const result = smartFocusAlgorithm(selectedNode, graphData, 1);

      // Camera position should be calculated
      expect(result.cameraPosition).toHaveProperty('x');
      expect(result.cameraPosition).toHaveProperty('y');
      expect(result.cameraPosition).toHaveProperty('z');
      expect(result.cameraTarget).toHaveProperty('x');
      expect(result.cameraTarget).toHaveProperty('y');
      expect(result.cameraTarget).toHaveProperty('z');
    });
  });
});