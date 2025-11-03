import React from 'react';
import { WorkflowCanvas } from '@sker/workflow-ui';

const WorkflowDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">工作流编辑器演示</h1>
        <p className="text-gray-600 mt-1">
          基于 @sker/workflow-ui 的可视化工作流编辑器
        </p>
      </div>

      <div className="h-[calc(100vh-88px)]">
        <WorkflowCanvas />
      </div>
    </div>
  );
};

export default WorkflowDemo;
