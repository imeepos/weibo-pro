import { apiUtils as apiClient } from './client';
import type { PersonaListItem, PersonaMemoryGraph } from '@sker/sdk';

export const PersonaAPI = {
  getList: (): Promise<PersonaListItem[]> =>
    apiClient.get<PersonaListItem[]>('/personas'),

  getMemoryGraph: (id: string): Promise<PersonaMemoryGraph> =>
    apiClient.get<PersonaMemoryGraph>(`/personas/${id}/memory-graph`),
};
