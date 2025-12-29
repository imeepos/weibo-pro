# 元节点 UI 使用指南

## HttpRequestAst - 动态参数传递

### 场景 1: 静态配置（直接在节点属性面板填写）

```
[HttpRequestAst]
  method: 'GET'
  url: 'https://weibo.com/ajax/side/search?q=热搜'
  headers: { "Cookie": "SUB=xxx" }
  body: null
```

在 UI 中：
1. 拖拽 `HttpRequestAst` 节点到画布
2. 点击节点打开属性面板
3. 填写输入字段：
   - **method**: 下拉选择 `GET`
   - **url**: 输入框填写 `https://weibo.com/ajax/side/search?q=热搜`
   - **headers**: JSON 编辑器填写 `{"Cookie": "SUB=xxx"}`
   - **body**: 留空

---

### 场景 2: 动态传递 - 从上游节点获取 Cookie

```
[WeiboLoginAst] ──(cookie)──> [HttpRequestAst]
                                  url: 'https://weibo.com/ajax/...'
                                  headers: 从上游接收
```

在 UI 中：
1. 拖拽 `WeiboLoginAst` 节点
2. 拖拽 `HttpRequestAst` 节点
3. **连线**：从 `WeiboLoginAst.cookie` 输出端口 → 拖线到 → `HttpRequestAst.headers` 输入端口
4. 在 `HttpRequestAst` 属性面板：
   - **url**: 填写 `https://weibo.com/ajax/statuses/show?id=123`
   - **headers**: 留空或显示 `<来自上游>` 标记（UI 自动处理）

执行时，`headers` 会自动接收上游传来的值：
```javascript
// 运行时自动合并
headers = { Cookie: "SUB=xxx" }  // 来自 WeiboLoginAst
```

---

### 场景 3: 部分静态 + 部分动态

如果需要**同时**设置静态 headers 和接收动态 headers，需要使用 `TransformAst` 合并：

```
[WeiboLoginAst] ──(cookie)──> [TransformAst] ──(mergedHeaders)──> [HttpRequestAst]
                                expression: {
                                  Cookie: $input,
                                  "User-Agent": "Mozilla/5.0..."
                                }
```

在 UI 中：
1. 添加 `TransformAst` 节点
2. 连线：`WeiboLoginAst.cookie` → `TransformAst.input`
3. 在 `TransformAst` 属性面板填写表达式：
   ```javascript
   {
     Cookie: $input,
     "User-Agent": "Mozilla/5.0...",
     "Content-Type": "application/json"
   }
   ```
4. 连线：`TransformAst.output` → `HttpRequestAst.headers`

---

### 场景 4: 动态 Body（POST 请求）

```
[表单节点] ──(formData)──> [HttpRequestAst]
                              method: 'POST'
                              url: 'https://api.example.com/submit'
                              body: 从上游接收
```

在 UI 中：
1. 上游节点输出 `formData`（如 `{ username: "张三", age: 25 }`）
2. 连线：`上游节点.formData` → `HttpRequestAst.body`
3. 在 `HttpRequestAst` 属性面板：
   - **method**: 选择 `POST`
   - **url**: 填写 API 地址
   - **body**: 留空（自动接收上游数据）

---

## 关键概念

### @Input 装饰器 = UI 输入端口

```typescript
@Input({ title: '请求头', type: 'object', defaultValue: {} })
headers: Record<string, string> = {};
```

在 UI 中表现为：
- **左侧输入端口**：可以连线接收上游数据
- **属性面板字段**：可以手动填写默认值
- **优先级**：连线数据 > 手动填写的值

### 数据类型映射

| TypeScript 类型 | UI 控件 | 示例 |
|----------------|---------|------|
| `string` | 文本框 | `"https://api.com"` |
| `number` | 数字框 | `3000` |
| `boolean` | 开关 | `true` / `false` |
| `Record<string, any>` | JSON 编辑器 | `{"key": "value"}` |
| `'GET' \| 'POST'` | 下拉选择 | `GET` |

---

## 完整示例：微博数据采集流程

```
[WeiboLoginAst]
    ↓ (cookie)
[TransformAst] ─────────────────┐
  expression: {                 │
    Cookie: $input,              │
    "User-Agent": "..."          │
  }                              │
    ↓ (headers)                  │
[HttpRequestAst] ←───────────────┘
  method: 'GET'
  url: 'https://weibo.com/ajax/statuses/show?id={{postId}}'
    ↓ (response)
[TransformAst]
  expression: $input.data.text
    ↓ (text)
[输出节点]
```

### UI 操作步骤

1. **登录节点**：拖拽 `WeiboLoginAst`，执行后获得 `cookie`
2. **合并 Headers**：
   - 拖拽 `TransformAst`
   - 连线：`WeiboLoginAst.cookie` → `TransformAst.input`
   - 填写表达式：`{ Cookie: $input, "User-Agent": "Mozilla/5.0..." }`
3. **HTTP 请求**：
   - 拖拽 `HttpRequestAst`
   - 连线：`TransformAst.output` → `HttpRequestAst.headers`
   - 填写 `url`: `https://weibo.com/ajax/statuses/show?id=123456`
4. **提取文本**：
   - 拖拽 `TransformAst`
   - 连线：`HttpRequestAst.response` → `TransformAst.input`
   - 填写表达式：`$input.data.text`

---

## 常见问题

### Q1: 如何传递多个动态参数？

使用 `TransformAst` 将多个输入合并为一个对象：

```
[节点A] ──(valueA)──┐
                    ├──> [TransformAst] ──(merged)──> [HttpRequestAst]
[节点B] ──(valueB)──┘      expression: {
                             param1: $input[0],
                             param2: $input[1]
                           }
```

### Q2: 如何在 URL 中使用变量？

使用 `TransformAst` 拼接 URL：

```
[输入节点] ──(postId)──> [TransformAst] ──(url)──> [HttpRequestAst]
                          expression:
                            `https://weibo.com/ajax/statuses/show?id=${$input}`
```

### Q3: headers 必须是完整对象吗？

是的。如果只想传递 Cookie，需要用 `TransformAst` 包装：

```typescript
// 错误：直接传递字符串
WeiboLoginAst.cookie → HttpRequestAst.headers  // ❌ 类型不匹配

// 正确：包装为对象
TransformAst.output → HttpRequestAst.headers   // ✅
expression: { Cookie: $input }
```
