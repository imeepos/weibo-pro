/**
 * 应用初始化服务
 * 负责设置组件注册表、类型检查和系统配置
 */

import { initializeDefaultComponents } from './defaultComponents';
import { componentRegistry } from './ComponentRegistry';

/**
 * 初始化应用
 */
export async function initializeApp() {
  try {
    // 1. 初始化组件注册表
    initializeDefaultComponents();
  } catch (error) {
    throw error;
  }
}

/**
 * 运行应用健康检查
 */
export function runHealthCheck() {
  const issues: string[] = [];
  
  // 检查组件注册表
  const registeredCount = componentRegistry.size();
  if (registeredCount === 0) {
    issues.push('No components registered');
  }
  
  // 检查必要组件
  const requiredComponents = ['StatsOverview', 'EmptyWidget'];
  for (const componentName of requiredComponents) {
    if (!componentRegistry.has(componentName)) {
      issues.push(`Required component missing: ${componentName}`);
    }
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    registeredComponents: registeredCount
  };
}

/**
 * 获取应用统计信息
 */
export function getAppStats() {
  return {
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    registeredComponents: componentRegistry.size(),
    componentCategories: componentRegistry.getCategories().length,
    buildTime: process.env.REACT_APP_BUILD_TIME || new Date().toISOString()
  };
}