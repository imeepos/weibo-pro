import { describe, expect, it } from 'vitest';
import { Controller, Get, Post } from '@sker/core';
import { controllerFactory } from './controller.factory';

@Controller('users')
class TestUsersController {
  @Post(':id/distillation-tasks')
  createDistillationTask() {
    return { ok: true };
  }

  @Get(':id/distillation-tasks')
  getDistillationTasks() {
    return [];
  }
}

describe('controllerFactory', () => {
  it('preserves GET and POST endpoints for the same path', () => {
    const endpoints = controllerFactory(TestUsersController);

    expect(Object.keys(endpoints)).toHaveLength(2);
    expect(
      Object.values(endpoints)
        .map((endpoint) => endpoint.options.method)
        .sort(),
    ).toEqual(['GET', 'POST']);
    expect(
      Object.values(endpoints).map((endpoint) => endpoint.path),
    ).toEqual([
      'users/:id/distillation-tasks',
      'users/:id/distillation-tasks',
    ]);
  });
});
