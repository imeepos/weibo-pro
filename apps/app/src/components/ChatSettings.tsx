/**
 * ChatSettings - 聊天设置组件
 */

import { useState } from 'react';
import { Settings, Trash2, Shield, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { useChatStore } from '@/store';
import type { PermissionMode } from '@/types';
import { Button } from '@/components/ui';

const permissionModeConfig: Record<PermissionMode, { label: string; icon: typeof Shield; description: string }> = {
  default: {
    label: '默认模式',
    icon: Shield,
    description: '需要用户确认敏感操作',
  },
  plan: {
    label: '计划模式',
    icon: ShieldCheck,
    description: '仅规划不执行',
  },
  bypassPermissions: {
    label: '完全信任',
    icon: ShieldAlert,
    description: '自动执行所有操作',
  },
};

export function ChatSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeTaskId, permissionMode, setPermissionMode, clearMessages } = useChatStore();

  const handleClearContext = () => {
    if (confirm('确定要清空上下文并开始新会话吗？')) {
      if (activeTaskId) {
        clearMessages(activeTaskId);
      }
      setIsOpen(false);
    }
  };

  const handleModeChange = (mode: PermissionMode) => {
    setPermissionMode(mode);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 设置面板 */}
          <div className="absolute right-0 top-10 z-50 w-72 bg-background border border-border rounded-lg shadow-lg">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">聊天设置</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 权限模式选择 */}
            <div className="p-4 space-y-3">
              <div className="text-xs text-muted-foreground font-medium mb-2">
                权限模式
              </div>
              {(Object.keys(permissionModeConfig) as PermissionMode[]).map((mode) => {
                const config = permissionModeConfig[mode];
                const Icon = config.icon;
                const isActive = permissionMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{config.label}</span>
                      {isActive && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* 清空上下文 */}
            <div className="p-4 border-t border-border">
              <button
                onClick={handleClearContext}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                清空上下文
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
