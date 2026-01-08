import { Controller, Post, Body, Get, Put, Param } from '@sker/core'
import type { DerivedNodeEntity } from '@sker/entities'

export interface CreateDerivedNodePayload {
  name: string
  baseType: string
  frozenInputs: Record<string, unknown>
  nodeMetadata: {
    class: { title: string; type: string; description?: string }
    inputs: Array<{ property: string; title: string; type?: string; defaultValue?: unknown }>
    outputs: Array<{ property: string; title: string; type?: string }>
    states?: Array<{ property: string; title: string; type?: string; defaultValue?: unknown }>
  }
  createdBy?: string
}

@Controller('derived-nodes')
export class DerivedNodeController {
  @Post('/')
  create(@Body() body: CreateDerivedNodePayload): Promise<DerivedNodeEntity> {
    throw new Error('method create not implements')
  }

  @Put('/:id/publish')
  publish(@Param('id') id: string): Promise<{ success: boolean }> {
    throw new Error('method publish not implements')
  }

  @Get('/')
  list(): Promise<DerivedNodeEntity[]> {
    throw new Error('method list not implements')
  }
}
