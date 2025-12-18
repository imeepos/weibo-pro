# @sker/json-harmony

> 在混沌中寻找和谐：优雅地解析损坏的 JSON，自动处理 YAML 混合内容

## 存在的意义

大模型返回的 JSON 常常是不完美的：
- 包含 Markdown 代码块标记
- 键没有引号
- 尾随逗号
- 混合 YAML 格式
- 字符串字段中嵌套 YAML 内容

`@sker/json-harmony` 将混沌转化为和谐，优雅地处理这些问题。

## 特性

- 🎯 **容错解析**：自动修复常见 JSON 错误
- 🔄 **YAML 融合**：智能检测并解析 YAML 内容
- 📦 **Markdown 提取**：自动提取代码块中的 JSON
- 🎨 **括号匹配**：精确提取嵌套的 JSON 结构
- ⚡ **多重策略**：多种恢复策略确保成功解析
- 📊 **统计信息**：提供详细的解析统计

## 安装

```bash
pnpm add @sker/json-harmony
```

## 使用

### 基础用法

```typescript
import { parse } from '@sker/json-harmony'

// 解析标准 JSON
const result = parse('{"name": "张三", "age": 30}')
console.log(result.data) // { name: '张三', age: 30 }

// 查看统计信息
console.log(result.statistics)
// {
//   parseTimeMs: 2,
//   recoveryStrategiesUsed: ['StandardJson']
// }
```

### 容错解析

```typescript
import { parse } from '@sker/json-harmony'

// 无引号的键
parse('{name: "test"}').data // { name: 'test' }

// 尾随逗号
parse('{"name": "test",}').data // { name: 'test' }

// 单引号
parse("{'name': 'test'}").data // { name: 'test' }

// 混合错误
parse("{name: 'test', age: 30,}").data // { name: 'test', age: 30 }
```

### Markdown 代码块提取

```typescript
import { parse } from '@sker/json-harmony'

const markdown = `
这是大模型的回复：
\`\`\`json
{
  "result": "success",
  "data": ["item1", "item2"]
}
\`\`\`
`

parse(markdown).data
// { result: 'success', data: ['item1', 'item2'] }
```

### YAML 自动解析

```typescript
import { parse } from '@sker/json-harmony'

// 直接解析 YAML
const yaml = `
name: John Doe
age: 30
city: New York
`
parse(yaml).data // { name: 'John Doe', age: 30, city: 'New York' }

// JSON 字符串字段中的 YAML 自动解析
const json = '{"config": "name: John\\nage: 30"}'
parse(json).data // { config: { name: 'John', age: 30 } }

// YAML 列表
const jsonWithYamlList = '{"tags": "- frontend\\n- backend\\n- database"}'
parse(jsonWithYamlList).data
// { tags: ['frontend', 'backend', 'database'] }
```

### 高级配置

```typescript
import { JsonHarmonyParser } from '@sker/json-harmony'

const parser = new JsonHarmonyParser({
  maxTextLength: 1024 * 1024, // 1MB（默认）
  enableUnquotedKeys: true, // 启用无引号键修复（默认）
  enableTrailingCommas: true, // 启用尾随逗号修复（默认）
  enableYamlParsing: true, // 启用 YAML 解析（默认）
  timeoutMs: 30000, // 超时时间（默认 30 秒）
})

const result = parser.parse('{name: "test"}')
```

### 禁用 YAML 解析

```typescript
import { JsonHarmonyParser } from '@sker/json-harmony'

const parser = new JsonHarmonyParser({
  enableYamlParsing: false,
})

// YAML 字符串不会被自动解析
const json = '{"config": "name: John\\nage: 30"}'
parser.parse(json).data // { config: 'name: John\nage: 30' }
```

## 恢复策略

解析器会按顺序尝试以下策略：

1. **StandardJson**: 标准 JSON 解析
2. **ManualFix**: 手动修复常见错误后解析
3. **RegexExtract**: 正则提取 JSON 内容后解析
4. **YamlParsing**: YAML 解析
5. **PartialParse**: 部分解析（逐行尝试）
6. **PreserveAsString**: 保留为字符串

统计信息中会记录使用的策略：

```typescript
const result = parse('{name: "test"}')
console.log(result.statistics.recoveryStrategiesUsed)
// ['ManualFix']
```

## TypeScript 支持

完整的类型定义：

```typescript
import type {
  ParseResult,
  ParseStatistics,
  ParserConfig,
} from '@sker/json-harmony'
import { RecoveryStrategy } from '@sker/json-harmony'

// 使用泛型指定返回类型
interface User {
  name: string
  age: number
}

const result = parse<User>('{"name": "张三", "age": 30}')
result.data.name // TypeScript 知道这是 string
```

## 实际应用场景

### 场景 1：处理大模型返回的 JSON

```typescript
import { parse } from '@sker/json-harmony'

const llmResponse = `
这是分析结果：
\`\`\`json
{
  environment_tags: ["Indoor", "Retail"],
  environment_color: {
    hue: 0.08,
    saturation: 0.05
  }
}
\`\`\`
`

const result = parse(llmResponse)
// 自动提取并修复 JSON
```

### 场景 2：配置文件中的 YAML 字段

```typescript
import { parse } from '@sker/json-harmony'

const config = `{
  "apiKey": "secret",
  "database": "host: localhost\\nport: 5432\\nuser: admin"
}`

const result = parse(config)
// database 字段自动解析为对象
console.log(result.data.database)
// { host: 'localhost', port: 5432, user: 'admin' }
```

### 场景 3：从混乱文本中提取 JSON

```typescript
import { parse } from '@sker/json-harmony'

const messyText = `
系统响应：状态码 200
响应体：{"status": "success", "data": {"id": 1, "name": "项目A"}}
处理时间：23ms
`

const result = parse(messyText)
// 自动提取并解析 JSON
console.log(result.data)
// { status: 'success', data: { id: 1, name: '项目A' } }
```

## 代码哲学

遵循代码艺术家的原则：

- **存在即合理**：每一行代码都有其不可替代的目的
- **优雅即简约**：代码自述其意，无需注释喧哗
- **性能即艺术**：优化是为了提升优雅，而非损害之

## 测试

```bash
# 运行测试
pnpm test

# 监听模式
pnpm test:watch
```

## 构建

```bash
# 构建
pnpm build

# 开发模式（监听）
pnpm dev
```

## License

Private
