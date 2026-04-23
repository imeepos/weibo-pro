import { Controller, Get, Param, Post, Body } from '@sker/core'
import type {
  PersonaListItem,
  PersonaMemoryGraph,
  PersonaEvidenceItem,
  PersonaNetworkGraph,
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  CreateMemoryRequest,
  MemoryNode
} from '../types'

@Controller('personas')
export class PersonaController {

  @Get('list')
  getPersonaList(): Promise<PersonaListItem[]> {
    throw new Error('method getPersonaList not implements')
  }

  @Get(':id/memory-graph')
  getMemoryGraph(@Param('id') id: string): Promise<PersonaMemoryGraph> {
    throw new Error('method getMemoryGraph not implements')
  }

  @Get('by-weibo-user/:weiboUserId')
  getPersonaByWeiboUserId(@Param('weiboUserId') weiboUserId: string): Promise<PersonaListItem | null> {
    throw new Error('method getPersonaByWeiboUserId not implements')
  }

  @Get('graph-overview')
  getGraphOverview(): Promise<PersonaNetworkGraph> {
    throw new Error('method getGraphOverview not implements')
  }

  @Get(':id/evidence')
  getPersonaEvidence(@Param('id') id: string): Promise<PersonaEvidenceItem[]> {
    throw new Error('method getPersonaEvidence not implements')
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
