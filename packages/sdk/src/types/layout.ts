/**
 * 布局相关类型
 */

export interface LayoutConfiguration {
  id: string
  name: string
  type: 'bigscreen' | 'frontend' | 'admin'
  layout: Record<string, any>
  metadata: Record<string, any> | null
  isDefault: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateLayoutPayload {
  name: string
  type: 'bigscreen' | 'frontend' | 'admin'
  layout: Record<string, any>
  metadata?: Record<string, any>
  description?: string
}

export interface UpdateLayoutPayload {
  name?: string
  layout?: Record<string, any>
  metadata?: Record<string, any>
  description?: string
}
