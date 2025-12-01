import React, { useState, useEffect } from 'react';
import { WorkflowCanvas } from '@sker/workflow-ui';
import { WorkflowGraphAst } from '@sker/workflow';
import { useTheme } from '@/hooks/useTheme';

const WorkflowEditor: React.FC = () => {
  const [workflowData] = useState(new WorkflowGraphAst());
  const { theme } = useTheme();

  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  return (
    <div className={theme === 'dark' ? 'dark h-full' : 'h-full'}>
      <WorkflowCanvas workflowAst={workflowData} name="default"/>
    </div>
  );
};

export default WorkflowEditor;