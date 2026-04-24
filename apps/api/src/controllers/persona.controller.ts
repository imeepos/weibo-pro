import { Controller, Get, Param, Post, Body } from '@sker/core';
import { root } from '@sker/core';
import { PersonaService } from '../services/data/persona.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.PersonaController)
export class PersonaController implements sdk.PersonaController {
  private personaService: PersonaService;

  constructor() {
    this.personaService = root.get(PersonaService);
  }

  @Get('list')
  async getPersonaList() {
    return this.personaService.getPersonaList();
  }

  @Get(':id/memory-graph')
  async getMemoryGraph(@Param('id') id: string) {
    return this.personaService.getMemoryGraph(id);
  }

  @Get('by-weibo-user/:weiboUserId')
  async getPersonaByWeiboUserId(@Param('weiboUserId') weiboUserId: string) {
    return this.personaService.getPersonaByWeiboUserId(weiboUserId);
  }

  @Get('graph-overview')
  async getGraphOverview() {
    return this.personaService.getGraphOverview();
  }

  @Get(':id/evidence')
  async getPersonaEvidence(@Param('id') id: string) {
    return this.personaService.getPersonaEvidence(id);
  }

  @Post('retrieve-memories')
  async retrieveMemories(@Body() request: sdk.RetrieveMemoriesRequest) {
    return this.personaService.retrieveMemories(request);
  }

  @Post(':id/memories')
  async createMemory(
    @Param('id') id: string,
    @Body() request: Omit<sdk.CreateMemoryRequest, 'personaId'>
  ) {
    return this.personaService.createMemory(id, request);
  }
}
