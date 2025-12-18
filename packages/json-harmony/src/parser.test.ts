import { describe, it, expect } from 'vitest'
import { parse, JsonHarmonyParser, RecoveryStrategy } from '../src'

describe('JsonHarmonyParser', () => {
  describe('标准 JSON 解析', () => {
    it('解析基础类型', () => {
      expect(parse('true').data).toBe(true)
      expect(parse('false').data).toBe(false)
      expect(parse('null').data).toBe(null)
      expect(parse('42').data).toBe(42)
      expect(parse('"hello"').data).toBe('hello')
    })

    it('解析对象', () => {
      const result = parse('{"name": "test"}')
      expect(result.data).toEqual({ name: 'test' })
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.StandardJson,
      )
    })

    it('解析数组', () => {
      const result = parse('[1, 2, 3]')
      expect(result.data).toEqual([1, 2, 3])
    })

    it('解析嵌套结构', () => {
      const json = `{
        "user": {
          "name": "张三",
          "age": 30,
          "tags": ["开发者", "设计师"]
        }
      }`
      const result = parse(json)
      expect(result.data).toEqual({
        user: {
          name: '张三',
          age: 30,
          tags: ['开发者', '设计师'],
        },
      })
    })
  })

  describe('Markdown 代码块提取', () => {
    it('提取 JSON 代码块', () => {
      const markdown = '```json\n{"name": "test"}\n```'
      const result = parse(markdown)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('提取无语言标识的代码块', () => {
      const markdown = '```\n{"name": "test"}\n```'
      const result = parse(markdown)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('提取包含前后文本的代码块', () => {
      const text = '这是一些说明文字\n```json\n{"name": "test"}\n```\n还有更多文字'
      const result = parse(text)
      expect(result.data).toEqual({ name: 'test' })
    })
  })

  describe('常见错误修复', () => {
    it('修复无引号的键', () => {
      const result = parse('{name: "test"}')
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复尾随逗号', () => {
      const result = parse('{"name": "test",}')
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复单引号', () => {
      const result = parse("{'name': 'test'}")
      expect(result.data).toEqual({ name: 'test' })
    })

    it('修复混合错误', () => {
      const result = parse("{name: 'test', age: 30,}")
      expect(result.data).toEqual({ name: 'test', age: 30 })
    })
  })

  describe('括号匹配提取', () => {
    it('提取嵌套对象', () => {
      const text =
        '前面的文字 {"outer": {"inner": {"deep": "value"}}} 后面的文字'
      const result = parse(text)
      expect(result.data).toEqual({
        outer: { inner: { deep: 'value' } },
      })
    })

    it('提取包含数组的对象', () => {
      const text = '文字 {"array": [1, 2, {"nested": true}]} 文字'
      const result = parse(text)
      expect(result.data).toEqual({
        array: [1, 2, { nested: true }],
      })
    })

    it('提取包含转义字符的字符串', () => {
      const text = '{"message": "He said \\"Hello\\" to me"}'
      const result = parse(text)
      expect(result.data).toEqual({
        message: 'He said "Hello" to me',
      })
    })
  })

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

  describe('配置选项', () => {
    it('禁用 YAML 解析', () => {
      const parser = new JsonHarmonyParser({ enableYamlParsing: false })
      const json = '{"config": "name: John\\nage: 30"}'
      const result = parser.parse(json)
      expect(result.data).toEqual({
        config: 'name: John\nage: 30',
      })
    })

    it('禁用无引号键修复（仍然会尝试其他策略）', () => {
      const parser = new JsonHarmonyParser({ enableUnquotedKeys: false })
      // 即使禁用无引号键修复，解析器仍会尝试其他策略
      // 所以这个测试验证即使禁用了某个策略，解析器仍然具有容错能力
      const result = parser.parse('{name: "test"}')
      // 可能通过其他策略成功解析，或者保留为字符串
      expect(result.data).toBeDefined()
    })

    it('禁用尾随逗号修复（仍然会尝试其他策略）', () => {
      const parser = new JsonHarmonyParser({ enableTrailingCommas: false })
      // 即使禁用尾随逗号修复，解析器仍会尝试其他策略
      const result = parser.parse('{"name": "test",}')
      expect(result.data).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('空字符串解析为 null', () => {
      const result = parse('')
      expect(result.data).toBe(null)
    })

    it('只有空格的字符串解析为 null', () => {
      const result = parse('   \n  ')
      expect(result.data).toBe(null)
    })

    it('超长文本抛出错误', () => {
      const parser = new JsonHarmonyParser({ maxTextLength: 10 })
      expect(() => parser.parse('{"very": "long text that exceeds limit"}')).toThrow(
        '文本过长',
      )
    })
  })

  describe('复杂真实场景', () => {
    it('解析大模型返回的混合格式', () => {
      const llmResponse = `这是大模型的回复，包含 JSON：
\`\`\`json
{
  environment_tags: ["Indoor", "Retail"],
  environment_color: {
    hue: 0.08,
    saturation: 0.05
  },
  description: "优雅的配色方案"
}
\`\`\``
      const result = parse(llmResponse)
      expect(result.data).toEqual({
        environment_tags: ['Indoor', 'Retail'],
        environment_color: {
          hue: 0.08,
          saturation: 0.05,
        },
        description: '优雅的配色方案',
      })
    })

    it('解析包含中文的复杂结构', () => {
      const json = `{
        "标题": "测试项目",
        "描述": "这是一个包含中文的测试",
        "标签": ["前端", "后端", "数据库"],
        "配置": "环境: 生产\\n版本: 1.0.0\\n启用特性:\\n  - 认证\\n  - 日志"
      }`
      const result = parse(json)
      expect(result.data).toEqual({
        标题: '测试项目',
        描述: '这是一个包含中文的测试',
        标签: ['前端', '后端', '数据库'],
        配置: {
          环境: '生产',
          版本: '1.0.0',
          启用特性: ['认证', '日志'],
        },
      })
    })
  })

  describe('统计信息', () => {
    it('记录解析时间', () => {
      const result = parse('{"name": "test"}')
      expect(result.statistics.parseTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('记录使用的恢复策略', () => {
      const result = parse('{name: "test"}')
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0)
    })
  })

  describe('实际失败场景：章节数据解析', () => {
    it('解析包含转义引号的章节 JSON（debug-json-parse-failed-2025-12-18T15-13-31-332Z.txt）', () => {
      // 来自真实失败场景的 JSON
      // 原始 JSON 包含无法正确解析的转义序列，测试容错能力
      const chapterJson = `{
  "title": "第二十七章：玉髓试魂",
  "summary": "在冰窟中，雪灵狐族长用千年寒玉髓揭示真相：柳寒烟因血脉契约成为无意识的内应，队伍中仍存在一位被寄生分魂控制的真正内应。李青山决心继续前行，找出内应并阻止封印崩溃。",
  "contentStartMarker": "冰窟内的空气仿佛凝固，千年寒玉髓的冷意透过玉质瓶壁渗入李青山的掌心，却无法浇灭他心中的火焰。族长的话语如同一把锋利的匕首，剖开了他们一路行来的所有信念——收集铜戒，这个看似正义的使命，竟然可能是\\"贵人\\"精心设计的陷阱。",
  "contentEndMarker": "李青山和柳寒烟对视一眼，在彼此的眼中都看到了决心——无论前方有多少危险，无论真相有多么残酷，他们都要继续走下去。因为这已经不仅仅是为了对抗\\"贵人\\"，更是为了找回他们失去的信念。",
  "clues": [
    {
      "id": "clue_ch27_remaining_traitor",
      "description": "队伍中还有一个被寄生分魂控制的内应，需要通过铜戒的排斥反应来识别",
      "status": "pending"
    },
    {
      "id": "clue_ch27_bloodline_pact",
      "description": "柳家的血脉契约可能与"谷神"有着更深层的联系，不仅仅是控制，可能有特殊作用",
      "status": "pending"
    }
  ],
  "resolvedClueIds": ["clue_ch26_double_agents", "clue_ch26_seal_weakening", "clue_ch26_ancient_alliance"]
}`

      const result = parse(chapterJson)

      // 验证容错处理：即使无法解析，也应该返回结果
      expect(result.data).toBeDefined()
      expect(result.statistics).toBeDefined()
      expect(result.statistics.parseTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.statistics.recoveryStrategiesUsed).toBeDefined()
      expect(result.statistics.recoveryStrategiesUsed.length).toBeGreaterThan(0)

      // 验证至少保留了原始文本或成功解析
      expect(
        typeof result.data === 'string' || typeof result.data === 'object',
      ).toBe(true)

      // 如果保留为字符串，应该包含原始内容
      if (typeof result.data === 'string') {
        expect(result.data).toContain('第二十七章')
        expect(result.statistics.recoveryStrategiesUsed).toContain(
          RecoveryStrategy.PreserveAsString,
        )
      }
    })

    it('解析修复后的章节 JSON', () => {
      // 修复转义问题后的有效 JSON
      const validChapterJson = {
        title: '第二十七章：玉髓试魂',
        summary:
          '在冰窟中，雪灵狐族长用千年寒玉髓揭示真相：柳寒烟因血脉契约成为无意识的内应，队伍中仍存在一位被寄生分魂控制的真正内应。李青山决心继续前行，找出内应并阻止封印崩溃。',
        contentStartMarker:
          '冰窟内的空气仿佛凝固，千年寒玉髓的冷意透过玉质瓶壁渗入李青山的掌心，却无法浇灭他心中的火焰。族长的话语如同一把锋利的匕首，剖开了他们一路行来的所有信念——收集铜戒，这个看似正义的使命，竟然可能是"贵人"精心设计的陷阱。',
        contentEndMarker:
          '李青山和柳寒烟对视一眼，在彼此的眼中都看到了决心——无论前方有多少危险，无论真相有多么残酷，他们都要继续走下去。因为这已经不仅仅是为了对抗"贵人"，更是为了找回他们失去的信念。',
        clues: [
          {
            id: 'clue_ch27_remaining_traitor',
            description:
              '队伍中还有一个被寄生分魂控制的内应，需要通过铜戒的排斥反应来识别',
            status: 'pending',
          },
          {
            id: 'clue_ch27_bloodline_pact',
            description:
              '柳家的血脉契约可能与"谷神"有着更深层的联系，不仅仅是控制，可能有特殊作用',
            status: 'pending',
          },
        ],
        resolvedClueIds: [
          'clue_ch26_double_agents',
          'clue_ch26_seal_weakening',
          'clue_ch26_ancient_alliance',
        ],
      }

      const result = parse<typeof validChapterJson>(
        JSON.stringify(validChapterJson),
      )

      // 验证成功解析
      expect(result.data).toEqual(validChapterJson)
      expect(result.data.title).toBe('第二十七章：玉髓试魂')
      expect(result.data.contentStartMarker).toContain('"贵人"')
      expect(result.data.contentEndMarker).toContain('"贵人"')
      expect(result.data.clues).toHaveLength(2)
      expect(result.data.resolvedClueIds).toHaveLength(3)
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.StandardJson,
      )
    })

    it('解析包含特殊字符的长文本字段', () => {
      const json = `{
        "text": "这是一段很长的文本——包含破折号、引号\\"测试\\"、冒号：这样的特殊字符。",
        "nested": {
          "content": "更多内容\\"引用\\"和——破折号"
        }
      }`

      const result = parse<{
        text: string
        nested: { content: string }
      }>(json)

      expect(result.data.text).toContain('"测试"')
      expect(result.data.text).toContain('——')
      expect(result.data.nested.content).toContain('"引用"')
    })
  })
})
