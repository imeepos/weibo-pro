import { describe, it, expect, beforeEach } from 'vitest';
import { setupMocks } from './test-utils';
import { createEightGenerals, Orchestrator } from '../../eight-generals';
import type { GeneralRole, BaseGeneral } from '../../eight-generals';

beforeEach(setupMocks);

describe('createEightGenerals', () => {
  it('returns an Orchestrator with all eight general roles registered', () => {
    const orchestrator = createEightGenerals();

    expect(orchestrator).toBeInstanceOf(Orchestrator);
    expect(orchestrator.role).toBe('ti');
    expect(orchestrator.name).toBe('提将');
    expect(orchestrator.title).toBe('Orchestrator');

    const generals = (orchestrator as any).generals as Map<GeneralRole, BaseGeneral>;
    expect(generals.size).toBe(7);
    expect(Array.from(generals.keys()).sort()).toEqual([
      'chu',
      'fan',
      'feng',
      'huo',
      'tuo',
      'yao',
      'zheng',
    ]);
  });
});
