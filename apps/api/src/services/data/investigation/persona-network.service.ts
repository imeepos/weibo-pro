import { Injectable } from '@sker/core';
import type { PersonaNetworkGraph } from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class PersonaNetworkService {
  async buildGraph(graph: PersonaNetworkGraph): Promise<PersonaNetworkGraph> {
    return graph;
  }

  async getGraphOverview(): Promise<PersonaNetworkGraph> {
    return {
      personas: [],
      edges: [],
    };
  }
}
