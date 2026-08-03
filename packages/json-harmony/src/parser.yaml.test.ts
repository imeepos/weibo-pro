import { describe, it, expect } from 'vitest'
import { parse, RecoveryStrategy } from '../src'

describe('JsonHarmonyParser', () => {
  describe('YAML 检测和解析', () => {
    it('解析简单 YAML 键值对', () => {
      const yaml = 'name: John Doe\nage: 30\ncity: New York'
      const result = parse(yaml)
      expect(result.data).toEqual({
        name: 'John Doe',
        age: 30,
        city: 'New York',
      })
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.YamlParsing,
      )
    })

    it('解析 YAML 列表', () => {
      const yaml = '- item1\n- item2\n- item3'
      const result = parse(yaml)
      expect(result.data).toEqual(['item1', 'item2', 'item3'])
    })

    it('解析嵌套 YAML 结构', () => {
      const yaml = `database:
  host: localhost
  port: 5432
  credentials:
    username: admin
    password: secret
features:
  - authentication
  - logging`
      const result = parse(yaml)
      expect(result.data).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
        features: ['authentication', 'logging'],
      })
    })

    it('JSON 中包含 YAML 字符串字段时自动解析', () => {
      const json = '{"config": "name: John\\nage: 30"}'
      const result = parse(json)
      expect(result.data).toEqual({
        config: {
          name: 'John',
          age: 30,
        },
      })
    })

    it('JSON 中包含 YAML 列表字符串时自动解析', () => {
      const json = '{"tags": "- frontend\\n- backend\\n- database"}'
      const result = parse(json)
      expect(result.data).toEqual({
        tags: ['frontend', 'backend', 'database'],
      })
    })

    it('不将 JSON 误识别为 YAML', () => {
      const json = '{"key": "value with: colon"}'
      const result = parse(json)
      expect(result.data).toEqual({
        key: 'value with: colon',
      })
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.StandardJson,
      )
    })
  })
})
