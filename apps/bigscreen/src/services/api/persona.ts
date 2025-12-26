/**
 * Persona API
 *
 * 使用 @sker/sdk 的 PersonaController
 */

import { root } from '@sker/core'
import { PersonaController } from '@sker/sdk'
import type { PersonaListItem, PersonaMemoryGraph } from '@sker/sdk';

export const PersonaAPI = {
  getList: async (): Promise<PersonaListItem[]> => {
    const controller = root.get(PersonaController)
    return await controller.getPersonaList()
  },

  getMemoryGraph: async (id: string): Promise<PersonaMemoryGraph> => {
    const controller = root.get(PersonaController)
    return await controller.getMemoryGraph(id)
  },
};
