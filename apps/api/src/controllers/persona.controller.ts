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

  async getPersonaList() {
    return this.personaService.getPersonaList();
  }

  async getMemoryGraph(@Param('id') id: string) {
    return this.personaService.getMemoryGraph(id);
  }

  async getPersonaByWeiboUserId(@Param('weiboUserId') weiboUserId: string) {
    return this.personaService.getPersonaByWeiboUserId(weiboUserId);
  }

  async getGraphOverview() {
    return this.personaService.getGraphOverview();
  }

  async getPersonaEvidence(@Param('id') id: string) {
    return this.personaService.getPersonaEvidence(id);
  }

  async retrieveMemories(@Body() request: sdk.RetrieveMemoriesRequest) {
    return this.personaService.retrieveMemories(request);
  }

  async createMemory(
    @Param('id') id: string,
    @Body() request: Omit<sdk.CreateMemoryRequest, 'personaId'>
  ) {
    return this.personaService.createMemory(id, request);
  }
}
