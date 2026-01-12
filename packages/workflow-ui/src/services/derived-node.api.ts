/**
 * 派生节点 API 服务
 *
 * 存在即合理：
 * - 封装派生节点的 REST API 调用
 * - 提供类型安全的接口
 * - 支持保存、发布、列表操作
 */

import { root } from '@sker/core'
import { DerivedNodeController } from '@sker/sdk'
import type { CreateDerivedNodePayload } from '@sker/sdk'
import type { DerivedNodeEntity } from '@sker/entities'

/**
 * 保存派生节点
 */
export async function saveDerivedNode(payload: CreateDerivedNodePayload): Promise<DerivedNodeEntity> {
  const controller = root.get(DerivedNodeController)
  return controller.create(payload)
}

/**
 * 发布派生节点
 */
export async function publishDerivedNode(id: string): Promise<{ success: boolean }> {
  const controller = root.get(DerivedNodeController)
  return controller.publish(id)
}

/**
 * 加载所有派生节点
 */
export async function loadDerivedNodes(): Promise<DerivedNodeEntity[]> {
  const controller = root.get(DerivedNodeController)
  return controller.list()
}
