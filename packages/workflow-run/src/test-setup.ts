import { root } from '@sker/core';
import { EntityManager } from 'typeorm';

// Mock EntityManager for tests
class MockEntityManager {
  find() { return Promise.resolve([]); }
  findOne() { return Promise.resolve(null); }
  save() { return Promise.resolve(null); }
  remove() { return Promise.resolve(null); }
  create() { return {}; }
  getRepository() { return this; }
}

// Register mock EntityManager in DI container
root.set([{ provide: EntityManager, useValue: new MockEntityManager() }]);
