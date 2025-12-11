# 连贯小说创作工作流（Coherent Story Creation Workflow）

**版本**: 1.0
**更新时间**: 2025-12-11

---

## 核心理念

所有 agent 共享一个**故事圣经（Story Bible）**，这是防止剧情断裂、角色漂移、风格混乱的唯一真相源（Single Source of Truth）。

> **故事圣经永存，创意围绕其生长。**
> The Story Bible persists; creativity grows around it.

---

## Agent 职责分工

| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| **SeriesDirector** | 总导演：创建故事圣经、质量检查、维护连贯性 | 故事概念 | Story Bible + 质量报告 |
| **AiStoryboardWriter** | 开篇大师：创建第1集开场（前3秒抓眼球） | Story Bible + 开篇概念 | 场景描述 + Story DNA |
| **AiNextEpisodeContinuation** | 续集专家：自然延续上集，画面如流水 | Story Bible + 上集结尾 | 下集开场 + 更新 Story DNA |
| **AiVideoPromptEngineer** | 视频工程师：将场景转换为 AI 视频生成提示词 | Story Bible + 场景描述 | 分镜视频提示词 |
| **AiAudioDesigner** | 音效设计师：为场景添加时间轴音效描述 | Story Bible + 视频提示词 | 时间码音效描述 |

---

## 完整工作流程

### 阶段 0: 初始化项目

**目标**: 创建故事圣经

**步骤**:
1. 使用 **SeriesDirector** 执行 `/init-story`
2. 输入故事概念（1-3句话）
3. 获得完整的 Story Bible
4. **关键操作**: 保存 Story Bible 到独立文件，所有后续工作都引用它

**示例**:
```
[User to SeriesDirector]
/init-story

Story Concept: A once-proud chef loses everything in a fire and must rebuild from ashes to reclaim his culinary legacy. 8 episodes, emotional drama with gritty realism.

[SeriesDirector Output]
# STORY BIBLE - Chef's Redemption

## [STORY DNA]
Outline: A once-proud chef loses everything and must rebuild from ashes to reclaim his culinary legacy
Style: Emotional drama with gritty realism
Target Episodes: 8
...
[完整 Story Bible 内容]
```

**产出**: `story-bible.md` 文件

---

### 阶段 1: 创建第 1 集开场（The Hook）

**目标**: 用前3秒抓住观众注意力

**步骤**:
1. 使用 **AiStoryboardWriter**
2. 输入 Story Bible 的关键部分（Story DNA + 角色 + 风格）+ 开篇概念
3. 获得开场场景描述

**数据流**:
```
Story Bible (Characters, Style, Hook Strategy)
    ↓
AiStoryboardWriter
    ↓
[OPENING SCENE] + [STORY DNA]
```

**示例**:
```
[User to AiStoryboardWriter]

[STORY DNA]
Outline: A once-proud chef loses everything and must rebuild from ashes to reclaim his culinary legacy
Style: Emotional drama with gritty realism
Hook Strategy: Conflict

[OPENING CONCEPT]
Chef discovers his restaurant is on fire during dinner service

[AiStoryboardWriter Output]
[STORY DNA]
Outline: A once-proud chef loses everything and must rebuild from ashes to reclaim his culinary legacy
Style: Emotional drama with gritty realism
Timeline: Episode 1 - Opening (Day 1)

[OPENING SCENE]
Night, a small Italian restaurant kitchen during peak service. Marco flips a sauté pan, the sizzle drowning out conversation—until he catches it. A faint crackling behind him. He turns. Orange flames crawl up the wooden spice rack like living fingers...
```

**产出**: `episode-1-scene.md`

---

### 阶段 2: 生成视频提示词

**目标**: 将文字场景转换为 AI 视频生成所需的技术格式

**步骤**:
1. 使用 **AiVideoPromptEngineer**
2. 输入 Story Bible（角色 Visual Anchors + 场所描述 + 风格）+ 场景描述
3. 获得分镜视频提示词

**数据流**:
```
Story Bible (Characters Visual Anchors, Locations, Style)
    +
Episode Scene Description
    ↓
AiVideoPromptEngineer
    ↓
[VIDEO PROMPT] (时间码 + 镜头语言)
```

**示例**:
```
[User to AiVideoPromptEngineer]

[STORY BIBLE REFERENCE]
Characters:
- Marco: a middle-aged man with graying temples, wearing a chef's white coat with smoke stains
Locations:
- Marco's Restaurant Kitchen: a small Italian kitchen with wooden shelves, copper pots, and warm orange lighting
Style: Emotional drama with gritty realism, cinematic lighting, handheld camera feel

[SCENE DESCRIPTION]
Night, a small Italian restaurant kitchen during peak service. Marco flips a sauté pan...
[完整场景]

[AiVideoPromptEngineer Output]
[VIDEO PROMPT]
A small Italian restaurant kitchen with wooden shelves and copper pots, night, emotional drama style. 0-2s: Medium shot of Marco (a middle-aged man with graying temples, wearing a chef's white coat) flipping a sauté pan, flames dancing. [cut] 2-4s: Close-up of Marco's face turning...
```

**产出**: `episode-1-video.txt`

---

### 阶段 3: 设计音效

**目标**: 为视频提示词添加音频层

**步骤**:
1. 使用 **AiAudioDesigner**
2. 输入 Story Bible（音频风格 + 场所音效）+ 视频提示词
3. 获得时间码音效描述

**数据流**:
```
Story Bible (Audio Style, Location Audio)
    +
Video Prompt
    ↓
AiAudioDesigner
    ↓
[AUDIO DESIGN] (时间码 + 音效描述)
```

**示例**:
```
[User to AiAudioDesigner]

[STORY BIBLE REFERENCE]
Audio Style: Emotional drama with cinematic realism — ambient kitchen sounds, realistic fire crackling
Location Audio: Restaurant kitchen — sizzling pans, ventilation hum, distant kitchen chatter

[VIDEO PROMPT]
A small Italian restaurant kitchen, night. 0-2s: Medium shot of Marco flipping a sauté pan, flames dancing. [cut] 2-4s: Close-up of Marco's face turning...

[AiAudioDesigner Output]
[AUDIO DESIGN]
0-2s: Sizzling sound from the sauté pan, low ventilation hum in background.
2-4s: The sizzling fades, replaced by faint crackling of fire.
4-6s: Loud crackling and popping as flames consume wood and glass jars...
```

**产出**: `episode-1-audio.txt`

---

### 阶段 4: 质量检查

**目标**: 总导演检查连贯性

**步骤**:
1. 使用 **SeriesDirector** 执行 `/review-episode`
2. 输入场景描述 + 视频提示词 + 音频设计
3. 获得质量报告（Pass/Fail + 具体问题）

**数据流**:
```
Episode Content (Scene + Video + Audio)
    ↓
SeriesDirector /review-episode
    ↓
Quality Report (Continuity Check + Issues + Recommendations)
```

**示例**:
```
[User to SeriesDirector]
/review-episode

Episode 1
[粘贴场景 + 视频 + 音频内容]

[SeriesDirector Output]
# EPISODE 1 QUALITY REVIEW

## Continuity Check
✅ Timeline consistency: Pass
✅ Character behavior: Pass
✅ Visual consistency: Pass — Visual Anchors match Bible
✅ Tone adherence: Pass — Gritty realism maintained

## Overall Assessment
Pass

## Recommendations
- Consider adding more ambient kitchen sounds in 0-2s segment
- Excellent use of "living fingers" metaphor in visual language
```

**产出**: `episode-1-review.md`

---

### 阶段 5: 记录进度并续写下一集

**目标**: 更新故事圣经，创建下一集

**步骤 A: 更新连续性追踪**
1. 使用 **SeriesDirector** 执行 `/update-continuity`
2. 输入 Episode 1 摘要
3. Story Bible 的 [CONTINUITY TRACKER] 部分被更新

**步骤 B: 续写 Episode 2**
1. 使用 **AiNextEpisodeContinuation**
2. 输入 Story DNA（从 Episode 1 输出复制）+ Episode 1 结尾场景
3. 获得 Episode 2 开场

**数据流**:
```
Episode 1 Ending Scene
    +
Story DNA (Timeline updated)
    ↓
AiNextEpisodeContinuation
    ↓
Episode 2 Opening Scene + Updated Story DNA
```

**示例**:
```
[User to AiNextEpisodeContinuation]

[STORY DNA]
Outline: A once-proud chef loses everything and must rebuild from ashes to reclaim his culinary legacy
Style: Emotional drama with gritty realism
Timeline: Episode 1 of 8 - Night of the fire (Day 1)

[PREVIOUS ENDING]
Night, Marco's burnt restaurant. He stands in the doorway, watching firefighters pack up their equipment. The acrid smell of smoke clings to his chef's coat. He reaches into his pocket and finds a business card from that morning—an investor's offer he'd rejected.

[AiNextEpisodeContinuation Output]
[STORY DNA]
Outline: A once-proud chef loses everything and must rebuild from ashes to reclaim his culinary legacy
Style: Emotional drama with gritty realism
Timeline: Episode 2 of 8 - Dawn after the fire (Day 2)

[NEXT OPENING]
Dawn, a cramped studio apartment above a laundromat. Marco sits at a cluttered desk, still wearing yesterday's smoke-stained coat...
```

**步骤 C: 重复阶段 2-4**
对 Episode 2 执行视频提示词生成 → 音效设计 → 质量检查

---

### 循环：Episode 3, 4, 5...

重复阶段 5，直到完成所有集数。

**关键检查点**:
- 每集结束后：`/update-continuity`
- 每 2-3 集：使用 `/check-bible` 确认所有 agent 使用相同的 Story Bible 版本
- 发现新角色/场所：使用 `/add-character` 或手动更新 Bible 的 [LOCATIONS] 部分

---

## 数据流全景图

```
┌─────────────────────────────────────────────────────────────┐
│                      STORY BIBLE                            │
│  (Single Source of Truth - 所有 agent 的唯一真相源)          │
│  - Story DNA                                                │
│  - Characters (Visual Anchors)                              │
│  - Locations (Visual + Audio)                               │
│  - Style (Production Rules)                                 │
│  - Continuity Tracker                                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ Episode 1     │  │ Episode 2        │  │ Episode 3...    │
│               │  │                  │  │                 │
│ ┌───────────┐ │  │ ┌──────────────┐│  │                 │
│ │Storyboard │ │  │ │Continuation  ││  │                 │
│ │Writer     │ │  │ │Writer        ││  │                 │
│ └─────┬─────┘ │  │ └──────┬───────┘│  │                 │
│       │       │  │        │        │  │                 │
│       ▼       │  │        ▼        │  │                 │
│ [SCENE TEXT]  │  │  [SCENE TEXT]   │  │                 │
│       │       │  │        │        │  │                 │
│       ▼       │  │        ▼        │  │                 │
│ ┌───────────┐ │  │ ┌──────────────┐│  │                 │
│ │Video      │ │  │ │Video         ││  │                 │
│ │Engineer   │ │  │ │Engineer      ││  │                 │
│ └─────┬─────┘ │  │ └──────┬───────┘│  │                 │
│       │       │  │        │        │  │                 │
│       ▼       │  │        ▼        │  │                 │
│ [VIDEO PROMPT]│  │  [VIDEO PROMPT] │  │                 │
│       │       │  │        │        │  │                 │
│       ▼       │  │        ▼        │  │                 │
│ ┌───────────┐ │  │ ┌──────────────┐│  │                 │
│ │Audio      │ │  │ │Audio         ││  │                 │
│ │Designer   │ │  │ │Designer      ││  │                 │
│ └─────┬─────┘ │  │ └──────┬───────┘│  │                 │
│       │       │  │        │        │  │                 │
│       ▼       │  │        ▼        │  │                 │
│ [AUDIO DESIGN]│  │  [AUDIO DESIGN] │  │                 │
│       │       │  │        │        │  │                 │
└───────┼───────┘  └────────┼────────┘  └─────────────────┘
        │                   │
        └───────────┬───────┘
                    ▼
        ┌───────────────────────┐
        │  SeriesDirector       │
        │  /review-episode      │
        │  /update-continuity   │
        └───────────────────────┘
                    │
                    ▼
        [Quality Report + Updated Bible]
```

---

## 防止剧情断裂的机制

### 1. 强制 Story Bible 引用
- **所有 agent** 都必须接收并回显 [STORY BIBLE REFERENCE]
- 输出时必须携带 Story DNA/Visual Anchors/Style
- ❌ 如果 agent 不回显，立即停止并要求重新生成

### 2. 时间轴强制追踪
- **AiStoryboardWriter**: 输出 `Timeline: Episode 1 - Opening (Day 1)`
- **AiNextEpisodeContinuation**: 每次更新 Timeline（Episode 2 - Day 2, Episode 3 - Day 5）
- **SeriesDirector**: `/update-continuity` 记录每集的时间进度

### 3. 角色视觉锚点（Visual Anchors）
- 在 Story Bible 中定义：`Marco: a middle-aged man with graying temples, wearing a chef's white coat`
- **AiVideoPromptEngineer** 必须逐字使用（不允许修改）
- ✅ 正确: "Marco (a middle-aged man with graying temples, wearing a chef's white coat)"
- ❌ 错误: "Marco (a chef with gray hair)" ← 擅自简化

### 4. 风格铁律
- Story Bible 定义风格后，所有 agent 必须遵守
- **AiStoryboardWriter**: 场景描述必须符合风格（gritty realism ≠ whimsical fantasy）
- **AiVideoPromptEngineer**: 镜头语言必须符合风格（handheld camera vs smooth steadicam）
- **AiAudioDesigner**: 音效必须符合风格（cinematic realism vs anime exaggeration）

### 5. 质量检查门槛
- 每集完成后，**SeriesDirector** 执行 `/review-episode`
- 如果 Fail，必须修正后才能继续下一集
- 常见问题：
  - Timeline 跳跃（Episode 1 是白天，Episode 2 突然变成一周后）
  - 角色行为不一致（上集角色愤怒，下集突然开心且无解释）
  - Visual Anchor 被修改（头发颜色变了、衣服换了但无说明）

---

## 引人入胜的技巧

### 开篇策略（Episode 1）
使用 **5 种钩子** 之一：
1. **Conflict Hook** - 冲突爆发（火灾、车祸、争吵）
2. **Suspense Hook** - 决策时刻（倒计时、选择困境）
3. **Visual Shock Hook** - 视觉冲击（血迹、废墟、奇异景象）
4. **Emotional Punch Hook** - 情感重击（孤独、失去、绝望）
5. **Mystery Hook** - 悬疑谜团（不属于她的钥匙、消失的物品）

### 续集过渡技巧
使用 **视觉锚点** 连接两集：
- **时间过渡**: "Dawn, one hour later" / "Evening, three days later"
- **空间回声**: 上集在餐厅结束 → 下集在公寓开场，但窗外能看到餐厅烧毁的烟雾
- **物品延续**: 上集捡到名片 → 下集手里还握着那张名片
- **情绪余韵**: 上集角色愤怒 → 下集开场依然紧绷着肩膀、紧握拳头

### 剧情节奏控制
- **Act 1 (Episodes 1-3)**: Setup - 建立世界观、角色、初始冲突
- **Act 2 (Episodes 4-6)**: Confrontation - 冲突升级、角色面临考验
- **Act 3 (Episodes 7-8)**: Resolution - 高潮与解决

在 Story Bible 的 [STORY STRUCTURE] 部分规划这些节奏点，SeriesDirector 会在质量检查时确保每集符合预期节奏。

---

## 常见问题与解决

### Q1: 如果中途想修改故事方向怎么办？
**A**: 使用 SeriesDirector 更新 Story Bible
1. `/check-bible` 查看当前 Bible
2. 手动编辑 `story-bible.md`
3. 更新 [STORY DNA] 或 [STORY STRUCTURE]
4. 通知所有后续 agent 使用新版本 Bible

### Q2: 角色数量增加，Visual Anchors 如何管理？
**A**: 使用 `/add-character` 命令
```
[User to SeriesDirector]
/add-character

Name: Sofia
Description: Marco's daughter, a young woman in her 20s with long dark hair, wearing a business suit
```
SeriesDirector 会更新 Story Bible，后续所有 agent 自动获得新角色信息。

### Q3: 如何确保音效和画面完全同步？
**A**: AiAudioDesigner 直接读取 AiVideoPromptEngineer 的时间码
- 视频输出: `0-2s: Medium shot of Marco flipping pan`
- 音频输入: 直接使用同样的时间码 `0-2s: Sizzling sound from pan`

### Q4: 一次生成多集会不会更高效？
**A**: ❌ 不推荐
- 一次生成多集容易导致后期集数缺少前期信息（agent 忘记第1集的细节）
- 建议：**逐集生成 → 质量检查 → 更新 Continuity → 下一集**
- 如果时间紧张，可以批量生成场景，但必须逐集质量检查

### Q5: Story Bible 太长，agent 会不会遗漏信息？
**A**: 使用**精简引用模式**
不是每次都传递完整 Bible，而是只传递相关部分：
```
[STORY BIBLE REFERENCE]
Characters: [只列出本集出现的角色]
Locations: [只列出本集场景]
Style: [风格描述]
Timeline: [当前时间轴]
```

---

## 文件组织建议

推荐的项目结构：
```
my-series/
├── story-bible.md                    # 故事圣经（核心）
├── episodes/
│   ├── episode-1/
│   │   ├── scene.md                  # AiStoryboardWriter 输出
│   │   ├── video-prompt.txt          # AiVideoPromptEngineer 输出
│   │   ├── audio-design.txt          # AiAudioDesigner 输出
│   │   └── review.md                 # SeriesDirector 质量报告
│   ├── episode-2/
│   │   ├── scene.md
│   │   ├── video-prompt.txt
│   │   ├── audio-design.txt
│   │   └── review.md
│   └── ...
└── workflow-log.md                   # 工作日志（可选）
```

---

## 最佳实践

### ✅ DO（推荐做法）
1. **先写 Story Bible，再动笔**：投入30分钟完善 Bible，省去后期3小时修正
2. **逐集质量检查**：每集都用 `/review-episode` 检查
3. **保持 Visual Anchors 详细**：不要写"一个男人"，要写"a man in his 40s with salt-and-pepper hair, wearing a leather jacket"
4. **Timeline 精确到天**：不要写"Episode 2"，要写"Episode 2 - Day 3, morning"
5. **定期备份 Story Bible**：每完成3集备份一次

### ❌ DON'T（避免做法）
1. **不要跳过 SeriesDirector 初始化**：手写 Bible 容易遗漏关键部分
2. **不要让 agent 修改 Visual Anchors**：发现修改立即纠正
3. **不要批量生成后才检查**：质量问题会累积
4. **不要在中途大幅修改风格**：风格漂移会破坏前期内容的价值
5. **不要忘记更新 Continuity Tracker**：这是防止剧情断裂的最后防线

---

## 总结

通过这套工作流程，你可以：
- ✅ **保证剧情连贯**：Story Bible 强制所有 agent 引用同一真相源
- ✅ **保持角色一致**：Visual Anchors 锁定角色外观，禁止擅自修改
- ✅ **维护风格统一**：Style 规则贯穿所有创作层（场景/视频/音频）
- ✅ **引人入胜**：开篇钩子策略 + 续集过渡技巧确保每集都有吸引力
- ✅ **可追溯可修正**：Continuity Tracker + Quality Review 记录所有进展

**核心秘诀**：连贯性不是创作的约束，而是观众信任的基础。

---

**祝创作顺利！如有疑问，使用 SeriesDirector 的 `/check-bible` 命令检查当前状态。**
