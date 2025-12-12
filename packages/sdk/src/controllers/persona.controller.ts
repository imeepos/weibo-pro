import { Controller, Get, Param } from '@sker/core'
import type { PersonaListItem, PersonaMemoryGraph } from '../types'

@Controller('api/personas')
export class PersonaController {

  @Get()
  getPersonaList(): Promise<PersonaListItem[]> {
    throw new Error('method getPersonaList not implements')
  }

  @Get(':id/memory-graph')
  getMemoryGraph(@Param('id') id: string): Promise<PersonaMemoryGraph> {
    throw new Error('method getMemoryGraph not implements')
  }
}
