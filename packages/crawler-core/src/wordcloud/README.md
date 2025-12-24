# 词云生成模块

基于 canvas 的中文词云生成工具，支持自定义样式和布局。

## 功能特性

- 中文分词和关键词提取
- 停用词过滤
- 词频统计
- 螺旋布局算法
- 自定义颜色、字体、尺寸
- 依赖注入支持

## 快速开始

```typescript
import { root } from '@sker/core';
import { Tokenizer, WordCloud } from '@sker/crawler-core';

// 获取分词器实例
const tokenizer = root.get(Tokenizer);

// 提取关键词
const text = '人工智能技术正在改变世界...';
const keywords = tokenizer.extractKeywords(text, 50);

// 生成词云
const wordCloud = new WordCloud({
  width: 1200,
  height: 800,
  backgroundColor: '#1a1a2e',
  colors: ['#00d4ff', '#ff6b6b', '#4ecdc4'],
  maxFontSize: 100,
  minFontSize: 20,
});

const imageBuffer = wordCloud.generate(keywords);
```

## API 文档

### Tokenizer

分词器，用于中文文本分词和关键词提取。

**构造函数**

```typescript
new Tokenizer(config?: TokenizerConfig)
```

**配置选项**

```typescript
interface TokenizerConfig {
  minLength?: number;      // 最小词长度，默认 2
  maxLength?: number;      // 最大词长度，默认 10
  stopWords?: string[];    // 自定义停用词列表
}
```

**方法**

- `tokenize(text: string): string[]` - 分词
- `extractKeywords(text: string, topN?: number): WordFrequency[]` - 提取关键词

### WordCloud

词云生成器，将词频数据渲染为图片。

**构造函数**

```typescript
new WordCloud(config?: WordCloudConfig)
```

**配置选项**

```typescript
interface WordCloudConfig {
  width?: number;           // 画布宽度，默认 800
  height?: number;          // 画布高度，默认 600
  backgroundColor?: string; // 背景色，默认 '#ffffff'
  fontFamily?: string;      // 字体，默认 'Arial, sans-serif'
  minFontSize?: number;     // 最小字号，默认 12
  maxFontSize?: number;     // 最大字号，默认 80
  colors?: string[];        // 颜色列表
  maxWords?: number;        // 最大词数，默认 100
}
```

**方法**

- `generate(words: WordFrequency[]): Buffer` - 生成词云图片（PNG 格式）

### 类型定义

```typescript
interface WordFrequency {
  word: string;
  count: number;
}
```

## 使用示例

### 基础用法

```typescript
import { root } from '@sker/core';
import { Tokenizer, WordCloud } from '@sker/crawler-core';
import { writeFileSync } from 'fs';

const tokenizer = root.get(Tokenizer);
const keywords = tokenizer.extractKeywords('你的文本内容', 50);

const wordCloud = new WordCloud();
const imageBuffer = wordCloud.generate(keywords);

writeFileSync('wordcloud.png', imageBuffer);
```

### 自定义样式

```typescript
const wordCloud = new WordCloud({
  width: 1600,
  height: 900,
  backgroundColor: '#0a0e27',
  fontFamily: 'Microsoft YaHei, sans-serif',
  minFontSize: 16,
  maxFontSize: 120,
  colors: [
    '#00d4ff',
    '#ff6b6b',
    '#4ecdc4',
    '#ffe66d',
    '#a8e6cf',
    '#ff8b94',
  ],
  maxWords: 80,
});
```

### 自定义停用词

```typescript
const tokenizer = root.get(Tokenizer, {
  minLength: 2,
  maxLength: 8,
  stopWords: ['自定义', '停用词'],
});
```

## 实现原理

### 分词算法

使用正则表达式提取中文字符，然后采用最大匹配算法进行分词：

1. 提取所有中文字符序列
2. 从左到右扫描，优先匹配最长词
3. 过滤停用词和纯数字
4. 统计词频

### 布局算法

采用阿基米德螺旋线布局：

1. 从画布中心开始
2. 按螺旋线轨迹寻找可放置位置
3. 检测碰撞，确保词不重叠
4. 字号根据词频线性映射

### 性能优化

- 使用 Set 存储停用词，O(1) 查找
- 碰撞检测使用矩形包围盒
- 限制最大尝试次数避免死循环

## 注意事项

1. canvas 依赖需要系统支持（Windows 需要 Visual Studio 构建工具）
2. 分词算法为简化实现，精度有限
3. 大量文本建议先采样再生成词云
4. 词云生成是 CPU 密集型操作，建议异步处理

## 扩展建议

如需更精确的中文分词，可替换为：

- `jieba` - Python 移植版（需要编译）
- `@node-rs/jieba` - Rust 实现（性能更好）
- 在线分词 API（如百度、腾讯云）
