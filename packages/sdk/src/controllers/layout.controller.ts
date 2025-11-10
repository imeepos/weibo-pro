import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@sker/core'
import type {
  LayoutConfiguration,
  CreateLayoutPayload,
  UpdateLayoutPayload
} from '../types'

@Controller('api/layout')
export class LayoutController {

  @Get()
  getLayouts(@Query('type') type?: string): Promise<LayoutConfiguration[]> {
    throw new Error('method getLayouts not implements')
  }

  @Get('default')
  getDefaultLayout(@Query('type') type?: string): Promise<LayoutConfiguration> {
    throw new Error('method getDefaultLayout not implements')
  }

  @Get(':id')
  getLayoutById(@Param('id') id: string): Promise<LayoutConfiguration | Error> {
    throw new Error('method getLayoutById not implements')
  }

  @Post()
  createLayout(@Body() payload: CreateLayoutPayload): Promise<LayoutConfiguration> {
    throw new Error('method createLayout not implements')
  }

  @Put(':id')
  updateLayout(@Param('id') id: string, @Body() payload: UpdateLayoutPayload): Promise<LayoutConfiguration> {
    throw new Error('method updateLayout not implements')
  }

  @Delete(':id')
  deleteLayout(@Param('id') id: string): Promise<void> {
    throw new Error('method deleteLayout not implements')
  }

  @Put(':id/set-default')
  setDefaultLayout(@Param('id') id: string, @Body('type') type?: string): Promise<LayoutConfiguration> {
    throw new Error('method setDefaultLayout not implements')
  }
}