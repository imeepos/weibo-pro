import { beforeEach, beforeAll } from 'vitest';
import { globalRuntime } from '../src/runtime';
import { root } from '@sker/core';
import { providers } from '../src/execution/EdgeModeStrategy';

beforeAll(() => {
  // 注册 EdgeMode 策略提供者
  root.set(providers);
});

beforeEach(() => {
  globalRuntime.clearEvents();
  globalRuntime.startRecording();
});
