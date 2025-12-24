import type { IStore } from '../store.interface'
import { JsonStore } from './json.store'
import { CsvStore } from './csv.store'
import { ExcelStore } from './excel.store'
import { DatabaseStore } from './database.store'

export type StoreType = 'json' | 'csv' | 'excel' | 'database'

export interface StoreConfig {
  type: StoreType
  baseDir?: string
  database?: {
    dataSource: any
    entities: any
  }
}

export class StoreFactory {
  static create(config: StoreConfig): IStore {
    switch (config.type) {
      case 'json':
        return new JsonStore(config.baseDir)
      case 'csv':
        return new CsvStore(config.baseDir)
      case 'excel':
        return new ExcelStore(config.baseDir)
      case 'database':
        if (!config.database) {
          throw new Error('Database configuration required for database store')
        }
        return new DatabaseStore(config.database.dataSource, config.database.entities)
      default:
        throw new Error(`Unknown store type: ${config.type}`)
    }
  }
}
