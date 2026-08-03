import { Inject, Injectable } from '@sker/core';
import type {
  PersonaListItem,
  PersonaEvidenceItem,
  PersonaNetworkGraph,
  PersonaMemoryGraph,
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  MemoryNode,
  CreateMemoryRequest,
} from '@sker/sdk';
import { PersonaProjectionService } from './investigation/persona-projection.service';
import { PersonaNetworkService } from './investigation/persona-network.service';
import {
  getPersonaByWeiboUserId,
  getPersonaEvidence,
  getPersonaList,
} from './persona.queries';
import { getPersonaMemoryGraph } from './persona.memory-graph';
import { retrievePersonaMemories } from './persona.memory-retrieval';
import { createPersonaMemory } from './persona.create-memory';

@Injectable({ providedIn: 'root' })
export class PersonaService {
  constructor(
    @Inject(PersonaProjectionService)
    private readonly personaProjectionService: PersonaProjectionService,
    @Inject(PersonaNetworkService)
    private readonly personaNetworkService: PersonaNetworkService,
  ) {}

  async getPersonaByWeiboUserId(weiboUserId: string): Promise<PersonaListItem | null> {
    return getPersonaByWeiboUserId(weiboUserId);
  }

  async getGraphOverview(): Promise<PersonaNetworkGraph> {
    return this.personaNetworkService.getGraphOverview();
  }

  async getPersonaEvidence(personaId: string): Promise<PersonaEvidenceItem[]> {
    return getPersonaEvidence(personaId, this.personaProjectionService);
  }

  async getPersonaList(): Promise<PersonaListItem[]> {
    return getPersonaList();
  }

  async getMemoryGraph(personaId: string): Promise<PersonaMemoryGraph> {
    return getPersonaMemoryGraph(personaId);
  }

  async retrieveMemories(request: RetrieveMemoriesRequest): Promise<RetrieveMemoriesResponse> {
    return retrievePersonaMemories(request);
  }

  async createMemory(personaId: string, request: Omit<CreateMemoryRequest, 'personaId'>): Promise<MemoryNode> {
    return createPersonaMemory(personaId, request);
  }
}
