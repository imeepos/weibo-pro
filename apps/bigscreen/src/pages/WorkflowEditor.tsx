import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { WorkflowCanvas } from '@sker/workflow-ui';
import { WorkflowGraphAst } from '@sker/workflow';
import { WorkflowController } from '@sker/sdk';
import { root } from '@sker/core';
import { useTheme } from '@/hooks/useTheme';
import { Spinner } from '@sker/ui/components/ui/spinner';

const WorkflowEditor: React.FC = () => {
  const { name } = useParams<{ name?: string }>();
  const [workflowData, setWorkflowData] = useState<WorkflowGraphAst | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!name) {
        setWorkflowData(new WorkflowGraphAst());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const controller = root.get(WorkflowController);
        const workflow = await controller.getWorkflow({ name });

        if (workflow) {
          setWorkflowData(workflow);
        } else {
          setError(`未找到名为 "${name}" 的工作流`);
          setWorkflowData(new WorkflowGraphAst());
        }
      } catch (err) {
        setError(`加载工作流失败: ${err instanceof Error ? err.message : '未知错误'}`);
        setWorkflowData(new WorkflowGraphAst());
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [name]);

  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  if (loading) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-500">正在加载工作流...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/workflow-editor'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            创建新工作流
          </button>
        </div>
      </div>
    );
  }

  if (!workflowData) {
    return null;
  }

  return (
    <WorkflowCanvas
      workflowAst={workflowData}
      name={name || 'default'}
      className={theme === 'dark' ? 'dark h-full min-h-screen' : 'h-full min-h-screen'}
    />
  );
};

export default WorkflowEditor;