import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { root } from '@sker/core';
import { PersonaService } from '../services/data/persona.service';
import * as sdk from '@sker/sdk';

@Controller('api/personas')
export class PersonaController implements sdk.PersonaController {
  private personaService: PersonaService;

  constructor() {
    this.personaService = root.get(PersonaService);
  }

  @Get()
  async getPersonaList() {
    return this.personaService.getPersonaList();
  }

  @Get(':id/memory-graph')
  async getMemoryGraph(@Param('id') id: string) {
    return this.personaService.getMemoryGraph(id);
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
