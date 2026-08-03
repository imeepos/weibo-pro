import { Injectable } from '@sker/core';
import type { PersonaEvidenceItem } from '@sker/sdk';
import { buildProjection as buildProjectionFn } from './persona-projection.build';
import type { ProjectionInput, PersonaProjection } from './persona-projection.build';
import { publishProfile as persistPublishProfile } from './persona-projection.persist';

@Injectable({ providedIn: 'root' })
export class PersonaProjectionService {
  async buildProjection(
    input: ProjectionInput,
  ): Promise<PersonaProjection> {
    return buildProjectionFn(input);
  }

  async getEvidenceForPersona(_personaId: string): Promise<PersonaEvidenceItem[]> {
    return [];
  }

  async publishProfile(input: ProjectionInput): Promise<void> {
    return persistPublishProfile(input);
  }
}
