# 编程助手示例

## 代码生成

### 函数实现

> 请用 Python 实现一个函数，功能如下：
> - 函数名：`find_duplicates`
> - 输入：整数列表
> - 输出：重复元素列表（每个重复元素只出现一次）
> - 要求：时间复杂度 O(n)，空间复杂度 O(n)
> - 包含类型注解和文档字符串

### API 集成

> 我需要集成 OpenAI API，请生成：
> 1. TypeScript 类型定义
> 2. 封装的请求函数
> 3. 错误处理逻辑
> 4. 使用示例
>
> 要求：
> - 使用 fetch API
> - 支持流式响应
> - 包含重试机制

## 代码审查

### Bug 定位

> 这段代码在某些情况下会崩溃，请帮我找出问题：
>
> ```javascript
> function parseConfig(config) {
>   const settings = config.settings.split(',')
>   return settings.map(s => {
>     const [key, value] = s.split('=')
>     return { [key.trim()]: value.trim() }
>   })
> }
> ```
>
> 请分析：
> 1. 什么情况下会崩溃
> 2. 崩溃的原因是什么
> 3. 如何修复
> 4. 如何预防类似问题

### 性能优化

> 请优化以下代码的性能：
>
> ```python
> def find_common_items(list1, list2):
>     common = []
>     for item1 in list1:
>         for item2 in list2:
>             if item1 == item2:
>                 common.append(item1)
>     return common
> ```
>
> 要求：
> - 分析当前时间复杂度
> - 提供优化方案
> - 解释优化原理
> - 提供性能对比

## 调试协助

### 错误解读

> 我运行代码时遇到以下错误信息：
>
> ```
> TypeError: Cannot read properties of undefined (reading 'map')
>     at processData (app.js:42:25)
> ```
>
> 请帮我：
> 1. 解释这个错误的含义
> 2. 分析可能的原因
> 3. 提供排查步骤
> 4. 给出修复建议

## 技术选型

> 我需要为一个新项目选择状态管理方案，项目特点：
> - 中小型 React 应用
> - 团队规模 3-5 人
> - 需要处理复杂的表单状态
> - 后期可能有服务端渲染需求
>
> 请对比 Zustand、Jotai、Redux 的优劣，并给出推荐。
