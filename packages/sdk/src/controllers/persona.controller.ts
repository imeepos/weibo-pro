import { Controller, Get, Param, Post, Body } from '@sker/core'
import type {
  PersonaListItem,
  PersonaMemoryGraph,
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  CreateMemoryRequest,
  MemoryNode
} from '../types'

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

  @Post('retrieve-memories')
  retrieveMemories(@Body() request: RetrieveMemoriesRequest): Promise<RetrieveMemoriesResponse> {
    throw new Error('method retrieveMemories not implements')
  }

  @Post(':id/memories')
  createMemory(@Param('id') id: string, @Body() request: Omit<CreateMemoryRequest, 'personaId'>): Promise<MemoryNode> {
    throw new Error('method createMemory not implements')
  }
}
