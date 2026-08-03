'use client'

import { Box, Globe, Sparkles } from 'lucide-react'

// 分类配置
export const CATEGORIES = [
  { key: 'all', label: '全部', icon: Box },
  { key: 'basic', label: '基础', icon: Box },
  { key: 'control', label: '控制', icon: Globe },
  { key: 'llm', label: 'LLM', icon: Sparkles },
  { key: 'crawler', label: '爬虫', icon: Globe },
] as const

export type CategoryKey = typeof CATEGORIES[number]['key']
