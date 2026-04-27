/**
 * Persona API
 *
 * 使用 @sker/sdk 的 PersonaController
 */

import { root } from '@sker/core'
import { PersonaController } from '@sker/sdk'
import type {
  PersonaEvidenceItem,
  PersonaListItem,
  PersonaMemoryGraph,
  PersonaNetworkGraph,
} from '@sker/sdk';

export const PersonaAPI = {
  getList: async (): Promise<PersonaListItem[]> => {
    const controller = root.get(PersonaController)
    return await controller.getPersonaList()
  },

  getMemoryGraph: async (id: string): Promise<PersonaMemoryGraph> => {
    const controller = root.get(PersonaController)
    return await controller.getMemoryGraph(id)
  },

  getPersonaByWeiboUserId: async (weiboUserId: string): Promise<PersonaListItem | null> => {
    const controller = root.get(PersonaController)
    return await controller.getPersonaByWeiboUserId(weiboUserId)
  },

  getGraphOverview: async (): Promise<PersonaNetworkGraph> => {
    const controller = root.get(PersonaController)
    return await controller.getGraphOverview()
  },

  getPersonaEvidence: async (id: string): Promise<PersonaEvidenceItem[]> => {
    const controller = root.get(PersonaController)
    return await controller.getPersonaEvidence(id)
  },
};
