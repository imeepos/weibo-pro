import { describe, expect, it } from 'vitest';
import { METHOD_METADATA, PATH_METADATA, RequestMethod } from '@sker/core';
import { UsersController as SdkUsersController } from '../../../../packages/sdk/src/controllers/users.controller';
import { PersonaController as SdkPersonaController } from '../../../../packages/sdk/src/controllers/persona.controller';
import { UsersController } from './users.controller';
import { PersonaController } from './persona.controller';

describe('user investigation contracts', () => {
  it('extends sdk and api controllers with investigation methods', () => {
    expect(typeof SdkUsersController.prototype.getInvestigationQueue).toBe('function');
    expect(typeof SdkUsersController.prototype.getUserDossier).toBe('function');
    expect(typeof SdkUsersController.prototype.createDistillationTask).toBe('function');
    expect(typeof SdkUsersController.prototype.getDistillationTasks).toBe('function');
    expect(typeof SdkUsersController.prototype.reviewDistillationTask).toBe('function');

    expect(typeof SdkPersonaController.prototype.getPersonaByWeiboUserId).toBe('function');
    expect(typeof SdkPersonaController.prototype.getGraphOverview).toBe('function');
    expect(typeof SdkPersonaController.prototype.getPersonaEvidence).toBe('function');

    expect(typeof UsersController.prototype.getInvestigationQueue).toBe('function');
    expect(typeof UsersController.prototype.getUserDossier).toBe('function');
    expect(typeof UsersController.prototype.reviewDistillationTask).toBe('function');
    expect(typeof PersonaController.prototype.getGraphOverview).toBe('function');
  });

  it('publishes the user list and statistics endpoints', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getUserList)).toBe('list');
    expect(Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getUserList)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getRiskLevels)).toBe('risk-levels');
    expect(Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getRiskLevels)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, UsersController.prototype.getStatistics)).toBe('statistics');
    expect(Reflect.getMetadata(METHOD_METADATA, UsersController.prototype.getStatistics)).toBe(RequestMethod.GET);
  });
});
