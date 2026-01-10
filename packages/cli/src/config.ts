import { Injectable } from '@sker/core';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { generateRandomString } from '@sker/utils';
import type { CliConfig } from './tokens.js';

@Injectable({ providedIn: 'auto' })
export class ConfigService {
  private readonly globalConfigPath = join(homedir(), '.sker', 'config.json');
  private readonly localConfigPath = join(process.cwd(), '.sker', 'config.json');

  load(): CliConfig {
    const globalConfig = this.loadGlobal();
    const localConfig = this.loadLocal();

    return this.merge(globalConfig, localConfig);
  }

  private loadGlobal(): CliConfig | null {
    if (!existsSync(this.globalConfigPath)) {
      return this.createDefaultGlobal();
    }
    return JSON.parse(readFileSync(this.globalConfigPath, 'utf-8'));
  }

  private loadLocal(): Partial<CliConfig> | null {
    if (!existsSync(this.localConfigPath)) {
      return null;
    }
    return JSON.parse(readFileSync(this.localConfigPath, 'utf-8'));
  }

  private merge(global: CliConfig | null, local: Partial<CliConfig> | null): CliConfig {
    if (!global) {
      throw new Error('Global config is required');
    }
    if (!local) {
      return global;
    }
    return {
      ...global,
      ...local,
    };
  }

  private createDefaultGlobal(): CliConfig {
    const dir = join(homedir(), '.sker');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const config: CliConfig = {
      id: generateRandomString(16),
      name: 'default-worker',
      description: 'Default task worker',
      apiServer: 'http://localhost:8089',
    };
    writeFileSync(this.globalConfigPath, JSON.stringify(config, null, 2));
    return config;
  }
}
