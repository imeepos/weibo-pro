import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@sker/core'

@Controller('api/layout')
export class LayoutController {

  @Get()
  getLayouts(@Query('type') type?: string): Promise<any> {
    throw new Error('method getLayouts not implements')
  }

  @Get('default')
  getDefaultLayout(@Query('type') type?: string): Promise<any> {
    throw new Error('method getDefaultLayout not implements')
  }

  @Get(':id')
  getLayoutById(@Param('id') id: string): Promise<any> {
    throw new Error('method getLayoutById not implements')
  }

  @Post()
  createLayout(@Body() payload: any): Promise<any> {
    throw new Error('method createLayout not implements')
  }

  @Put(':id')
  updateLayout(@Param('id') id: string, @Body() payload: any): Promise<any> {
    throw new Error('method updateLayout not implements')
  }

  @Delete(':id')
  deleteLayout(@Param('id') id: string): Promise<any> {
    throw new Error('method deleteLayout not implements')
  }

  @Put(':id/set-default')
  setDefaultLayout(@Param('id') id: string, @Body('type') type?: string): Promise<any> {
    throw new Error('method setDefaultLayout not implements')
  }
}