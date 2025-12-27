/**
 * ApprovalDialog - 批准请求对话框
 */

import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useChatStore } from '@/store';
import type { ApprovalRequest } from '@/types';

const riskColors = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

const riskLabels = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export function ApprovalDialog() {
  const { pendingApproval, approveRequest, rejectRequest } = useChatStore();

  console.log('[ApprovalDialog] 渲染，pendingApproval:', pendingApproval);

  if (!pendingApproval) return null;

  const handleApprove = () => {
    approveRequest(pendingApproval.requestId);
  };

  const handleReject = () => {
    rejectRequest(pendingApproval.requestId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">需要批准</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">操作描述</p>
            <p className="text-base text-foreground">{pendingApproval.description}</p>
          </div>

          {pendingApproval.command && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">命令</p>
              <code className="block text-sm bg-muted p-2 rounded text-foreground font-mono">
                {pendingApproval.command}
              </code>
            </div>
          )}

          {pendingApproval.toolName && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">工具</p>
              <p className="text-sm text-foreground">{pendingApproval.toolName}</p>
            </div>
          )}

          {pendingApproval.riskLevel && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">风险级别</p>
              <p className={`text-sm font-medium ${riskColors[pendingApproval.riskLevel]}`}>
                {riskLabels[pendingApproval.riskLevel]}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={handleReject}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            拒绝
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            批准
          </button>
        </div>
      </div>
    </div>
  );
}
