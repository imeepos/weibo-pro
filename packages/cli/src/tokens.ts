import { InjectionToken } from '@sker/core';

export interface CliConfig {
  id: string;
  name: string;
  description: string;
  /** API 服务器地址 */
  apiServer: string;
}

export const CLI_CONFIG = new InjectionToken<CliConfig>('CLI_CONFIG');
