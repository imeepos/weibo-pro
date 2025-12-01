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
    <WorkflowCanvas workflowAst={workflowData} name="default" className={theme === 'dark' ? 'dark h-full min-h-screen ' : 'h-full min-h-screen '} />
  );
};

export default WorkflowEditor;