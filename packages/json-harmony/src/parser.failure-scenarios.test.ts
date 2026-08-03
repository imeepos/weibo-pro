import { describe, it, expect } from 'vitest'
import { parse, RecoveryStrategy } from '../src'
import {
  CHAPTER_27_JSON,
  CHAPTER_01_JSON,
  BROKEN_UNESCAPED_QUOTES_JSON,
  CHAPTER_08_JSON,
} from './__fixtures__/chapter-json'

describe('JsonHarmonyParser', () => {
  describe('实际失败场景：章节数据解析', () => {
    it('解析包含转义引号的章节 JSON（debug-json-parse-failed-2025-12-18T15-13-31-332Z.txt）', () => {
      // 来自真实失败场景的 JSON
      // 原始 JSON 包含无法正确解析的转义序列，测试容错能力
      const chapterJson = CHAPTER_27_JSON

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

    it('解析第一章数据（debug-json-parse-failed-2025-12-18T21-50-28-871Z.txt）', () => {
      // 来自 2025-12-18T21:50:28.871Z 失败场景的实际数据
      // 包含未转义的引号，测试 json-harmony 的自动修复能力
      const chapterJson = CHAPTER_01_JSON

      const result = parse(chapterJson)

      // 验证成功解析（自动修复未转义引号）
      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')

      // 验证使用了 UnescapedQuotesFix 策略
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.UnescapedQuotesFix,
      )

      // 验证结构和内容
      const data = result.data as any
      expect(data.title).toBe('第一章：江湖第一课')
      expect(data.summary).toContain('衡山派弟子')
      expect(data.contentStartMarker).toContain('江南三月')
      expect(data.contentEndMarker).toContain('稻草堆')
      expect(data.clues).toHaveLength(5)
      expect(data.clues[0].id).toBe('clue_ch01_red_dress_surname')
      // 验证未转义的引号被正确处理
      expect(data.clues[4].description).toContain('金风玉露一相逢')
      expect(data.resolvedClueIds).toEqual([])
    })

    it('容错处理：单独测试未转义引号修复', () => {
      // 简化的损坏JSON，专注测试引号修复
      const brokenJson = BROKEN_UNESCAPED_QUOTES_JSON

      const result = parse(brokenJson)

      // 应该成功解析（使用 UnescapedQuotesFix 策略）
      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')

      const data = result.data as any
      expect(data.id).toBe('clue_ch01_poem_hint')
      expect(data.description).toContain('金风玉露一相逢')
      expect(data.status).toBe('pending')

      // 验证使用了引号修复策略
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.UnescapedQuotesFix,
      )
    })

    it('解析第八章数据（debug-json-parse-failed-2025-12-18T22-01-51-562Z.txt）', () => {
      // 来自 2025-12-18T22:01:51.562Z 失败场景的实际数据
      // 包含未转义的引号，测试 json-harmony 的自动修复能力
      const chapterJson = CHAPTER_08_JSON

      const result = parse(chapterJson)

      // 验证成功解析（自动修复未转义引号）
      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')

      // 验证使用了 UnescapedQuotesFix 策略
      expect(result.statistics.recoveryStrategiesUsed).toContain(
        RecoveryStrategy.UnescapedQuotesFix,
      )

      // 验证结构和内容
      const data = result.data as any
      expect(data.title).toBe('第八章：铜铃异响')
      expect(data.summary).toContain('周子墨')
      expect(data.contentStartMarker).toContain('咔嗒')
      expect(data.contentEndMarker).toContain('江湖之路')
      expect(data.clues).toHaveLength(4)
      expect(data.clues[3].id).toBe('clue_ch08_shadow_organization')
      // 验证未转义的引号被正确处理
      expect(data.clues[3].description).toContain('影组织')
      expect(data.resolvedClueIds).toEqual([])
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
