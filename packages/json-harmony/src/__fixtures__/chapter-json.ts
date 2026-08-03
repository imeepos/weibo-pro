/**
 * 真实失败场景中的章节 JSON 样本
 * 从 parser.test.ts 的「实际失败场景：章节数据解析」describe 拆分而来。
 * 仅保存测试输入数据，不包含任何断言逻辑。
 */

/** 第二十七章：玉髓试魂（debug-json-parse-failed-2025-12-18T15-13-31-332Z.txt） */
export const CHAPTER_27_JSON = `{
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

/** 第一章：江湖第一课（debug-json-parse-failed-2025-12-18T21-50-28-871Z.txt） */
export const CHAPTER_01_JSON = `{
    "title": "第一章：江湖第一课",
    "summary": "衡山派弟子周子墨下山历练，在客栈遇神秘红衣女子，女子留下金豆布袋并盗走其腰牌，相约三日后城隍庙见。",
    "contentStartMarker": "江南三月，草长莺飞。临安城西的悦来客栈二楼雅座，靠窗的位置上，一位白衣少年正对着面前的松鼠鳜鱼发愁。",
    "contentEndMarker": "不然谁知道下次烧的是稻草堆，还是你的眉毛？",
    "clues": [
        {
            "id": "clue_ch01_red_dress_surname",
            "description": "红衣姑娘姓唐，可能与蜀中唐门有关联。",
            "status": "pending"
        },
        {
            "id": "clue_ch01_hengshan_token",
            "description": "周子墨的衡山派青玉腰牌被红衣姑娘盗走。",
            "status": "pending"
        },
        {
            "id": "clue_ch01_gold_beans",
            "description": "红衣姑娘留给周子墨的布袋中装有金豆子，来历不明。",
            "status": "pending"
        },
        {
            "id": "clue_ch01_three_men",
            "description": "刀疤脸三人组在追踪红衣姑娘，真实身份与目的不明。",
            "status": "pending"
        },
        {
            "id": "clue_ch01_poem_hint",
            "description": "竹筷上刻有诗句"金风玉露一相逢，便胜却人间无数"，暗示某种联系或约定。",
            "status": "pending"
        }
    ],
    "resolvedClueIds": []
}`

/** 简化损坏 JSON：专注测试未转义引号修复 */
export const BROKEN_UNESCAPED_QUOTES_JSON = `{
    "id": "clue_ch01_poem_hint",
    "description": "竹筷上刻有诗句"金风玉露一相逢，便胜却人间无数"，暗示某种联系或约定。",
    "status": "pending"
}`

/** 第八章：铜铃异响（debug-json-parse-failed-2025-12-18T22-01-51-562Z.txt） */
export const CHAPTER_08_JSON = `{
  "title": "第八章：铜铃异响",
  "summary": "周子墨在执法堂堂主黑凤处得知天机老人的预言，自己竟是破解黑风寨危机的关键，并获知破晓短剑和铜铃的秘密。胡一刀的人来袭，周子墨在黑凤掩护下逃离。",
  "contentStartMarker": "周子墨踏入黑暗，身后木门缓缓关闭，发出沉闷的\\"咔嗒\\"声。门内一片漆黑，只有远处传来微弱的火光，",
  "contentEndMarker": "周子墨深吸一口气，然后消失在夜色中。他不知道前方等待他的是什么，但他知道，自己的江湖之路，才刚刚开始。",
  "clues": [
    {
      "id": "clue_ch08_sword_key",
      "description": "破晓短剑不仅仅是武器，更是某种钥匙，暗示它有特殊功能",
      "status": "pending"
    },
    {
      "id": "clue_ch08_bloodline_secret",
      "description": "周子墨的血脉似乎有特殊之处，与预言有关",
      "status": "pending"
    },
    {
      "id": "clue_ch08_seven_stars",
      "description": "七星连珠是破解一切的关键，但具体含义未知",
      "status": "pending"
    },
    {
      "id": "clue_ch08_shadow_organization",
      "description": "神秘的"影组织"正在暗中操控一切",
      "status": "pending"
    }
  ],
  "resolvedClueIds": []
}`
