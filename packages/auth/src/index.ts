export * from './core';
export * from './decorators';
export * from './compiler';
export * from './plugins/birthday';

import { PluginCompiler } from './compiler';

/**
 * 编译所有装饰器插件为 Better Auth 原生格式
 */
export function compileAuthPlugins() {
  const compiler = new PluginCompiler();
  return compiler.compile();
}
