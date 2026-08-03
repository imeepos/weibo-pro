# @sker/json-harmony

> 在混沌中寻找和谐：优雅地解析损坏的 JSON，自动处理 YAML 混合内容，将无序转化为秩序。

面向大模型输出的容错 JSON/YAML 解析库，自动修复常见 JSON 错误并从混乱文本中提取结构化数据。

## 核心职责

- **容错解析**：自动修复无引号键、尾随逗号、单引号、未转义引号等常见 JSON 错误
- **Markdown 提取**：自动提取代码块（```json）中的 JSON
- **YAML 融合**：智能检测并解析 YAML 内容，支持字符串字段内嵌套 YAML
- **多重恢复策略**：按序尝试多种恢复策略（标准 → 手动修复 → 正则提取 → 括号匹配 → 部分解析 → YAML → 保留为字符串）
- **括号匹配**：精确提取嵌套 JSON 结构
- **统计信息**：返回解析耗时与使用的恢复策略列表

## 目录结构

```
src/
├── index.ts       # 统一导出（JsonHarmonyParser、parse、类型、RecoveryStrategy）
├── parser.ts      # JsonHarmonyParser 核心实现（策略链、正则模式、YAML 融合）
├── types.ts       # 类型定义（ParseResult、ParseStatistics、ParserConfig、RecoveryStrategy）
└── parser.test.ts # 解析器测试
```

## 使用

### 基础用法

```typescript
import { parse } from '@sker/json-harmony';

// 解析标准 JSON
const result = parse('{"name": "张三", "age": 30}');
console.log(result.data);        // { name: '张三', age: 30 }
console.log(result.statistics);  // { parseTimeMs: 2, recoveryStrategiesUsed: ['StandardJson'] }
```

### 容错解析

```typescript
parse('{name: "test"}').data;         // { name: 'test' }（无引号键）
parse('{"name": "test",}').data;      // { name: 'test' }（尾随逗号）
parse("{'name': 'test'}").data;       // { name: 'test' }（单引号）
parse("{name: 'test', age: 30,}").data; // { name: 'test', age: 30 }（混合错误）
```

### Markdown 代码块提取

```typescript
const markdown = `这是大模型的回复：
\`\`\`json
{ "result": "success", "data": ["item1", "item2"] }
\`\`\``;
parse(markdown).data; // { result: 'success', data: ['item1', 'item2'] }
```

### YAML 自动解析

```typescript
parse('name: John Doe\nage: 30').data;           // { name: 'John Doe', age: 30 }
parse('{"config": "name: John\\nage: 30"}').data; // { config: { name: 'John', age: 30 } }
parse('{"tags": "- frontend\\n- backend"}').data; // { tags: ['frontend', 'backend'] }
```

### 高级配置

```typescript
import { JsonHarmonyParser } from '@sker/json-harmony';

const parser = new JsonHarmonyParser({
  maxTextLength: 1024 * 1024,  // 1MB（默认）
  enableUnquotedKeys: true,    // 无引号键修复（默认）
  enableTrailingCommas: true,  // 尾随逗号修复（默认）
  enableYamlParsing: true,     // YAML 解析（默认）
  timeoutMs: 30000,            // 超时（默认 30 秒）
});
parser.parse('{name: "test"}');
```

## 恢复策略

解析器按序尝试：`StandardJson` → `UnescapedQuotesFix` → `ManualFix` → `RegexExtract` → `BracketMatching` → `PartialParse` → `YamlParsing` → `PreserveAsString`。统计信息中记录实际使用的策略：

```typescript
const result = parse('{name: "test"}');
console.log(result.statistics.recoveryStrategiesUsed); // ['ManualFix']
```

## 边界

- **✅ 负责**：损坏 JSON / Markdown 包裹 / YAML 混合文本的结构化解析与修复；解析统计；TypeScript 泛型支持
- **❌ 不负责**：不做加密编码（见 `@sker/utils`）；不负责 LLM 请求/响应 AST 建模（见 `@sker/compiler`）；不含数据库实体或状态管理
- **对外依赖**：外部依赖 `yaml`；无 `@sker/*` 运行时依赖
- **被谁依赖**：`packages/nlp`、`packages/workflow-run`、`packages/workflow-ui`（主要用于解析大模型返回的结构化结果）
