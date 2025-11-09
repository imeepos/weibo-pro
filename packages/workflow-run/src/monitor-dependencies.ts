import { root } from '@sker/core';
import { WeiboHotTimelineMonitorScheduler } from './WeiboHotTimelineMonitorScheduler';
import { IncrementalPostDetector } from './IncrementalPostDetector';
import { RealTimePostPublisher } from './RealTimePostPublisher';
import { RealTimeWorkflowIntegrator } from './RealTimeWorkflowIntegrator';
import { MonitorStarter } from './MonitorStarter';

/**
 * 监控系统依赖注入配置
 *
 * 存在即合理：
 * - 统一注册所有监控组件
 * - 管理组件间依赖关系
 * - 提供完整的依赖解析
 *
 * 优雅即简约：
 * - 清晰的依赖声明
 * - 类型安全的依赖注入
 * - 易于维护的配置结构
 */
export function registerMonitorDependencies() {
  console.log('[MonitorDependencies] 🔧 注册监控系统依赖...');

  root.set([
    // 核心监控组件
    { provide: WeiboHotTimelineMonitorScheduler, useClass: WeiboHotTimelineMonitorScheduler },
    { provide: IncrementalPostDetector, useClass: IncrementalPostDetector },
    { provide: RealTimePostPublisher, useClass: RealTimePostPublisher },
    { provide: RealTimeWorkflowIntegrator, useClass: RealTimeWorkflowIntegrator },

    // 监控启动器
    { provide: MonitorStarter, useClass: MonitorStarter },
  ]);

  console.log('[MonitorDependencies] ✅ 监控系统依赖注册完成');
}