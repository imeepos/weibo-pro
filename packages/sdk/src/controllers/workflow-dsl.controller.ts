import { Controller, Post, Body, Get, Query } from '@sker/core'

export interface GenerateDSLPayload {
  description: string
  sessionId?: string
}

export interface GenerateDSLResult {
  sessionId: string
  dslCode: string
  explanation: string
  nodeCount: number
  complexity: string
  compilationStatus: 'success' | 'error'
  errors?: string[]
}

export interface RefineDSLPayload {
  sessionId: string
  feedback: string
}

export interface CompileDSLPayload {
  dslCode: string
}

export interface CompileDSLResult {
  success: boolean
  workflowGraph?: any
  errors?: Array<{ message: string; line?: number; column?: number; phase?: string }>
}

export interface NodeTypeInfo {
  name: string
  title: string
  type: string
  description: string
}

export interface NodeSchemaInfo {
  name: string
  title: string
  description: string
  inputs: Array<{ name: string; type: string; required: boolean; description: string }>
  outputs: Array<{ name: string; type: string; description: string }>
}

@Controller('workflow-dsl')
export class WorkflowDSLController {
  @Post('/generate')
  generate(@Body() body: GenerateDSLPayload): Promise<GenerateDSLResult> {
    throw new Error('method generate not implements')
  }

  @Post('/refine')
  refine(@Body() body: RefineDSLPayload): Promise<GenerateDSLResult> {
    throw new Error('method refine not implements')
  }

  @Post('/compile')
  compile(@Body() body: CompileDSLPayload): Promise<CompileDSLResult> {
    throw new Error('method compile not implements')
  }

  @Get('/nodes')
  listNodes(@Query() query: { category?: 'data-sources' | 'ai-capabilities' | 'data-processing' | 'all' }): Promise<NodeTypeInfo[]> {
    throw new Error('method listNodes not implements')
  }

  @Get('/node-schema')
  getNodeSchema(@Query() query: { nodeType: string }): Promise<NodeSchemaInfo> {
    throw new Error('method getNodeSchema not implements')
  }
}
